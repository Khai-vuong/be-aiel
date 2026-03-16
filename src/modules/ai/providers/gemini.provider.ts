import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiChatSetting, iProvider } from './iProvider.interface';

@Injectable()
export class GeminiProvider implements iProvider, OnModuleInit {
  private readonly logger = new Logger(GeminiProvider.name);
  private apiKey = '';
  private ai: GoogleGenerativeAI;
  private model = process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash';
  private maxOutputTokens = Number(
    process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 1024,
  );

  onModuleInit() {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
    if (!this.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is missing. Gemini chat calls will fail.',
      );
      return;
    }

    this.ai = new GoogleGenerativeAI(this.apiKey);
  }

  async chat(prompt: string, setting?: AiChatSetting): Promise<string> {
    if (!this.apiKey || !this.ai) {
      throw new Error('Gemini Error: GEMINI_API_KEY is not configured.');
    }

    const temperature = setting?.temperature ?? 0.7;
    const systemPrompt =
      setting?.systemPrompt ??
      'You are a helpful assistant for an e-learning platform.';

    try {
      const model = this.ai.getGenerativeModel({ model: this.model });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens: this.maxOutputTokens,
        },
        systemInstruction: systemPrompt,
      });

      const response = await result.response;
      const content = response.text().trim();
      if (!content) {
        throw new Error('Gemini returned empty content');
      }

      return content;
    } catch (error: any) {
      const message = error?.message ?? String(error);
      throw new Error(`Gemini Error: ${message}`);
    }
  }
}
