import { Injectable, Logger } from '@nestjs/common';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { AiRequestDto } from '../dtos/ai-request.dto';
import {
  OuterApiService,
  type OuterApiProvider,
} from '../services/outer-api/outer-api.service';
export type ExecutionMode = 'chat' | 'quiz_assistant' | 'insight';

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);

  constructor(
    private readonly outerApiService: OuterApiService,
    ) {}

  async resolveExecutionMode(
    request: AiRequestDto,
    user: JwtPayload,
  ): Promise<ExecutionMode> {
    const normalizedRole = String(user.role ?? '').trim().toLowerCase();
    const roleConstraints =
      normalizedRole === 'student'
        ? [
            'Role constraint: current user role is Student.',
            'Student must NEVER be routed to quiz_assistant.',
            'If the input looks like quiz creation/generation, route to insight instead of quiz_assistant.',
          ]
        : [];

    const instructionPrompt = [
      'You are a routing classifier for the backend AI orchestrator. Return exactly one string that best fits the following guidelines.',
      'Available modes:',
      'quiz_assistant: if the user is asking for help generating quiz questions, structuring quizzes, or anything directly related to quiz creation.',
      'insight: analytics, reports, trends, recommendations, logs, enrollments, reading files or answers that require internal platform data.',
      'chat: Not quiz_assistant or insight, just general AI chat.',
      ...roleConstraints,
      'Return only one label: quiz_assistant, insight, or chat. Do not answer the user request.',
    ].join('\n');

    const classifierProviders: OuterApiProvider[] = ['groq', 'openai', 'gemini'];

    for (const provider of classifierProviders) {
      try {
        const result = await this.outerApiService.chat({
          prompt: request.text,
          caller: 'coarse-router',
          provider,
          temperature: 0,
          instructionPrompt,
        });

        const mode = this.parseExecutionMode(result?.text);
        if (mode) {
          if (normalizedRole === 'student' && mode === 'quiz_assistant') {
            this.logger.warn(
              `Classifier attempted blocked mode quiz_assistant for role=${user.role}. Remapping to insight.`,
            );
            return 'insight';
          }

          return mode;
        }

        this.logger.warn(
          `Classifier provider=${provider} returned invalid mode: ${String(result?.text)}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Classifier provider=${provider} failed, trying next provider: ${message}`,
        );
      }
    }

    this.logger.warn('Coarse routing failed on all providers, fallback to chat');
    return 'chat';
  }

  private parseExecutionMode(text?: string): ExecutionMode | null {
    if (!text) return null;

    const normalized = text.trim().toLowerCase();
    const cleaned = normalized.replace(/^["'`\s]+|["'`\s.]+$/g, '');

    if (cleaned === 'quiz_assistant') return 'quiz_assistant';
    if (cleaned === 'insight') return 'insight';
    if (cleaned === 'chat') return 'chat';

    return null;
  }
}
