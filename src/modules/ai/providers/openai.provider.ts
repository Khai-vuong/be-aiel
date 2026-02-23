import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import { AiChatSetting, iProvider } from './iProvider.interface';

@Injectable()
export class OpenAIService implements OnModuleInit, iProvider {
  private openai: OpenAI;

  private model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini';
  private maxCompletionTokens = Number(
    process.env.OPENAI_MAX_COMPLETION_TOKENS ?? 1024,
  );

  onModuleInit() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async chat(
    prompt: string,
    setting?: AiChatSetting,
  ): Promise<string> {
    try {
      const temperature = setting?.temperature ?? 0.7;
      const systemPrompt =
        setting?.systemPrompt ??
        'You are a helpful assistant for an e-learning platform.';

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_completion_tokens: this.maxCompletionTokens,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('OpenAI returned empty content');
      }
      return content;
    } catch (error: any) {
      const message = error?.message ?? String(error);
      throw new Error(`OpenAI Error: ${message}`);
    }
  }
}
