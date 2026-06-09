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
            'If the input is about studying, explaining` concepts, solving exercises, common algorithms, data structures, or general learning help and does NOT need internal platform data, route to "chat".',
            'If a Student request looks like quiz creation/generation, route to chat',
            'Only route to insight when the request needs internal platform data, or the user explicitly mentions file names',
          ]
        : normalizedRole === 'lecturer'
          ? [
              'Role constraint: current user role is Lecturer.',
              'If the user names a quiz or asks for a quiz-specific overview, summary, details, question list, performance, or analysis for an existing named quiz, route to insight.',
            ]
        : [];

    const instructionPrompt = [
      'You are a routing classifier for the backend AI orchestrator. Return exactly one string that best fits the following guidelines.',
      'Available modes:',
      'quiz_assistant: only when the user explicitly needs quiz generation, quiz structuring, or another dedicated quiz-creation workflow.',
      'insight: only when the request requires internal platform data such as analytics, reports, trends, recommendations, logs, enrollments, uploaded files, stored answers, or other system-specific information.',
      'For lecturers, requests about an existing quiz by name, such as quiz overview, quiz details, question list, performance summary, or analysis for that quiz, must be treated as insight.',
      'chat: everything else, including general explanations, tutoring, brainstorming, conceptual questions, and requests about common algorithms or data structures that do not require internal data.',
      'Decision rule: prefer chat whenever the request can be answered from general knowledge alone; do NOT upgrade a general study question to insight just because the user is a Student.',
      'If the request is from a Lecturer and mentions a specific quiz name while asking for an overview, summary, or analysis, prefer insight over chat.',
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
              `Classifier attempted blocked mode quiz_assistant for role=${user.role}. Remapping to chat.`,
            );
            return 'chat';
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
