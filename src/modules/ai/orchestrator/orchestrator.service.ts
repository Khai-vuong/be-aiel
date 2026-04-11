import { Injectable, Logger } from '@nestjs/common';
import { IntentClassifierService } from './intent-classifier-legacy.service';
import { PrismaService } from '../../../prisma.service';
import { AiRequestDto } from '../dtos/ai-request.dto';
import { AiResponseDto } from '../dtos/ai-response.dto';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { OuterApiService } from '../services/outer-api/outer-api.service';
import { StudyAnalystAIService } from '../services/study-analyst/study-analyst-ai.service';
import { QuizGenerationService } from '../services/Quiz-gen/quizGeneration.service';
import { ConversationService } from '../services/conversation.service';
import {
  SummarizationService,
  SummarizeOptions,
} from '../services/summarization.service';
import { RagOrchestratorService } from '../services/RAG/rag-orchestrator.service';
@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly intentClassifier: IntentClassifierService,
    private readonly prisma: PrismaService,
    private readonly outerApiService: OuterApiService,
    private readonly studyAnalystAIService: StudyAnalystAIService,
    private readonly quizGenerationService: QuizGenerationService,
    private readonly conversationService: ConversationService,
    private readonly summarizationService: SummarizationService,
    private readonly ragOrchestratorService: RagOrchestratorService,
  ) {}

  /**
   * MAIN AI PIPELINE
   */
  async processRequest(
    request: AiRequestDto,
    user: JwtPayload,
  ): Promise<AiResponseDto> {
    const startTime = Date.now();
    this.logger.log('AI request received');

    let conversationId = request.conversationId;

    // Step 1: create a new conversation or continue the existing one
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

    await this.conversationService.createMessage({
      conversationId,
      role: 'user',
      content: request.text,
    });

    const normalizedRequest: AiRequestDto = {
      ...request,
      conversationId,
    };

    // Step 2: classify intent
    const intent = await this.intentClassifier.classifyIntent(
      request.text,
      user.role,
    );

    this.logger.log(`Intent detected: ${intent}`);

    let response: any;

    // Step 3: route request to the right module
    switch (intent) {
      case 'data_analysis':
      case 'class_analysis':
      case 'teaching_recommendation':
        response = await this.handleClassAnalysis(normalizedRequest, user);
        break;

      case 'quiz_creation':
        response = await this.handleQuizCreation(normalizedRequest, user);
        break;

      case 'system_configuration':
      case 'rag':
      case 'rag_orchestrator':
        response = await this.handleRagChat(normalizedRequest, user);
        break;

      default:
        response = await this.handleGeneralChat(normalizedRequest, user);
        break;
    }

    // Step 4: persist assistant response to AI conversation
    const assistantContent = this.extractAssistantContent(response);
    const assistantMsg = await this.conversationService.createMessage({
      conversationId,
      role: 'assistant',
      content: assistantContent,
      modelName: this.extractModelName(response),
      metadata: {
        intent,
        usecase: response?.usecase,
      },
    });

    // Step 5: return standardized response DTO
    const provider = this.extractProvider(response, request.provider);
    const modelName = this.extractModelName(response) || provider;

    return {
      success: true,
      conversationId,
      messageId: assistantMsg.amid,
      text: assistantContent,
      metadata: {
        processingTime: Date.now() - startTime,
        provider,
        serviceType: this.resolveServiceType(intent),
      },
    };
  }

  private extractAssistantContent(response: any): string {
    if (!response) return '';
    if (typeof response?.text === 'string' && response.text.trim().length > 0) {
      return response.text;
    }
    if (
      typeof response?.response === 'string' &&
      response.response.trim().length > 0
    ) {
      return response.response;
    }

    try {
      return JSON.stringify(response);
    } catch {
      return String(response);
    }
  }

  private extractModelName(response: any): string | undefined {
    if (
      typeof response?.modelName === 'string' &&
      response.modelName.length > 0
    ) {
      return response.modelName;
    }
    if (typeof response?.provider === 'string' && response.provider.length > 0) {
      return response.provider;
    }
    return undefined;
  }

  private extractProvider(
    response: any,
    fallback?: string,
  ): string | undefined {
    if (typeof response?.provider === 'string' && response.provider.length > 0) {
      return response.provider;
    }
    return fallback;
  }

  private resolveServiceType(intent: string): 'Chat' | 'quizgen' | 'insight' {
    switch (intent) {
      case 'quiz_creation':
        return 'quizgen';
      case 'data_analysis':
      case 'class_analysis':
      case 'teaching_recommendation':
        return 'insight';
      default:
        return 'Chat';
    }
  }

  /**
   * USE CASE: DATA ANALYSIS DOMAIN
   * Trưởng phòng phân tích (Sub-router) chia việc cho 4 chuyên gia: Risk, Trend, Knowledge Gap, Overview
   */
  private async handleClassAnalysis(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('Routing to Study Analyst AI Domain...');
    const classId = request.metadata?.classId || 'default-class';

    const promptLower = (request.text || '').toLowerCase();
    const originalPrompt =
      request.text || 'Provide an overview of class performance.';

    // 1. CHUYÊN GIA RISK (Tìm học sinh giỏi/yếu)
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

    // 2. CHUYÊN GIA TREND (Phân tích xu hướng)
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

    // 3. CHUYÊN GIA KNOWLEDGE GAP (Phân tích lỗ hổng kiến thức) - MỚI THÊM
    else if (
      promptLower.includes('gap') ||
      promptLower.includes('skill') ||
      promptLower.includes('misconception') ||
      promptLower.includes('weakness') ||
      promptLower.includes('topic') ||
      promptLower.includes('blind spot') ||
      promptLower.includes('lỗ hổng')
    ) {
      this.logger.log('--> Sub-intent detected: KNOWLEDGE GAP ANALYSIS');
      const result = await this.studyAnalystAIService.analyzeKnowledgeGaps(
        classId,
        originalPrompt,
        user.uid,
        user.role,
      );
      return { usecase: 'KNOWLEDGE_GAP', ...result };
    }

    // 4. CHUYÊN GIA OVERVIEW (Tổng quan - Mặc định)
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

  private async handleQuizCreation(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('Routing to Quiz Generation module...');
    const result = await this.quizGenerationService.generateQuiz({
      prompt: request.text,
      role: user.role,
      provider: request.provider as 'gemini' | 'groq' | 'openai' | undefined,
      temperature: request.temperature,
      customSystemPrompt: request.customSystemPrompt,
    });

    return {
      usecase: 'QUIZ_CREATION',
      text: result.text,
      questions: result.questions,
      provider: result.provider,
      rawText: result.rawText,
    };
  }

  private async handleRagChat(request: AiRequestDto, user: JwtPayload) {
    this.logger.log('Routing to RAG Orchestrator module...');
    const result = await this.ragOrchestratorService.chat({
      aiRequest: request,
      user,
    });

    return {
      usecase: 'RAG_ORCHESTRATION',
      ...result,
    };
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

  async testRag(req: any, body: { text: string }) {
    const aiRequest: AiRequestDto = {
      text: body.text,
      metadata: req.body?.metadata,
      provider: req.body?.provider,
      conversationId: req.body?.conversationId,
      temperature: req.body?.temperature,
      customSystemPrompt: req.body?.customSystemPrompt,
    };

    return this.ragOrchestratorService.chat({
      aiRequest,
      user: req.user,
    });
  }
}
