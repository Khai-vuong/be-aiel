import { Injectable, Logger } from '@nestjs/common';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { AiRequestDto } from '../../dtos/ai-request.dto';
import {
  OuterApiProvider,
  OuterApiService,
} from '../outer-api/outer-api.service';
import {
  RagCapabilityExecution,
  RagPlannerService,
} from './rag-planner.service';
import { RagPlanExecuterService, type ExecutionContext } from './rag-plan-executer.service';
import {
  RAG_CAPABILITY_ENTRIES,
  RagCapabilityEntry,
  RAG_CAPABILITY_REQUIRED_PARAMS_BY_ID,
} from './capability-entries';
import { parseJsonStrings } from 'src/common/utils/parseJSON';

const MAX_LOOP = 3;

type ReflectDecision = {
  needMore: boolean;
  reason?: string;
  nextPrompt?: string;
};

type ValidationResult = {
  validSteps: RagCapabilityExecution[];
  rejected: Array<{
    capabilityId: string;
    reason: string;
  }>;
};

export type RagReactOrchestratorRequest = {
  aiRequest: AiRequestDto;
  user: JwtPayload;
};

@Injectable()
export class RagReactService {
  private readonly capabilityMap = new Map<string, RagCapabilityEntry>(
    RAG_CAPABILITY_ENTRIES.map((entry) => [entry.id, entry]),
  );

  constructor(
    private readonly outerApiService: OuterApiService,
    private readonly ragPlannerService: RagPlannerService,
    private readonly planExecuterService: RagPlanExecuterService,
  ) {}

  private buildPlannerInput(params: {
    question: string;
    plannerPrompt: string;
    loop: number;
    contexts: ExecutionContext[];
    validationErrors: string[];
  }): string {
    const contextText = params.contexts
      .slice(-8)
      .map((ctx, index) => {
        const label = `#${index + 1} capability=${ctx.capabilityId}`;
        const body = ctx.error
          ? `ERROR: ${ctx.error}`
          : String(ctx.result ?? '').slice(0, 500);
        return `${label}\n${body}`;
      })
      .join('\n\n');

    return [
      `Original question:\n${params.question}`,
      `Current planner focus:\n${params.plannerPrompt}`,
      `Current loop: ${params.loop}/${MAX_LOOP}`,
      `Validation errors so far:\n${params.validationErrors.join('\n') || 'none'}`,
      `Accumulated evidence from previous loops:\n${contextText || 'none'}`,
    ].join('\n\n');
  }

