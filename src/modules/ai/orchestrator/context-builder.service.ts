import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
// import { AIContext, AIServiceType } from '../dtos/ai-context.interface';

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);
  private readonly quizGeneratorOutputFormat =
    'Return ONLY a valid JSON object (no markdown, no code fences, no extra text). ' +
    'The object must have exactly these fields: ' +
    '"text" (string): your explanation or reasoning for the generated questions; ' +
    '"questions" (array): the list of quiz questions. ' +
    'Each question object must include: ' +
    '"content" (string, required), ' +
    '"options_json" (object, required for multiple-choice, e.g. {"A":"Paris","B":"London","C":"Berlin"}), ' +
    '"answer_key_json" (object, required, e.g. {"correct":"A"}), ' +
    '"points" (number, optional, defaults to 1). ' +
    'Example: {"text":"Here are 2 questions.","questions":[{"content":"What is the capital of France?","options_json":{"A":"Paris","B":"London","C":"Berlin"},"answer_key_json":{"correct":"A"},"points":1}]}';


  constructor(private readonly prisma: PrismaService) {}

  buildSystemPrompt(params: {
    role: string;
    caller?: string;
    customSystemPrompt?: string;
    onlyUseSystemPrompt?: boolean;
  }): string {

    if (params.onlyUseSystemPrompt && params.customSystemPrompt) {
      return params.customSystemPrompt;
    }
    
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
        this.quizGeneratorOutputFormat,
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
      'direct':
        'This request comes directly from the user. Adapt tone and depth to the user context while staying concise and accurate.',
    };

    const roleInstruction =
      roleInstructionMap[normalizedRole] ?? "";
    const callerInstruction =
      callerInstructionMap[normalizedCaller] ?? "";

    const segments = [
      'You are an AI assistant for an e-learning platform.',
      'If requirements are ambiguous, state assumptions explicitly and avoid fabricating details.',
      roleInstruction,
      callerInstruction,
    ];

    if (
      params.customSystemPrompt &&
      params.customSystemPrompt.trim().length > 0
    ) {
      segments.push(
        `Additional instruction: ${params.customSystemPrompt.trim()}`,
      );
    }

    if (normalizedCaller === 'quiz-generator') {
      segments.push(this.quizGeneratorOutputFormat);
    }

    return segments.join(' ');
  }
}
