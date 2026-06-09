import { Injectable } from '@nestjs/common';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { s3Client } from 'src/common/utils/s3.client';
import { AiRequestDto } from '../../dtos/ai-request.dto';
import { GeminiProvider } from '../../providers/gemini.provider';
import { AiChatSetting } from '../../providers/iProvider.interface';
import { AiProgressReporter } from '../../stream/ai-stream.types';
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

const MAX_LOOP = 7;

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
  progress?: AiProgressReporter;
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
    private readonly geminiProvider: GeminiProvider,
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

  private emitProgress(
    progress: AiProgressReporter | undefined,
    stage: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    progress?.({ stage, message, data });
  }

  // PoC: process flow with simplified ReAct loop
  // Step 1: initialize - Step 2: plan+validate - Step 3: execute+accumulate - Loop control
  async chat(params: RagReactOrchestratorRequest) {
    // Step 1: Initialize ReAct runtime state
    const plannerProvider = (params.aiRequest.provider as OuterApiProvider) || 'gemini';
    const usedCapabilityIds = new Set<string>();
    const validationErrors: string[] = [];
    const overallContexts: ExecutionContext[] = [];
    let accumulateEvidence = 'none';

    this.emitProgress(params.progress, 'rag.start', 'Đang khởi tạo vòng suy luận ReAct...');

    // ReAct loop: Plan -> Validate -> Act, max MAX_LOOP iterations
    for (let loop = 1; loop <= MAX_LOOP; loop += 1) {
      console.log(`[RAG-ReAct] Loop ${loop}/${MAX_LOOP}`);
      this.emitProgress(
        params.progress,
        'rag.plan',
        `Đang suy nghĩ bước ${loop}/${MAX_LOOP} để chọn công cụ phù hợp...`,
        { loop },
      );

      // Step 2: Plan (Planner decides next action based on accumulated evidence)
      const plannerResponse = await this.ragPlannerService.selectActionsFromPrompt({
        prompt: params.aiRequest.text,
        userRole: params.user.role,
        metadata: params.aiRequest.metadata,
        provider: plannerProvider,
        accumulateEvidence,
      });

      // If planner determines reasoning is complete, exit loop and compose answer
      if (plannerResponse.doneReasoning) {
        console.log('[RAG-ReAct] Planner indicated reasoning is complete');
        this.emitProgress(params.progress, 'rag.compose', 'Đã đủ thông tin, đang tổng hợp câu trả lời cuối cùng...');
        break;
      }

      // Step 2.5: Validate planned actions before execution
      const validateStepsData = this.validateCapabilities(plannerResponse.actions);
      if (validateStepsData.rejected.length > 0) {
        this.emitProgress(
          params.progress,
          'rag.validate.rejected',
          'Một số công cụ được đề xuất không hợp lệ, hệ thống đang lọc bỏ...',
          { rejectedCount: validateStepsData.rejected.length },
        );
      } else {
        this.emitProgress(params.progress, 'rag.validate', 'Đã xác thực danh sách công cụ cần thực thi.');
      }
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
        this.emitProgress(params.progress, 'rag.stop', 'Không còn công cụ hợp lệ để chạy tiếp.');
        break;
      }

      // Step 3: Execute actions and accumulate evidence
      console.log(`[RAG-ReAct] Executing ${validSteps.length} action(s): ${validSteps.map((s) => s.capabilityId).join(', ')}`);
      this.emitProgress(
        params.progress,
        'rag.execute',
        `Đang thực thi ${validSteps.length} công cụ: ${validSteps.map((s) => s.capabilityId).join(', ')}`,
        { capabilityIds: validSteps.map((step) => step.capabilityId) },
      );
      const contexts = await this.planExecuterService.execute(validSteps);
      overallContexts.push(...contexts);

      contexts.forEach((ctx) => {
        const friendlyMessage = this.describeCapabilityProgress(ctx.capabilityId);
        this.emitProgress(params.progress, 'rag.execute.step', friendlyMessage, {
          capabilityId: ctx.capabilityId,
          hasError: Boolean(ctx.error),
        });
      });

      // Rebuild accumulated evidence string for next planner iteration
      accumulateEvidence = this.buildAccumulatedEvidence(overallContexts);
      console.log(`[RAG-ReAct] Accumulated ${overallContexts.length} evidence block(s)`);
      this.emitProgress(params.progress, 'rag.evidence', 'Đã gom xong bằng chứng tạm thời cho vòng suy nghĩ tiếp theo.');
    }

    // Step 4: Compose final answer from validated execution evidence
    const composed = await this.composeAnswer({
      userQuestion: params.aiRequest.text,
      provider: params.aiRequest.provider as OuterApiProvider | 'gemini',
      contexts: overallContexts,
      validationErrors,
      temperature: params.aiRequest.temperature,
      progress: params.progress,
    });

    this.emitProgress(params.progress, 'rag.done', 'Luồng ReAct đã hoàn tất.');

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
    provider?: OuterApiProvider;
    contexts: ExecutionContext[];
    validationErrors: string[];
    temperature?: number;
    progress?: AiProgressReporter;
  }): Promise<{ text: string; provider: string }> {
    const evidence = params.contexts
      .map((ctx, index) => {
        const header = `[Capability: ${ctx.capabilityId}]`;
        const body = ctx.error ? `ERROR: ${ctx.error}` : String(ctx.result ?? '');
        return `${index + 1}. ${header}\n${body}`;
      })
      .join('\n\n');

    // Detect if file metadata is present in contexts
    const fileContext = this.extractFileContext(params.contexts, params.progress);


    // If file is present, force use Gemini provider
    if (fileContext) {
      this.emitProgress(params.progress, 'rag.file.ready', 'Đã lấy được file tài liệu, đang dùng Gemini để tổng hợp với file đính kèm.');
      return this.composeWithGemini({
        userQuestion: params.userQuestion,
        evidence,
        fileContext,
        validationErrors: params.validationErrors,
        temperature: params.temperature ?? 0.8,
        progress: params.progress,
      });
    }

    // Otherwise use regular provider
    this.emitProgress(params.progress, 'rag.compose', 'Đang tổng hợp câu trả lời cuối cùng từ bằng chứng đã thu thập.');
    return this.composeWithRegularProvider({
      userQuestion: params.userQuestion,
      provider: params.provider,
      evidence,
      validationErrors: params.validationErrors,
      temperature: params.temperature ?? 0.8,
      progress: params.progress,
    });
  }

  private extractFileContext(
    contexts: ExecutionContext[],
    progress?: AiProgressReporter,
  ): {
    url: string;
    mime_type: string;
    filename: string;
  } | null {
    const fileContext = contexts.find((ctx) => ctx.capabilityId === 'get-file');

    if (!fileContext || fileContext.error || !fileContext.result) {
      return null;
    }

    const fileMetadata = this.parseFileContextResult(fileContext.result);

    if (fileMetadata) {
      this.emitProgress(progress, 'rag.file.detected', 'Đã phát hiện file tài liệu cần nạp vào bước tổng hợp.', {
        filename: fileMetadata.filename,
        mimeType: fileMetadata.mime_type,
      });
    }

    console.log('[RAG-ReAct] Extracted file context:', fileMetadata);

    return fileMetadata;
  }

  private parseFileContextResult(result: unknown): {
    url: string;
    mime_type: string;
    filename: string;
  } | null {
    if (result && typeof result === 'object') {
      const data = result as Record<string, unknown>;
      const url = typeof data.url === 'string' ? data.url.trim() : '';
      const mimeType = typeof data.mime_type === 'string' ? data.mime_type.trim() : '';
      const filename = typeof data.filename === 'string' ? data.filename.trim() : '';

      if (url) {
        return {
          url,
          mime_type: mimeType || 'application/octet-stream',
          filename: filename || this.deriveFilenameFromUrl(url),
        };
      }
    }

    const text = String(result ?? '').trim();
    if (!text) {
      return null;
    }

    const tableMatch = this.parseTableMetadata(text);
    if (tableMatch) {
      return tableMatch;
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        const url = typeof parsed.url === 'string' ? parsed.url.trim() : '';
        if (url) {
          const mimeType = typeof parsed.mime_type === 'string' ? parsed.mime_type.trim() : '';
          const filename = typeof parsed.filename === 'string' ? parsed.filename.trim() : '';

          return {
            url,
            mime_type: mimeType || 'application/octet-stream',
            filename: filename || this.deriveFilenameFromUrl(url),
          };
        }
      } catch {
        // Fall through to URL extraction below.
      }
    }

    const urlMatch = text.match(/https?:\/\/[^\s|"'<>]+/i);
    if (urlMatch) {
      const url = urlMatch[0].replace(/[),.;\]]+$/g, '');
      return {
        url,
        mime_type: 'application/octet-stream',
        filename: this.deriveFilenameFromUrl(url),
      };
    }

    return null;
  }

  private parseTableMetadata(text: string): {
    url: string;
    mime_type: string;
    filename: string;
  } | null {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 3) {
      return null;
    }

    const headerIndex = lines.findIndex(
      (line) => line.includes('|') && /(^|\s)url(\s|\|)/i.test(line),
    );

    if (headerIndex === -1 || headerIndex + 1 >= lines.length) {
      return null;
    }

    const headers = lines[headerIndex]
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);

    const rowLine = lines
      .slice(headerIndex + 1)
      .find((line) => !line.startsWith('[') && line.includes('|'));

    if (!rowLine || headers.length === 0) {
      return null;
    }

    const values = rowLine.split('|').map((cell) => cell.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header.toLowerCase()] = values[index] ?? '';
    });

    const url = row.url?.trim();
    if (!url) {
      return null;
    }

    return {
      url,
      mime_type: row.mime_type?.trim() || 'application/octet-stream',
      filename: row.filename?.trim() || this.deriveFilenameFromUrl(url),
    };
  }

  private deriveFilenameFromUrl(url: string): string {
    try {
      const normalizedUrl = new URL(url);
      const pathname = normalizedUrl.pathname.split('/').filter(Boolean);
      const lastSegment = pathname[pathname.length - 1] ?? 'file';
      return lastSegment || 'file';
    } catch {
      const fallback = url.split('/').filter(Boolean).pop();
      return fallback || 'file';
    }
  }

  private isS3Url(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes('.s3.') || parsed.hostname.startsWith('s3.');
    } catch {
      return false;
    }
  }

  private parseS3BucketAndKey(rawUrl: string): { bucket: string; key: string } | null {
    try {
      const parsed = new URL(rawUrl);

      if (parsed.hostname.startsWith('s3.')) {
        const pathSegments = parsed.pathname.split('/').filter(Boolean);
        const bucket = pathSegments.shift();
        const key = pathSegments.join('/');

        if (bucket && key) {
          return { bucket, key: decodeURIComponent(key) };
        }
        return null;
      }

      const hostnameParts = parsed.hostname.split('.');
      const bucket = hostnameParts[0];
      const key = parsed.pathname.replace(/^\//, '');

      if (bucket && key) {
        return { bucket, key: decodeURIComponent(key) };
      }

      return null;
    } catch {
      return null;
    }
  }

  private async signS3Url(rawUrl: string, filename: string): Promise<string> {
    if (!this.isS3Url(rawUrl)) {
      return rawUrl;
    }

    const bucketAndKey = this.parseS3BucketAndKey(rawUrl);
    if (!bucketAndKey) {
      return rawUrl;
    }

    const command = new GetObjectCommand({
      Bucket: bucketAndKey.bucket,
      Key: bucketAndKey.key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 60 });
  }

  private async composeWithGemini(params: {
    userQuestion: string;
    evidence: string;
    fileContext: { url: string; mime_type: string; filename: string };
    validationErrors: string[];
    temperature: number;
    progress?: AiProgressReporter;
  }): Promise<{ text: string; provider: string }> {
    this.emitProgress(params.progress, 'rag.file.sign', 'Đang tạo URL tạm thời để đọc file tài liệu...');
    const signedUrl = await this.signS3Url(
      params.fileContext.url,
      params.fileContext.filename,
    );

    this.emitProgress(params.progress, 'rag.compose', 'Đang tổng hợp câu trả lời với file tài liệu đính kèm...');

    const instructionPrompt = [
      'You are the Answer Composer layer in a ReAct pipeline with file reading capability.',
      'You have access to file content through the attached document.',
      'Use evidence blocks and file content as primary truth sources.',
      'If evidence is missing or contains execution errors, explicitly state limitations.',
      'Do not invent data not present in evidence or file content.',
      'Provide concise, actionable answer for educator/admin context.',
      'DO NOT mention about the evidence blocks in the answer',
      `the answer's language should be the same as user question's language`,
    ].join('\n');

    const prompt = [
      `User question:\n${params.userQuestion}`,
      `Validation issues:\n${params.validationErrors.join('\n') || 'none'}`,
      `Evidence blocks:\n${params.evidence || 'none'}`,
    ].join('\n');

    const aiChatSetting: AiChatSetting = {
      temperature: params.temperature,
      systemPrompt: instructionPrompt,
      fileContext: {
        url: signedUrl,
        mime_type: params.fileContext.mime_type,
        filename: params.fileContext.filename,
      },
    };

    const composed = await this.geminiProvider.chat(prompt, aiChatSetting);

    return {
      text: composed,
      provider: 'gemini',
    };
  }

  private async composeWithRegularProvider(params: {
    userQuestion: string;
    provider?: OuterApiProvider;
    evidence: string;
    validationErrors: string[];
    temperature: number;
    progress?: AiProgressReporter;
  }): Promise<{ text: string; provider: string }> {
    const instructionPrompt = [
      'You are the Answer Composer layer in a ReAct pipeline.',
      'Use evidence blocks as primary truth source.',
      'If evidence is missing or contains execution errors, explicitly state limitations.',
      'Do not invent data not present in evidence.',
      'Provide concise, actionable answer for educator/admin context.',
      'DO NOT mention about the evidence blocks in the answer',
      'DO NOT mention about the ids (even ones like quizXXX or classXXX) in the answer',
      `the answer's language should be the same as user question's language`,
      'Try your best to resolve ids to its corresponding names, for those that us used for composing answer',
    ].join('\n');

    

    const prompt = [
      `User question:\n${params.userQuestion}`,
      `Validation issues:\n${params.validationErrors.join('\n') || 'none'}`,
      `Evidence blocks:\n${params.evidence || 'none'}`,
    ].join('\n');

    const composed = await this.outerApiService.chat({
      prompt,
      provider: params.provider,
      caller: 'rag-react-composer',
      instructionPrompt: instructionPrompt,
      temperature: params.temperature,
    });

    return {
      text: composed.text,
      provider: composed.provider,
    };
  }

  private describeCapabilityProgress(capabilityId: string): string {
    switch (capabilityId) {
      case 'get-file':
        return 'Đang lấy file tài liệu để đọc nội dung liên quan...';
      case 'class-files':
        return 'Đang truy xuất danh sách file của lớp học...';
      case 'class-quizzes':
        return 'Đang lấy danh sách quiz liên quan...';
      case 'knowledge-gap':
        return 'Đang phân tích lỗ hổng kiến thức...';
      case 'teaching-recommendation':
        return 'Đang tổng hợp khuyến nghị giảng dạy...';
      default:
        return `Đang thực thi công cụ: ${capabilityId}`;
    }
  }
}
