import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { JwtPayload } from 'src/modules/users/jwt.strategy';
import { AiRequestDto } from '../dtos/ai-request.dto';
import { AiResponseDto } from '../dtos/ai-response.dto';
import { ConversationService } from '../services/conversation.service';
import { OuterApiService } from '../services/outer-api/outer-api.service';
// import { RagOrchestratorService } from '../services/RAG/rag-orchestrator.service';
import { RagReactService } from '../services/RAG/rag_react';
import { ContextBuilderService } from './context-builder.service';
import {
  SummarizationService,
  SummarizeOptions,
} from '../services/summarization.service';
import {
  IntentClassifierService,
  type ExecutionMode,
} from './intent-classifier.service';
import { LanguageDetectionService } from '../utils/language-detect.service';

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

type EnrichedAiRequest = AiRequestDto & {
  history?: Array<{ role: string; content: string }>;
  resolvedSystemPrompt?: string;
};

@Injectable()
export class RefactoredOrchestratorService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly summarizationService: SummarizationService,
    private readonly outerApiService: OuterApiService,
    private readonly contextBuilderService: ContextBuilderService,
    // private readonly ragOrchestratorService: RagOrchestratorService,
    private readonly ragReactService: RagReactService,
    private readonly intentClassifierService: IntentClassifierService,
    private readonly languageDetectionService: LanguageDetectionService,
  ) {}

  /**
   * MAIN AI PIPELINE
   */
  async processRequest(
    request: AiRequestDto,
    user: JwtPayload,
  ): Promise<AiResponseDto> {
    const startTime = Date.now();

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

    // Step 2: Fetch history (if have)
    const history = await this.conversationService.getConversationHistory(
      conversationId,
      user.uid,
      20,
      0,
    );
    const sanitizedHistory = this.removeTrailingCurrentUserPrompt(
      history,
      request.text,
    );

    await this.conversationService.createMessage({
      conversationId,
      role: 'user',
      content: request.text,
    });

    const requestWithConv: EnrichedAiRequest = {
      ...request,
      conversationId,
    };

    // Step 2: classify intent
    const mode = await this.intentClassifierService.resolveExecutionMode(
      requestWithConv,
      user,
    );
    this.enforceFeatureAccess(mode, user); //Giống Guard 

    // const caller = this.resolveCallerByMode(mode);


    const systemInstruction = this.contextBuilderService.buildSystemPrompt({
      role: user.role,
      customSystemPrompt: request.instructionPrompt,
      onlyUseSystemPrompt: false,
    });

    requestWithConv.history = sanitizedHistory;
    requestWithConv.resolvedSystemPrompt = systemInstruction;

    let response: RoutedResponse;

    // Step 3: route request to the right module
    response = await this.dispatchByMode(requestWithConv, user, mode);

    // Step 4: persist assistant response to AI conversation
    const assistantContent = this.extractAssistantContent(response);
    const assistantMsg = await this.conversationService.createMessage({
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
        serviceType: this.resolveServiceType(mode),
      },
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

    const history = await this.conversationService.getConversationHistory(
      conversationId,
      user.uid,
      20,
      0,
    );
    const sanitizedHistory = this.removeTrailingCurrentUserPrompt(
      history,
      request.text,
    );
    const systemInstruction = this.contextBuilderService.buildSystemPrompt({
      role: user.role,
      customSystemPrompt: request.instructionPrompt,
      onlyUseSystemPrompt: false,
    });

    const result = await this.outerApiService.chat({
      prompt: request.text,
      caller: 'direct',
      provider: 'groq',
      instructionPrompt: systemInstruction,
      history: sanitizedHistory,
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
      instructionPrompt: req.body?.customSystemPrompt,
    };

    return this.ragReactService.chat({
      aiRequest,
      user: req.user,
    });
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
    request: EnrichedAiRequest,
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
    request: EnrichedAiRequest,
    user: JwtPayload,
  ): Promise<RoutedResponse> {
    const result = await this.outerApiService.chat({
      prompt: request.text,
      caller: 'general',
      provider: (request.provider as 'gemini' | 'groq' | 'openai') || 'groq',
      temperature: request.temperature,
      instructionPrompt:
        request.resolvedSystemPrompt ?? request.instructionPrompt,
      history: request.history ?? [],
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
    request: EnrichedAiRequest,
    user: JwtPayload,
  ): Promise<RoutedResponse> {

    /**
     * Vào flow này thì mặc định là từ chatpage hoặc aichatsidebar.
     * Ta chỉ cần đưa tin nhắn redirect họ qua trang createQuiz.
     * 
     * Nếu được gửi từ CreateQuiz, nó sẽ trực tiếp dùng QuizGenService mà không đi qua đây
     */

    const sendFrom = request.metadata?.sendFrom?.toLowerCase();

    if (sendFrom === 'chatpage' || sendFrom === 'aichatsidebar') {
      if (this.languageDetectionService.detect(request.text) === 'vie') {
        return {
          usecase: 'QUIZ_ASSISTANT',
          mode: 'quiz_assistant',
          uiTarget: 'quiz-builder',
          module: 'QuizGen',
          text: 'Có vẻ bạn muốn tạo quiz. Bạn có thể vào Lớp học của tôi -> Lớp mà bạn muốn tạo quiz -> Quizzes -> Tạo bài thi mới. Tôi sẽ ở đó hỗ trợ bạn',
          provider: 'openai',
          attemptedProviders: 'openai',
        };
      }

      else {
        return {
          usecase: 'QUIZ_ASSISTANT',
          mode: 'quiz_assistant',
          uiTarget: 'quiz-builder',
          module: 'QuizGen',
          text: 'You seem to want to create a quiz. You can go to My Classes -> The class you want to create the quiz for -> Quizzes -> Create new quiz. I will be there to assist you.',
          provider: 'openai',
          attemptedProviders: 'openai',
        };
      }
    }

    const instructionPrompt = 
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

    const result = await this.outerApiService.chat({
      prompt: request.text,
      caller: 'quiz-generator',
      provider: (request.provider as 'gemini' | 'groq' | 'openai') || 'groq',
      temperature: request.temperature,
      instructionPrompt,
        
      history: request.history ?? [],
    });


    //Đây sẽ trả về kết quả để đưa lên UI. Đây là kết quả raw
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
    const result = await this.ragReactService.chat({
      aiRequest: request,
      user,
    });

    // Old orchestrator path kept for reference during PoC validation.
    // const result = await this.ragOrchestratorService.chat({
    //   aiRequest: request,
    //   user,
    // });

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
    if (
      typeof response?.modelName === 'string' &&
      response.modelName.trim().length > 0
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

  private resolveServiceType(mode: ExecutionMode): 'Chat' | 'quizgen' | 'insight' {
    switch (mode) {
      case 'quiz_assistant':
        return 'quizgen';
      case 'insight':
        return 'insight';
      case 'chat':
      default:
        return 'Chat';
    }
  }

  private normalizeRole(role?: string): string {
    return String(role ?? '')
      .trim()
      .toLowerCase();
  }

  private resolveCallerByMode(mode: ExecutionMode): string {
    switch (mode) {
      case 'quiz_assistant':
        return 'quiz-generator';
      case 'insight':
        return 'data-analyst';
      case 'chat':
      default:
        return 'general';
    }
  }

  private removeTrailingCurrentUserPrompt(
    history: Array<{ role: string; content: string }>,
    currentPrompt: string,
  ): Array<{ role: string; content: string }> {
    if (history.length === 0) {
      return history;
    }

    const last = history[history.length - 1];
    if (
      last.role === 'user' &&
      last.content.trim() === String(currentPrompt).trim()
    ) {
      return history.slice(0, -1);
    }

    return history;
  }
}
