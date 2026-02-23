import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { AIContext, AIServiceType } from '../models/ai-context.interface';

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async buildContext(params: {
    userId: string;
    userRole: string;
    serviceType: AIServiceType;
    additionalContext?: any;
  }): Promise<AIContext> {
    // TODO: Implement context building logic
    this.logger.log('Building context - to be implemented');
    
    const context: AIContext = {
      userId: params.userId,
      userRole: params.userRole,
      serviceType: params.serviceType,
      timestamp: new Date(),
      additionalContext: params.additionalContext || {},
    };

    return context;
  }

  buildSystemPrompt(params: {
    role: string;
    caller?: string;
    customSystemPrompt?: string;
  }): string {
    const normalizedRole = (params.role ?? 'user').toLowerCase().trim();
    const normalizedCaller = (params.caller ?? 'general').toLowerCase().trim();

    const roleInstructionMap: Record<string, string> = {
      admin:
        'Treat this user as a platform administrator. Prioritize governance, reliability, risk control, and operational clarity.',
      lecturer:
        'Treat this user as a lecturer. Prioritize pedagogy, course quality, question clarity, and alignment with learning outcomes.',
      student:
        'Treat this user as a student. Give clear, supportive, and step-by-step explanations with practical examples.',
      user:
        'Adapt tone and depth to the user context while staying concise and accurate.',
    };

    const callerInstructionMap: Record<string, string> = {
      'quiz-module':
        'This request comes from the quiz module. Focus on valid question design, answer correctness, and curriculum alignment.',
      'quiz-generator':
        'This request comes from the quiz generator. Return structured, unambiguous outputs suitable for quiz generation.',
      'data-analyst-module':
        'This request comes from the data analyst module. Emphasize measurable insights, confidence level, and actionable recommendations.',
      'data-analyst':
        'This request comes from the data analyst module. Emphasize measurable insights, confidence level, and actionable recommendations.',
      'study-analyst':
        'This request comes from the study analyst module. Prioritize trend analysis, weaknesses, and practical improvement suggestions.',
      'tutor':
        'This request comes from the tutor module. Focus on explanation quality, conceptual clarity, and progressive guidance.',
      'system-control':
        'This request comes from system control. Prioritize safety, reliability, and incident-oriented recommendations.',
      'general':
        'This request comes from a general assistant path. Keep responses precise, useful, and context-aware.',
    };

    const roleInstruction =
      roleInstructionMap[normalizedRole] ?? roleInstructionMap.user;
    const callerInstruction =
      callerInstructionMap[normalizedCaller] ?? callerInstructionMap.general;

    const segments = [
      'You are an AI assistant for an e-learning platform.',
      roleInstruction,
      callerInstruction,
      'If requirements are ambiguous, state assumptions explicitly and avoid fabricating details.',
    ];

    if (
      params.customSystemPrompt &&
      params.customSystemPrompt.trim().length > 0
    ) {
      segments.push(
        `Additional instruction: ${params.customSystemPrompt.trim()}`,
      );
    }

    return segments.join(' ');
  }
}
