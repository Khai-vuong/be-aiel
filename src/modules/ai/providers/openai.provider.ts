// src/openai/openai.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService implements OnModuleInit {
  private openai: OpenAI;

  onModuleInit() {
    // Khởi tạo instance OpenAI khi module được load
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Đảm bảo bạn đã có biến này trong file .env
    });
  }

  async chat(prompt: string) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Hoặc 'gpt-3.5-turbo'
        messages: [
          { role: 'user', content: prompt },
          { role: 'system', content: 'You are a helpful assistant for an e-learning platform.' }
        ],
        temperature: 0.7,
      });

      return response.choices[0].message.content;
    } catch (error : any) {
      // Xử lý lỗi (hết hạn quota, sai key, v.v.)
      throw new Error(`OpenAI Error: ${error}`);
    }
  }
}