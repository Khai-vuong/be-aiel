import { Injectable, Logger } from '@nestjs/common';
import { ContextBuilderService } from '../../orchestrator/context-builder.service';
import { GeminiProvider } from '../../providers/gemini.provider';
import { GroqService } from '../../providers/groq.provider';
import { OpenAIService } from '../../providers/openai.provider';
import { HistoryMessage } from '../../providers/iProvider.interface';
export type OuterApiProvider = 'gemini' | 'groq' | 'openai';

export type OuterApiRequest = {
  prompt: string;
  provider?: OuterApiProvider;
  caller?: string;
  temperature?: number;
  instructionPrompt?: string;
  history?: HistoryMessage[]; // Optional conversation history to include in the prompt
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
  ) {}

  /**
   *
   * @param input
   * @returns OuterApiResponse
   * @summary Tries to get a response from the specified provider first (if any), then falls back to others based on priority and health status. Automatically disables providers that show transient error patterns for a cooldown period.
   */
  async chat(input: OuterApiRequest): Promise<OuterApiResponse> {
    const startTime = Date.now();

    const caller = input.caller || 'unknown';
    const provider = input.provider || 'auto';
    
    // Log sent request with system and user prompt previews    
    this.logger.log(`[${caller} - sent] Provider: ${provider}`);
    this.logger.log(`  [System Prompt] ${input.instructionPrompt ?? '(none)'}`);
    this.logger.log(`  [User Prompt] ${input.prompt ?? '(none)'}`);

    const providerOrder = this.getProviderOrder(input.provider);
    const attemptedProviders: OuterApiProvider[] = [];
    const now = Date.now();
    let lastError: unknown = null;
    for (const provider of providerOrder) {
      const health = this.providerHealth[provider];
      if (health.disabledUntil > now) {
        continue;
      }

      attemptedProviders.push(provider);
      try {
        const text = await this.callProvider(
          provider,
          input.prompt,
          {
            temperature: input.temperature,
            systemPrompt: input.instructionPrompt ?? '',
            history: input.history ?? [],
          },
        );
        this.markProviderSuccess(provider);
        const elapsed = Date.now() - startTime;
        
        // Log received response with content preview
        const responsePreview = text.length > 200
          ? text.substring(0, 200) + '...'
          : text;
        this.logger.log(`[${caller} - received] Success with ${provider} (${elapsed}ms)`);
        this.logger.log(`  Response: ${responsePreview}`);

        return {
          text,
          provider,
          systemPrompt: input.instructionPrompt ?? '',
          attemptedProviders,
        };
      } catch (error) {
        lastError = error;
        this.markProviderFailure(provider, error);
      }
    }

    const message =
      lastError instanceof Error ? lastError.message : String(lastError);
    const elapsed = Date.now() - startTime;
    this.logger.error(`[${caller} - error] Failed after ${elapsed}ms. Attempted: [${attemptedProviders.join(', ')}]`);
    this.logger.error(`  Error: ${message}`);
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

  private async callProvider(
    provider: OuterApiProvider,
    currentPrompt: string,
    settings: {
      temperature?: number;
      systemPrompt: string;
      history: HistoryMessage[];
    },
  ): Promise<string> {
    switch (provider) {
      case 'gemini': {
        const response = await this.geminiProvider.chat(currentPrompt, settings);

        if (typeof response === 'string' && response.trim().length > 0) {
          return response;
        }
        throw new Error('Gemini Error: Empty response content.');
      }
      case 'groq': {
        const response = await this.groqService.chat(currentPrompt, settings);

        if (typeof response === 'string' && response.trim().length > 0) {
          return response;
        }
        throw new Error('Groq Error: Empty response content.');
      }
      case 'openai': {
        const response = await this.openaiService.chat(currentPrompt, settings);

        if (typeof response === 'string' && response.trim().length > 0) {
          return response;
        }
        throw new Error('OpenAI Error: Empty response content.');
      }
    }
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

    this.logger.warn(`[provider-retry] Failure #${failureCount}: ${provider}`);
    this.logger.warn(`  Error: ${errorMessage}`);
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
