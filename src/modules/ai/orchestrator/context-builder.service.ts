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
  private readonly coarseRouterOutputFormat =
    'You are a coarse routing classifier for the backend AI orchestrator. ' +
    'Choose exactly one execution mode for each request. ' +
    'Available modes: ' +
    '"chat" for general conversation, tutoring, explanation, or open-ended help; ' +
    '"quiz_assistant" for quiz generation, question authoring, or quiz-builder workflows; ' +
    '"insight" for analytics, reports, trends, recommendations, logs, enrollments, or answers that require internal platform data. ' +
    'Respect platform policy: Student can only use "chat". Lecturer and Admin can use all modes. ' +
    'If a request mentions multiple tasks, choose the primary immediate action to execute first. ' +
    'Return ONLY a valid JSON object with the exact shape {"mode":"chat|quiz_assistant|insight","confidence":0.0,"reason":"short explanation"}.';


  constructor(private readonly prisma: PrismaService) {}

  buildSystemPrompt(params: {
    role: string;
    customSystemPrompt?: string;
    onlyUseSystemPrompt?: boolean;
  }): string {

    if (params.onlyUseSystemPrompt && params.customSystemPrompt) {
      return params.customSystemPrompt;
    }
    
    const normalizedRole = (params.role ?? 'user').toLowerCase().trim();
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

    const roleInstruction =
      roleInstructionMap[normalizedRole] ?? "";

    const segments = [
      'You are an AI assistant for an e-learning platform.',
      'If requirements are ambiguous, state assumptions explicitly and avoid fabricating details.',
      roleInstruction,
    ];

    if (
      params.customSystemPrompt &&
      params.customSystemPrompt.trim().length > 0
    ) {
      segments.push(
        `Additional instruction: ${params.customSystemPrompt.trim()}`,
      );
    }

    // if (normalizedCaller === 'quiz-generator') {
    //   segments.push(this.quizGeneratorOutputFormat);
    // }

    return segments.join(' ');
  }
}
