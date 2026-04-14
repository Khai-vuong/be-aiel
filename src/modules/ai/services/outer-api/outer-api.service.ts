import { Injectable, Logger } from '@nestjs/common';
import { ContextBuilderService } from '../../orchestrator/context-builder.service';
import { GeminiProvider } from '../../providers/gemini.provider';
import { GroqService } from '../../providers/groq.provider';
import { OpenAIService } from '../../providers/openai.provider';
import { ConversationService } from '../conversation.service';

export type OuterApiProvider = 'gemini' | 'groq' | 'openai';

export type OuterApiRequest = {
  prompt: string;
  role: string;
  provider?: OuterApiProvider;
  caller?: string;
  temperature?: number;
  customSystemPrompt?: string;
  onlyUseSystemPrompt?: boolean;

  conversationId?: string;
  userId?: string; // Required for conversation history fetch
  convLimit?: number;
  convOffset?: number;

  metadata?: any;
};

export type OuterApiResponse = {
  text: string;
  provider: OuterApiProvider;
  systemPrompt: string;
  attemptedProviders: OuterApiProvider[];
};

type ProviderHealth = {
  failureCount: number;
  disabledUntil: number;
  lastError: string | null;
};

@Injectable()
export class OuterApiService {
  private readonly logger = new Logger(OuterApiService.name);
  private readonly knownProviders: OuterApiProvider[] = [
    'gemini',
    'groq',
    'openai',
  ];
  private readonly providerHealth: Record<OuterApiProvider, ProviderHealth> = {
    gemini: { failureCount: 0, disabledUntil: 0, lastError: null },
    groq: { failureCount: 0, disabledUntil: 0, lastError: null },
    openai: { failureCount: 0, disabledUntil: 0, lastError: null },
  };
  private readonly baseCooldownMs = Number(
    process.env.OUTER_API_COOLDOWN_MS ?? 60000,
  );
  private readonly providerPriority = this.resolveProviderPriority();