  // PoC: process flow adapted from rag-orchestrator and upgraded with ReAct loop.
  async chat(params: RagReactOrchestratorRequest) {
    // Step 1: initialize ReAct runtime state from rag-orchestrator input
    const provider = (params.aiRequest.provider as OuterApiProvider) || 'groq';
    let plannerPrompt = params.aiRequest.text;
    const usedCapabilityIds = new Set<string>();
    const validationErrors: string[] = [];
    const overallContexts: ExecutionContext[] = [];

    // Step 2: ReAct loop (Plan -> Validate -> Act -> Reflect), max MAX_LOOP rounds
    for (let loop = 1; loop <= MAX_LOOP; loop += 1) {
      console.log(`RAG-ReAct loop ${loop}`);

      const plannerInput = this.buildPlannerInput({
        question: params.aiRequest.text,
        plannerPrompt,
        loop,
        contexts: overallContexts,
        validationErrors,
      });

      // Step 2.1: plan capabilities from the current planner prompt
      const actionPlanList = await this.ragPlannerService.selectCapabilitiesFromPrompt({
        prompt: plannerInput,
        userRole: params.user.role,
        metadata: params.aiRequest.metadata,
        provider,
      });

      // Step 2.2: validate capability IDs, role access, and required parameters
      const validateStepsData = this.validateCapabilities(actionPlanList);
      validateStepsData.rejected.forEach((item) => {
        validationErrors.push(`${item.capabilityId}: ${item.reason}`);
      });

      // Step 2.3: keep only newly planned capabilities that are not executed yet (put in function)
      const validSteps = validateStepsData.validSteps.filter(
        (step) => !usedCapabilityIds.has(step.capabilityId),
      );

      validSteps.forEach((step) => usedCapabilityIds.add(step.capabilityId));

      // Step 2.4: execute capabilities with isolation so one failure does not break all

      const contexts = validSteps.length > 0
        ? await this.planExecuterService.execute(validSteps)
        : [];

      overallContexts.push(...contexts);

      // Manually checked here, continue after lunch

      // Step 2.5: reflect on gathered evidence to decide whether another round is needed
      const reflectDecision = await this.reflectOnEvidence({
        question: params.aiRequest.text,
        loop,
        contexts: overallContexts,
        validationErrors,
        provider,
        role: params.user.role,
      });

      if (!reflectDecision.needMore) {
        break;
      }

      plannerPrompt = reflectDecision.nextPrompt?.trim().length
        ? reflectDecision.nextPrompt
        : `${params.aiRequest.text}\n\nMissing information: ${reflectDecision.reason || 'Need more evidence'}`;
    }

    // Step 3: compose final answer from validated execution evidence
    const composed = await this.composeAnswer({
      question: params.aiRequest.text,
      role: params.user.role,
      provider,
      contexts: overallContexts,
      validationErrors,
      conversationId: params.aiRequest.conversationId,
      userId: params.user.uid,
      temperature: params.aiRequest.temperature,
    });

    // Step 4: assemble rag-orchestrator style response payload
    return {
      userPrompt: params.aiRequest.text,
      response: composed.text,
      provider: composed.provider,
      capabilityPlan: Array.from(usedCapabilityIds),
      contextualData: overallContexts,
      validationErrors,
      maxLoop: MAX_LOOP,
    };
  }

  /**
   * Validate planner steps before execution.
   * Purpose:
   * - Ensure capabilityId exists in registry.
   * - Ensure required parameters are present (based on capability validation entries).
   * Output:
   * - validSteps: sanitized steps that are safe to execute.
   * - rejected: rejected steps with a human-readable reason for audit/debug.
   */
  private validateCapabilities(
    steps: RagCapabilityExecution[],
  ): ValidationResult {
    const validSteps: RagCapabilityExecution[] = [];
    const rejected: Array<{ capabilityId: string; reason: string }> = [];

    for (const step of steps) {
      const capabilityId = String(step.capabilityId || '').trim();
      if (!capabilityId) {
        rejected.push({ capabilityId: 'unknown', reason: 'Missing capabilityId' });
        continue;
      }

      const entry = this.capabilityMap.get(capabilityId);
      if (!entry) {
        rejected.push({
          capabilityId,
          reason: 'Capability is not in RAG_CAPABILITY_ENTRIES',
        });
        continue;
      }

      const requiredParams = RAG_CAPABILITY_REQUIRED_PARAMS_BY_ID[capabilityId] ?? [];
      if (requiredParams.length > 0) {
        const params = (step.resolvedParameters ?? {}) as Record<string, unknown>;
        const missing = requiredParams.filter((key) => {
          const value = params[key];
          return value === undefined || value === null || String(value).trim() === '';
        });

        if (missing.length > 0) {
          rejected.push({
            capabilityId,
            reason: `Missing required parameters: ${missing.join(', ')}`,
          });
          continue;
        }
      }

      validSteps.push(step);
    }

    return { validSteps, rejected };
  }

