import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AiChatSetting, iProvider } from './iProvider.interface';

@Injectable()
export class OpenAIService implements OnModuleInit, iProvider {
  private openai: OpenAI;

  // Prefer an explicit OpenAI model. Fall back to shared CHATBOT_MODEL for compatibility.
  private model =
    process.env.OPENAI_CHAT_MODEL ??
    process.env.CHATBOT_MODEL ??
    'gpt-4o-mini';
  private maxCompletionTokens = Number(
    process.env.OPENAI_MAX_COMPLETION_TOKENS ??
      process.env.CHATBOT_MAX_TOKENS ??
      1024,
  );

  onModuleInit() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }


  /**
   * 
   * @param prompt 
   * @param setting: Temperature?, conversation history?, system prompt? 
   * @description
   * The messages array sent to OpenAI will be constructed as follows:
   * [
   *   { role: 'system', content: systemPrompt }, // System prompt (if any)
   *   { role: 'user', content: "what is the capital of France?" } // History messages (if any)
   *   { role: 'assistant', content: "The capital of France is Paris." },
   *   { role: 'user', content: "What is the largest city in France?" } // current prompt
   * ]
   * @returns
   */
  async chat(
    prompt: string,
    setting?: AiChatSetting,
  ): Promise<string> {
    try {
      const { temperature = 0.8, systemPrompt, history = [] } = setting ?? {};

      const messages: ChatCompletionMessageParam[] = [
        /// System prompt luôn đứng đầu nếu có
        ...(systemPrompt
          ? [{ role: 'system' as const, content: systemPrompt }]
          : []),

        /// History (role "user" / "assistant" / "system" — history nếu có)
        ...history.map((msg) => ({
          role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),

        /// Tin nhắn hiện tại
        { role: 'user' as const, content: prompt },
      ];

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature,
        // max_completion_tokens: this.maxCompletionTokens,
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
