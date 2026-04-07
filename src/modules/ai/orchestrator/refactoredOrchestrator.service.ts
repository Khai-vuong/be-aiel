import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { parseJsonStrings } from 'src/common/utils/parseJSON';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { AiRequestDto } from '../dtos/ai-request.dto';
import { AiResponseDto } from '../dtos/ai-response.dto';
import { ConversationService } from '../services/conversation.service';
import { OuterApiService } from '../services/outer-api/outer-api.service';
import { RagOrchestratorService } from '../services/RAG/rag-orchestrator.service';
import {
  SummarizationService,
  SummarizeOptions,
} from '../services/summarization.service';

type ExecutionMode = 'chat' | 'quiz_assistant' | 'insight';

type RoutedResponse = {
  usecase: string;
  mode: ExecutionMode;
  uiTarget?: string;
  module?: string;
  text?: string;
  response?: string;
  provider?: string;
  [key: string]: any;
};

@Injectable()
export class RefactoredOrchestratorService {
  private readonly logger = new Logger(RefactoredOrchestratorService.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly summarizationService: SummarizationService,
    private readonly outerApiService: OuterApiService,
    private readonly ragOrchestratorService: RagOrchestratorService,
  ) {}

  /**
   * MAIN AI PIPELINE
   */
  async processRequest(request: AiRequestDto, user: JwtPayload) {
    const startTime = Date.now();
    this.logger.log('AI request received by refactored orchestrator');

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
    const mode = await this.resolveExecutionMode(normalizedRequest, user);
    this.enforceFeatureAccess(mode, user); //Giống Guard 

    this.logger.log(`Execution mode resolved: ${mode}`);

    let response: RoutedResponse;

    // Step 3: route request to the right module
    response = await this.dispatchByMode(normalizedRequest, user, mode);

    // Step 4: persist assistant response to AI conversation
    const assistantContent = this.extractAssistantContent(response);
    await this.conversationService.createMessage({
      conversationId,
      role: 'assistant',
      content: assistantContent,
      modelName: this.extractModelName(response),
      metadata: {
        mode,
        usecase: response?.usecase,
        module: response?.module,
        uiTarget: response?.uiTarget,
        processingTime: Date.now() - startTime,
      },
    });

    // Step 5: return business response as usual
    return {
      ...response,
      processingTime: Date.now() - startTime,
    };
  }

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

    await this.conversationService.createMessage({
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
      metadata: {
        mode: 'chat',
      },
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

  private async resolveExecutionMode(
    request: AiRequestDto,
    user: JwtPayload,
  ): Promise<ExecutionMode> {
    if (user.role === 'Student') {
      return 'chat';
    }

    const routerSystemPrompt = [
      'You are a routing classifier for the backend AI orchestrator. Return exactly one string that best fits the following guidelines.',
      'Available modes:',
      'quiz_gen: if the user is asking for help generating quiz questions, structuring quizzes, or anything directly related to quiz creation.',
      'insight: analytics, reports, trends, recommendations, logs, enrollments, or answers that require internal platform data.',
      'chat: Not quiz_gen or insight, just general AI chat.',
    ].join('\n');

    try {
      const result = await this.outerApiService.chat({
        prompt: request.text,
        role: user.role,
        caller: 'coarse-router',
        provider: (request.provider as 'gemini' | 'groq' | 'openai') || 'groq',
        temperature: 0.1,
        customSystemPrompt: routerSystemPrompt,
        onlyUseSystemPrompt: true
      });

      switch (result?.text?.toLowerCase().trim()) {
        case 'quiz_assistant':
          return 'quiz_assistant';
        case 'insight':
          return 'insight';
        case 'chat':
        default:
          return 'chat';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Coarse routing failed, fallback to chat: ${message}`);
      return 'chat';
    }
  }

  private enforceFeatureAccess(mode: ExecutionMode, user: JwtPayload): void {
    const role = this.normalizeRole(user.role);

    if (mode === 'chat') {
      return;
    }

    if (role === 'student') {
      throw new ForbiddenException(
        'Students can only access the general AI chat mode.',
      );
    }

    if (role !== 'lecturer' && role !== 'admin') {
      throw new ForbiddenException(
        `Role "${user.role}" is not allowed to access ${mode}.`,
      );
    }
  }

  private async dispatchByMode(
    request: AiRequestDto,
    user: JwtPayload,
    mode: ExecutionMode,
  ): Promise<RoutedResponse> {
    switch (mode) {
      case 'quiz_assistant':
        return this.handleQuizAssistant(request, user);
      case 'insight':
        return this.handleInsight(request, user);
      case 'chat':
      default:
        return this.handleChat(request, user);
    }
  }

  private async handleChat(
    request: AiRequestDto,
    user: JwtPayload,
  ): Promise<RoutedResponse> {
    const result = await this.outerApiService.chat({
      prompt: request.text,
      role: user.role,
      caller: 'general',
      provider: (request.provider as 'gemini' | 'groq' | 'openai') || 'groq',
      temperature: request.temperature,
      customSystemPrompt: request.customSystemPrompt,
      conversationId: request.conversationId,
      userId: user.uid,
    });

    return {
      usecase: 'GENERAL_CHAT',
      mode: 'chat',
      uiTarget: 'chat',
      module: 'OuterAPI',
      text: result.text,
      provider: result.provider,
      attemptedProviders: result.attemptedProviders,
    };
  }

  private async handleQuizAssistant(
    request: AiRequestDto,
    user: JwtPayload,
  ): Promise<RoutedResponse> {
    const result = await this.outerApiService.chat({
      prompt: request.text,
      role: user.role,
      caller: 'quiz-generator',
      provider: (request.provider as 'gemini' | 'groq' | 'openai') || 'groq',
      temperature: request.temperature,
      customSystemPrompt: request.customSystemPrompt,
      conversationId: request.conversationId,
      userId: user.uid,
    });

    return {
      usecase: 'QUIZ_ASSISTANT',
      mode: 'quiz_assistant',
      uiTarget: 'quiz-builder',
      module: 'QuizGen',
      text: result.text,
      provider: result.provider,
      attemptedProviders: result.attemptedProviders,
    };
  }

  private async handleInsight(
    request: AiRequestDto,
    user: JwtPayload,
  ): Promise<RoutedResponse> {
    const result = await this.ragOrchestratorService.chat({
      aiRequest: request,
      user,
    });

    return {
      usecase: 'INSIGHT_RAG',
      mode: 'insight',
      uiTarget: 'insight',
      module: 'InsightRAG',
      ...result,
      text:
        typeof result?.response === 'string'
          ? result.response
          : this.extractAssistantContent(result),
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
    if (typeof response?.provider === 'string' && response.provider.length > 0) {
      return response.provider;
    }
    return undefined;
  }

  private normalizeRole(role?: string): string {
    return String(role ?? '')
      .trim()
      .toLowerCase();
  }
}
