import { Injectable, Logger } from '@nestjs/common';
import { IntentClassifierService } from './intent-classifier.service';
import { ContextBuilderService } from './context-builder.service';
// import { ResponseAggregatorService } from './response-aggregator.service';
// import { PrismaService } from '../../../prisma.service';
import { AiRequestDto } from '../dtos/ai-request.dto';
import { AiResponseDto } from '../dtos/ai-response.dto';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { OuterApiService } from '../services/outer-api/outer-api.service';

// ======================
// ADD: import StudyAnalyst service
// ======================
import { StudyAnalystAiService } from '../services/study-analyst/study-analyst-ai.service';
import { ConversationService } from '../services/conversation.service';

export type AIServiceType = 
  | 'SYSTEM_CONTROL' 
  | 'STUDY_ANALYST' 
  | 'TUTOR' 
  | 'TEACHING_ASSISTANT';


@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly intentClassifier: IntentClassifierService,
    // private readonly contextBuilder: ContextBuilderService,
    // private readonly responseAggregator: ResponseAggregatorService,
    // private readonly prisma: PrismaService,
    private readonly outerApiService: OuterApiService,
    private readonly conversationService: ConversationService,

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

  async directChat(request: AiRequestDto, user: JwtPayload): Promise<AiResponseDto> {
    const startTime = Date.now();
    let conversationId = request.conversationId;
    let userMessageId: string | undefined;

    try {
      // Step 1: Create or get conversation
      if (!conversationId) {
        const conversation = await this.conversationService.createConversation({
          userId: user.uid,
        });
        conversationId = conversation.acid;
      } else {
        // Verify conversation exists and belongs to user
        await this.conversationService.findConversationById(conversationId, user.uid);
      }

      // Step 2: Save user message
      const userMessage = await this.conversationService.createMessage({
        conversationId,
        role: 'user',
        content: request.text,
        metadata: request.metadata,
      });
      userMessageId = userMessage.amid;

      // Step 3: Call the outer API service
      const result = await this.outerApiService.chat({
        prompt: request.text,
        role: user.role,
        caller: 'direct',
        provider: 'groq',
      });

      // Step 4: Save assistant message
      const assistantMessage = await this.conversationService.createMessage({
        conversationId,
        role: 'assistant',
        content: result.text,
        modelName: result.provider,
        metadata: {
          systemPrompt: result.systemPrompt,
          attemptedProviders: result.attemptedProviders,
        },
      });

      // Step 5: Generate title for new conversations
      if (!request.conversationId) {
        const title = await this.conversationService.generateConversationTitle(
          conversationId,
          user.uid,
        );
        await this.conversationService.updateConversation(conversationId, user.uid, { title });
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`Direct chat completed for conversation ${conversationId}`);

      // Step 6: Return success response
      return {
        success: true,
        conversationId,
        messageId: assistantMessage.amid,
        role: 'assistant',
        text: result.text,
        metadata: {
          createdAt: new Date().toISOString(),
          serviceType: 'direct',
          provider: result.provider,
          processingTime,
        },
      } as AiResponseDto;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error('Direct chat failed:', error);

      // User message is already saved, just return error response
      return {
        success: false,
        conversationId,
        messageId: userMessageId,
        role: 'assistant',
        text: '',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'DIRECT_CHAT_ERROR',
        },
        metadata: {
          createdAt: new Date().toISOString(),
          serviceType: 'direct',
          processingTime,
        },
      } as AiResponseDto;
    }
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