  /**
   * Reflection phase that decides whether the ReAct loop should continue.
   * Purpose:
   * - Evaluate if current evidence is sufficient to answer reliably.
   * - Produce a focused nextPrompt when more evidence is needed.
   * Output (ReflectDecision):
   * - needMore: true if another loop is required.
   * - reason: why evidence is insufficient or why loop stops.
   * - nextPrompt: refined planner prompt for the next iteration.
   */
  private async reflectOnEvidence(params: {
    question: string;
    loop: number;
    contexts: ExecutionContext[];
    validationErrors: string[];
    provider: OuterApiProvider;
    role: string;
  }): Promise<ReflectDecision> {
    if (params.loop >= MAX_LOOP) {
      return {
        needMore: false,
        reason: 'Reached MAX_LOOP',
      };
    }

    const evidenceText = params.contexts
      .map((ctx, index) => {
        if (ctx.error) {
          return `#${index + 1} capability=${ctx.capabilityId}\nERROR: ${ctx.error}`;
        }

        return `#${index + 1} capability=${ctx.capabilityId}\n${String(ctx.result)}`;
      })
      .join('\n\n');

    const systemPrompt = [
      'You are a reflection step in a ReAct RAG pipeline.',
      'Decide if current evidence is enough to answer the question reliably.',
      'Respond ONLY valid JSON with schema:',
      '{"needMore": boolean, "reason": string, "nextPrompt": string}',
      'Set needMore=true only when missing critical evidence.',
      'nextPrompt should be an improved planner prompt focused on missing evidence.',
      `Current loop: ${params.loop}/${MAX_LOOP}`,
    ].join('\n');

    const userPrompt = [
      `Question:\n${params.question}`,
      `ValidationErrors:\n${params.validationErrors.join('\n') || 'none'}`,
      `Evidence:\n${evidenceText || 'no evidence yet'}`,
    ].join('\n\n');

    try {
      const decisionRaw = await this.outerApiService.chat({
        prompt: userPrompt,
        role: params.role,
        provider: params.provider,
        caller: 'rag-react-reflect',
        instructionPrompt: systemPrompt,
        onlyUseSystemPrompt: true,
        temperature: 0.1,
      });

      const parsed = parseJsonStrings(decisionRaw.text) as Partial<ReflectDecision>;
      return {
        needMore: Boolean(parsed?.needMore),
        reason: typeof parsed?.reason === 'string' ? parsed.reason : '',
        nextPrompt:
          typeof parsed?.nextPrompt === 'string' ? parsed.nextPrompt : '',
      };
    } catch (error) {
      return {
        needMore: false,
        reason: 'Reflection failed',
      };
    }
  }

  /**
   * Final answer composer layer.
   * Purpose:
   * - Merge validated evidence + validation issues into a final grounded answer.
   * - Instruct LLM to avoid hallucination and explicitly state limitations.
   * Output:
   * - { text, provider }
   *   + text: final response for client.
   *   + provider: actual LLM provider that generated the response.
   */
  private async composeAnswer(params: {
    question: string;
    role: string;
    provider: OuterApiProvider;
    contexts: ExecutionContext[];
    validationErrors: string[];
    conversationId?: string;
    userId?: string;
    temperature?: number;
  }): Promise<{ text: string; provider: string }> {
    const evidence = params.contexts
      .map((ctx, index) => {
        const header = `[Capability: ${ctx.capabilityId}]`;
        const body = ctx.error ? `ERROR: ${ctx.error}` : String(ctx.result ?? '');
        return `${index + 1}. ${header}\n${body}`;
      })
      .join('\n\n');

    const systemPrompt = [
      'You are the Answer Composer layer in a ReAct pipeline.',
      'Use evidence blocks as primary truth source.',
      'If evidence is missing or contains execution errors, explicitly state limitations.',
      'Do not invent data not present in evidence.',
      'Provide concise, actionable answer for educator/admin context.',
    ].join('\n');

    const prompt = [
      `User question:\n${params.question}`,
      `Validation issues:\n${params.validationErrors.join('\n') || 'none'}`,
      `Evidence blocks:\n${evidence || 'none'}`,
    ].join('\n\n');

    const composed = await this.outerApiService.chat({
      prompt,
      role: params.role,
      provider: params.provider,
      caller: 'rag-react-composer',
      conversationId: params.conversationId,
      userId: params.userId,
      instructionPrompt: systemPrompt,
      onlyUseSystemPrompt: true,
      temperature: params.temperature ?? 0.4,
    });

    return {
      text: composed.text,
      provider: composed.provider,
    };
  }
}
