import { Injectable, Logger } from '@nestjs/common';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { AiRequestDto } from '../../dtos/ai-request.dto';
import {
  OuterApiProvider,
  OuterApiService,
} from '../outer-api/outer-api.service';
import {
  ExecutionAction,
  RagPlannerService,
} from './rag-planner.service';
import { RagPlanExecuterService, type ExecutionContext } from './rag-plan-executer.service';
import {
  RAG_CAPABILITY_ENTRIES,
  RagCapabilityEntry,
  RAG_CAPABILITY_REQUIRED_PARAMS_BY_ID,
} from './capability-entries';

const MAX_LOOP = 3;

type ValidationResult = {
  validSteps: ExecutionAction[];
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

  private buildAccumulatedEvidence(contexts: ExecutionContext[]): string {
    if (contexts.length === 0) {
      return 'none';
    }

    return contexts
      .map((ctx, index) => {
        const header = `#${index + 1} [${ctx.capabilityId}]`;
        const body = ctx.error ? `ERROR: ${ctx.error}` : String(ctx.result ?? '');
        return `${header}\n${body}`;
      })
      .join('\n');
  }

  // PoC: process flow with simplified ReAct loop
  // Step 1: initialize - Step 2: plan+validate - Step 3: execute+accumulate - Loop control
  async chat(params: RagReactOrchestratorRequest) {
    // Step 1: Initialize ReAct runtime state
    const provider = (params.aiRequest.provider as OuterApiProvider) || 'groq';
    const usedCapabilityIds = new Set<string>();
    const validationErrors: string[] = [];
    const overallContexts: ExecutionContext[] = [];
    let accumulateEvidence = 'none';

    // ReAct loop: Plan -> Validate -> Act, max MAX_LOOP iterations
    for (let loop = 1; loop <= MAX_LOOP; loop += 1) {
      console.log(`[RAG-ReAct] Loop ${loop}/${MAX_LOOP}`);

      // Step 2: Plan (Planner decides next action based on accumulated evidence)
      const plannerResponse = await this.ragPlannerService.selectActionsFromPrompt({
        prompt: params.aiRequest.text,
        userRole: params.user.role,
        metadata: params.aiRequest.metadata,
        provider,
        accumulateEvidence,
      });

      // If planner determines reasoning is complete, exit loop and compose answer
      if (plannerResponse.doneReasoning) {
        console.log('[RAG-ReAct] Planner indicated reasoning is complete');
        break;
      }

      // Step 2.5: Validate planned actions before execution
      const validateStepsData = this.validateCapabilities(plannerResponse.actions);
      validateStepsData.rejected.forEach((item) => {
        validationErrors.push(`[Loop ${loop}] ${item.capabilityId}: ${item.reason}`);
      });

      // Keep only newly planned capabilities not yet executed
      const validSteps = validateStepsData.validSteps.filter(
        (step) => !usedCapabilityIds.has(step.capabilityId),
      );

      validSteps.forEach((step) => usedCapabilityIds.add(step.capabilityId));

      if (validSteps.length === 0) {
        console.log('[RAG-ReAct] No valid steps to execute');
        break;
      }

      // Step 3: Execute actions and accumulate evidence
      console.log(`[RAG-ReAct] Executing ${validSteps.length} action(s): ${validSteps.map((s) => s.capabilityId).join(', ')}`);
      const contexts = await this.planExecuterService.execute(validSteps);
      overallContexts.push(...contexts);

      // Rebuild accumulated evidence string for next planner iteration
      accumulateEvidence = this.buildAccumulatedEvidence(overallContexts);
      console.log(`[RAG-ReAct] Accumulated ${overallContexts.length} evidence block(s)`);
    }

    // Step 4: Compose final answer from validated execution evidence
    const composed = await this.composeAnswer({
      userQuestion: params.aiRequest.text,
      provider,
      contexts: overallContexts,
      validationErrors,
      temperature: params.aiRequest.temperature,
    });

    // Return response with execution metadata
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
    steps: ExecutionAction[],
  ): ValidationResult {
    const validSteps: ExecutionAction[] = [];
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
    userQuestion: string;
    provider: OuterApiProvider;
    contexts: ExecutionContext[];
    validationErrors: string[];
    temperature?: number;
  }): Promise<{ text: string; provider: string }> {
    const evidence = params.contexts
      .map((ctx, index) => {
        const header = `[Capability: ${ctx.capabilityId}]`;
        const body = ctx.error ? `ERROR: ${ctx.error}` : String(ctx.result ?? '');
        return `${index + 1}. ${header}\n${body}`;
      })
      .join('\n\n');

    const instructionPrompt = [
      'You are the Answer Composer layer in a ReAct pipeline.',
      'Use evidence blocks as primary truth source.',
      'If evidence is missing or contains execution errors, explicitly state limitations.',
      'Do not invent data not present in evidence.',
      'Provide concise, actionable answer for educator/admin context.',
      'DO NOT mention about the evidence blocks in the answer',
      `the answer's language should be the same as user question's language`,
    ].join('\n');

    const prompt = [
      `User question:\n${params.userQuestion}`,
      `Validation issues:\n${params.validationErrors.join('\n') || 'none'}`,
      `Evidence blocks:\n${evidence || 'none'}`,
    ].join('\n');

    const composed = await this.outerApiService.chat({
      prompt,
      provider: params.provider,
      caller: 'rag-react-composer',
      instructionPrompt: instructionPrompt,
      temperature: params.temperature ?? 0.8,
    });

    return {
      text: composed.text,
      provider: composed.provider,
    };
  }
}