  constructor(
    private readonly contextBuilderService: ContextBuilderService,
    private readonly geminiProvider: GeminiProvider,
    private readonly groqService: GroqService,
    private readonly openaiService: OpenAIService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   *
   * @param input
   * @returns OuterApiResponse
   * @summary Tries to get a response from the specified provider first (if any), then falls back to others based on priority and health status. Automatically disables providers that show transient error patterns for a cooldown period.
   */
  async chat(input: OuterApiRequest): Promise<OuterApiResponse> {
    const systemPrompt = this.contextBuilderService.buildSystemPrompt({
      role: input.role,
      caller: input.caller,
      customSystemPrompt: input.customSystemPrompt,
      onlyUseSystemPrompt: input.onlyUseSystemPrompt,
    });

    this.logger.log('='.repeat(80));
    this.logger.log('🤖 OUTER API CHAT REQUEST');
    this.logger.log(
      `Provider: ${input.provider || 'auto'} | Caller: ${input.caller || 'unknown'}`,
    );
    this.logger.log(
      `User Role: ${input.role} | ConversationId: ${input.conversationId || 'none'}`,
    );
    this.logger.log(`System Prompt: ${systemPrompt}`);
    this.logger.log(`Current User Prompt: ${input.prompt}`);

    // Fetch conversation history if conversationId is provided
    const conversationMessages = await this.fetchConversationHistory(input);

    const providerOrder = this.getProviderOrder(input.provider);
    const attemptedProviders: OuterApiProvider[] = [];
    const now = Date.now();
    let lastError: unknown = null;

    // Try providers in order of priority, skipping any that are currently disabled due to recent failures
    for (const provider of providerOrder) {
      const health = this.providerHealth[provider];
      if (health.disabledUntil > now) {
        continue;
      }

      attemptedProviders.push(provider);
      try {
        const text = await this.callProvider(
          provider,
          conversationMessages,
          input.prompt,
          {
            temperature: input.temperature,
            systemPrompt,
          },
        );
        this.markProviderSuccess(provider);

        return {
          text,
          provider,
          systemPrompt,
          attemptedProviders,
        };
      } catch (error) {
        lastError = error;
        this.markProviderFailure(provider, error);
      }
    }

    const message =
      lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(
      `OuterApi Error: all providers failed. Attempted=[${attemptedProviders.join(', ')}]. LastError=${message}`,
    );
  }

  private resolveProviderPriority(): OuterApiProvider[] {
    const fromEnv = (process.env.OUTER_API_PROVIDER_ORDER ?? '')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter((v): v is OuterApiProvider =>
        this.knownProviders.includes(v as OuterApiProvider),
      );

    if (fromEnv.length > 0) {
      return Array.from(new Set(fromEnv));
    }

    return ['gemini', 'groq', 'openai'];
  }

  private getProviderOrder(
    preferredProvider?: OuterApiProvider,
  ): OuterApiProvider[] {
    if (!preferredProvider) {
      return this.providerPriority;
    }

    if (!this.knownProviders.includes(preferredProvider)) {
      throw new Error(
        `OuterApi Error: unknown provider "${preferredProvider}"`,
      );
    }

    return [
      preferredProvider,
      ...this.providerPriority.filter((p) => p !== preferredProvider),
    ];
  }

  /**
   * Fetch conversation history from database
   * Return
   * [
   *  { role: 'user' | 'assistant' | 'system', content: string }
   * ]
   * @private
   */
  private async fetchConversationHistory(
    input: OuterApiRequest,
  ): Promise<Array<{ role: string; content: string }>> {
    if (!input.conversationId || !input.userId) {
      return [];
    }

    try {
      // Optimal settings: 20 messages (10 user-assistant pairs) for good context without token overflow
      const limit = input.convLimit ?? 20;

      const messages =
        await this.conversationService.findMessagesByConversation(
          input.conversationId,
          input.userId,
          limit,
        );

      // Convert database messages to provider format
      const formattedMessages = messages.map((msg) => ({
        role:
          msg.role === 'system'
            ? 'system'
            : msg.role === 'user'
              ? 'user'
              : 'assistant',
        content: msg.content,
      }));

      // Remove the last message if it's a user message (the current one being processed)
      // This happens because orchestrator saves the user message before calling AI
      let finalMessages = formattedMessages;
      if (formattedMessages.length > 0) {
        const lastMessage = formattedMessages[formattedMessages.length - 1];
        if (lastMessage.role === 'user') {
          // this.logger.log(`🗑️  Removing last user message from history (current message being processed)`);
          finalMessages = formattedMessages.slice(0, -1);
        }
      }

      this.logger.log(
        `📚 Conversation History Loaded: ${finalMessages.length} messages`,
      );
      if (finalMessages.length > 0) {
        finalMessages.forEach((msg, idx) => {
          const preview =
            msg.content.length > 100
              ? msg.content.substring(0, 100) + '...'
              : msg.content;
          console.log(`  [${idx + 1}] ${msg.role}: ${preview}`);
        });
      }

      // console.log("History Messages: ", finalMessages);
      return finalMessages;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch conversation history for ${input.conversationId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't fail the entire request if history fetch fails
      return [];
    }
  }

  private async callProvider(
    provider: OuterApiProvider,
    conversationHistory: Array<{ role: string; content: string }>,
    currentPrompt: string,
    settings: { temperature?: number; systemPrompt: string },
  ): Promise<string> {
    this.logger.log(`\n🔄 Calling Provider: ${provider.toUpperCase()}`);

    switch (provider) {
      case 'gemini': {
        // Gemini: Build conversation context as single prompt
        const contextPrompt = this.buildGeminiPrompt(
          conversationHistory,
          currentPrompt,
        );
        this.logger.log(`📝 Formatted Prompt (Gemini):`);
        this.logger.log(contextPrompt);

        const response = await this.geminiProvider.chat(
          contextPrompt,
          settings,
        );

        if (typeof response === 'string' && response.trim().length > 0) {
          this.logger.log(`✅ Response from ${provider}:`);
          this.logger.log(response);
          this.logger.log('='.repeat(80));
          return response;
        }
        throw new Error('Gemini Error: Empty response content.');
      }
      case 'groq': {
        // Groq: Use native messages array (need to update provider to accept messages)
        const fullPrompt = this.buildConversationPrompt(
          conversationHistory,
          currentPrompt,
        );
        this.logger.log(`📝 Formatted Prompt (Groq):`);
        this.logger.log(fullPrompt);

        const response = await this.groqService.chat(fullPrompt, settings);

        if (typeof response === 'string' && response.trim().length > 0) {
          this.logger.log(`✅ Response from ${provider}:`);
          this.logger.log(response);
          this.logger.log('='.repeat(80));
          return response;
        }
        throw new Error('Groq Error: Empty response content.');
      }
      case 'openai': {
        // OpenAI: Use native messages array (need to update provider to accept messages)
        const fullPrompt = this.buildConversationPrompt(
          conversationHistory,
          currentPrompt,
        );
        this.logger.log(`📝 Formatted Prompt (OpenAI):`);
        this.logger.log(fullPrompt);

        const response = await this.openaiService.chat(fullPrompt, settings);

        if (typeof response === 'string' && response.trim().length > 0) {
          this.logger.log(`✅ Response from ${provider}:`);
          this.logger.log(response);
          this.logger.log('='.repeat(80));
          return response;
        }
        throw new Error('OpenAI Error: Empty response content.');
      }
    }
  }

  /**
   * Build conversation context as formatted string for Gemini
   * @private
   */
  private buildGeminiPrompt(
    history: Array<{ role: string; content: string }>,
    currentPrompt: string,
  ): string {
    if (history.length === 0) {
      return currentPrompt;
    }

    const contextLines: string[] = [];
    console.log('History Messages: ', history);
    for (const msg of history) {
      if (msg.role === 'user') {
        contextLines.push(`User: ${msg.content}`);
      } else if (msg.role === 'assistant') {
        contextLines.push(`Assistant: ${msg.content}`);
      }
    }

    contextLines.push(`User: ${currentPrompt}`);
    console.log('Context Lines for Gemini Prompt: ', contextLines);

    return contextLines.join('\n\n');
  }

  /**
   * Build conversation context as formatted string for general providers
   * @private
   */
  private buildConversationPrompt(
    history: Array<{ role: string; content: string }>,
    currentPrompt: string,
  ): string {
    if (history.length === 0) {
      return currentPrompt;
    }

    const contextLines: string[] = ['Previous conversation:'];

    // Append history messages with role labels
    for (const msg of history) {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      contextLines.push(`${roleLabel}: ${msg.content}`);
    }

    // Append current prompt at the end
    contextLines.push('\nCurrent message:');
    contextLines.push(`User: ${currentPrompt}`);

    // console.log("History Messages: ", contextLines);

    return contextLines.join('\n'); //Turn array into string, separated by new lines
  }

  private markProviderSuccess(provider: OuterApiProvider) {
    this.providerHealth[provider] = {
      failureCount: 0,
      disabledUntil: 0,
      lastError: null,
    };
  }

  private markProviderFailure(provider: OuterApiProvider, error: unknown) {
    const current = this.providerHealth[provider];
    const failureCount = current.failureCount + 1;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTransient = this.isTransientProviderError(errorMessage);
    const cooldownMultiplier = Math.min(failureCount, 5);
    const disabledUntil = isTransient
      ? Date.now() + this.baseCooldownMs * cooldownMultiplier
      : 0;

    this.providerHealth[provider] = {
      failureCount,
      disabledUntil,
      lastError: errorMessage,
    };

    this.logger.warn(
      `Provider "${provider}" failed (#${failureCount}). transient=${isTransient}. disabledUntil=${disabledUntil || 0}. error=${errorMessage}`,
    );
  }

  private isTransientProviderError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
      normalized.includes('429') ||
      normalized.includes('rate limit') ||
      normalized.includes('quota') ||
      normalized.includes('timeout') ||
      normalized.includes('timed out') ||
      normalized.includes('503') ||
      normalized.includes('502') ||
      normalized.includes('service unavailable') ||
      normalized.includes('temporarily unavailable') ||
      normalized.includes('econnreset') ||
      normalized.includes('network')
    );
  }
}
