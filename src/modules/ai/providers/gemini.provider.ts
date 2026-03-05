import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { AiChatSetting, iProvider } from './iProvider.interface';

@Injectable()
export class GeminiProvider implements iProvider, OnModuleInit {
  private readonly logger = new Logger(GeminiProvider.name);
  private apiKey = '';
  private ai: GoogleGenAI;
  private model = process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash';
  private maxOutputTokens = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 1024);

  onModuleInit() {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY is missing. Gemini chat calls will fail.');
      return;
    }

    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
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
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          temperature,
          maxOutputTokens: this.maxOutputTokens,
          systemInstruction: systemPrompt,
        },
      });

      const content = response.text?.trim();
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
