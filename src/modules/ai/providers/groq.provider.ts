import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AiChatSetting, iProvider } from './iProvider.interface';

type GroqMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

@Injectable()
export class GroqService implements OnModuleInit, iProvider {
  private readonly logger = new Logger(GroqService.name);
  private readonly endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  private apiKey = '';

  private model = process.env.GROQ_CHAT_MODEL ?? 'llama-3.3-70b-versatile';
  private maxCompletionTokens = Number(
    process.env.GROQ_MAX_COMPLETION_TOKENS ?? 1024,
  );

  onModuleInit() {
    this.apiKey = process.env.GROQ_API_KEY ?? '';
    if (!this.apiKey) {
      this.logger.warn('GROQ_API_KEY is missing. Groq chat calls will fail.');
    }
  }

  async chat(
    prompt: string,
    setting?: AiChatSetting,
  ): Promise<string> {
    // Setup and validation
    if (!this.apiKey) {
      throw new Error('Groq Error: GROQ_API_KEY is not configured.');
    }

    const temperature = setting?.temperature ?? 0.7;
    const systemPrompt =
      setting?.systemPrompt ??
      'You are a helpful assistant for an e-learning platform.';

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];


    // Fetching response from Groq API
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_completion_tokens: this.maxCompletionTokens,
      }),
    });

    const data = (await response.json()) as GroqChatResponse;
    if (!response.ok) {
      const errorMessage = data?.error?.message ?? 'Unknown Groq API error';
      throw new Error(`Groq Error (${response.status}): ${errorMessage}`);
    }

    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Groq Error: Empty response content.');
    }

    return content;
  }
}
