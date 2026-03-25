import { Injectable, Logger } from '@nestjs/common';
import { IntentClassifierService } from './intent-classifier.service';
import { PrismaService } from '../../../prisma.service';
import { AiRequestDto } from '../dtos/ai-request.dto';
import { AiResponseDto } from '../dtos/ai-response.dto';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { OuterApiService } from '../services/outer-api/outer-api.service';
import { StudyAnalystAIService } from '../services/study-analyst/study-analyst-ai.service';
import { ConversationService } from '../services/conversation.service';
import {
  SummarizationService,
  SummarizeOptions,
} from '../services/summarization.service';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly intentClassifier: IntentClassifierService,
    private readonly prisma: PrismaService,
    private readonly outerApiService: OuterApiService,
    private readonly studyAnalystAIService: StudyAnalystAIService,
    private readonly conversationService: ConversationService,
    private readonly summarizationService: SummarizationService,
  ) {}

  /**
   * MAIN AI PIPELINE
   */
  async processRequest(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('AI request received');

    //
    const intent = await this.intentClassifier.classifyIntent(
      request.text,
      user.role,
    );

    this.logger.log(`Intent detected: ${intent}`);

    //
    switch (intent) {
      case 'data_analysis':
      case 'class_analysis':
        return this.handleClassAnalysis(request, user);

      //
      case 'teaching_recommendation':
      case 'quiz_creation':
        // return this.handleQuizCreation(request, user); // (Ví dụ cho tương lai)
        return this.handleGeneralChat(request, user);

      default:
        return this.handleGeneralChat(request, user);
    }
  }

  /**
  Risk, Trend, Overview
   */
  private async handleClassAnalysis(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('Routing to Study Analyst AI Domain...');
    const classId = request.metadata?.classId || 'default-class';

    const promptLower = (request.text || '').toLowerCase();
    const originalPrompt =
      request.text || 'Provide an overview of class performance.';

    //
    if (
      promptLower.includes('risk') ||
      promptLower.includes('bottom') ||
      promptLower.includes('top') ||
      promptLower.includes('struggling') ||
      promptLower.includes('weak') ||
      promptLower.includes('alarming')
    ) {
      this.logger.log('--> Sub-intent detected: STUDENT RISK');
      const result = await this.studyAnalystAIService.detectStudentRisk(
        classId,
        originalPrompt,
        user.uid,
        user.role,
      );
      return { usecase: 'STUDENT_RISK', ...result };
    }

    //
    else if (
      promptLower.includes('trend') ||
      promptLower.includes('recommend') ||
      promptLower.includes('month') ||
      promptLower.includes('strategy') ||
      promptLower.includes('completion') ||
      promptLower.includes('advice')
    ) {
      this.logger.log('--> Sub-intent detected: TEACHING RECOMMENDATIONS');
      const result =
        await this.studyAnalystAIService.generateTeachingRecommendations(
          classId,
          originalPrompt,
          user.uid,
          user.role,
        );
      return { usecase: 'TEACHING_RECOMMENDATIONS', ...result };
    }

    // 3
    else {
      this.logger.log('--> Sub-intent detected: CLASS OVERVIEW');
      const result = await this.studyAnalystAIService.analyzeClass(
        classId,
        originalPrompt,
        user.uid,
        user.role,
      );
      return { usecase: 'CLASS_ANALYSIS', ...result };
    }
  }

  /**
   * USE CASE: GENERAL AI CHAT
   */
  private async handleGeneralChat(request: AiRequestDto, user: JwtPayload) {
    const result = await this.outerApiService.chat({
      prompt: request.text,
      role: user.role,
      caller: 'general',
      provider: 'groq',
    });
    return { usecase: 'GENERAL_CHAT', text: result.text };
  }

  /**
   * CONVERSATION & DIRECT CHAT
   */
  async directChat(
    request: AiRequestDto,
    user: JwtPayload,
  ): Promise<AiResponseDto> {
    const startTime = Date.now();
    let conversationId = request.conversationId;

    if (!conversationId) {
      const titleRes = await this.summarizationService.summarize(request.text, {
        minLength: 3,
        maxLength: 7,
      } as SummarizeOptions);
      const conv = await this.conversationService.createConversation({
        userId: user.uid,
        title: titleRes.summary || 'New Chat',
      });
      conversationId = conv.acid;
    }

    const userMsg = await this.conversationService.createMessage({
      conversationId,
      role: 'user',
      content: request.text,
    });

    const result = await this.outerApiService.chat({
      prompt: request.text,
      role: user.role,
      caller: 'direct',
      provider: 'groq',
      conversationId,
      userId: user.uid,
    });

    const assistantMsg = await this.conversationService.createMessage({
      conversationId,
      role: 'assistant',
      content: result.text,
      modelName: result.provider,
    });

    return {
      success: true,
      conversationId,
      messageId: assistantMsg.amid,
      role: 'assistant',
      text: result.text,
      metadata: { processingTime: Date.now() - startTime },
    } as AiResponseDto;
  }

  async summarize(text: string, provider?: 'gemini' | 'groq' | 'openai') {
    const start = Date.now();
    const res = await this.summarizationService.summarize(text, {
      provider,
      minLength: 3,
      maxLength: 7,
    } as SummarizeOptions);
    return { processTime: Date.now() - start, result: res };
  }
}
