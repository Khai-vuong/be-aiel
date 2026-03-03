import { Injectable, Logger } from '@nestjs/common';
import { IntentClassifierService } from './intent-classifier.service';
import { ContextBuilderService } from './context-builder.service';
import { ResponseAggregatorService } from './response-aggregator.service';
import { PrismaService } from '../../../prisma.service';
import { AiRequestDto } from '../models/ai-request.dto';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { OuterApiService } from '../services/outer-api/outer-api.service';

// ======================
// ADD: import StudyAnalyst service
// ======================
import { StudyAnalystAiService } from '../services/study-analyst/study-analyst-ai.service';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly intentClassifier: IntentClassifierService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly responseAggregator: ResponseAggregatorService,
    private readonly prisma: PrismaService,
    private readonly outerApiService: OuterApiService,

    // ======================
    // inject StudyAnalystAiService
    // ======================
    private readonly studyAnalystAiService: StudyAnalystAiService,
  ) {}

  async processRequest(request: AiRequestDto, user: JwtPayload) {
    // ======================
    // route STUDY_ANALYST FIRST
    // ======================
    if (request.serviceType === 'STUDY_ANALYST') {
      this.logger.log('Routing request to STUDY_ANALYST service');

      return this.studyAnalystAiService.process({
        prompt: request.text,
        metadata: request.metadata,
        user,
      });
    }

    // ======================
    // ======================
    const userIntent = await this.intentClassifier.classify(
      request.text,
      user.role,
    );

    console.log('Classified intent:', userIntent);

    return {
      text: request.text,
      decisions: userIntent,
      role: user.role,
    };
  }

  async directChat(text: string, user: JwtPayload) {
    const result = await this.outerApiService.chat({
      prompt: text,
      role: user.role,
      caller: 'general',
      provider: 'groq', // or 'openai'
    });

    console.log('Direct chat result:', result);
    return result.text;
  }

  async studyAnalystReport(user: JwtPayload, body: any) {
    const { prompt, classId } = body;

    // (PoC) context
    const classContext = `
Class ID: ${classId}
Average score: 72%
Department average: 78%
Students below 50%: 2
Department average below 50%: 1
Completion trend: decreasing faster than department average
`;

    const finalPrompt = `
You are an educational data analyst.

User role: ${user.role}

Task:
${prompt}

Data:
${classContext}

Return a concise analytical insight for a lecturer.
`;

    const aiResult = await this.outerApiService.chat({
      prompt: finalPrompt,
      role: user.role,
      caller: 'study-analyst',
      provider: 'openai', // hoặc openai
    });

    return {
      role: user.role,
      prompt,
      classId,
      insight: aiResult.text,
    };
  }

  async getUserConversations(userId: string, limit: number) {
    // TODO: Implement when AIConversation model is added to schema
    return [];
  }

  async getConversation(conversationId: string, userId: string) {
    // TODO: Implement when AIConversation model is added to schema
    return null;
  }
}
