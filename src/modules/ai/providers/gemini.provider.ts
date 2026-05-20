import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiChatSetting, iProvider } from './iProvider.interface';
import axios from 'axios';
import * as officeParser from 'officeparser';

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

  /**
   * Tải file từ URL về dưới dạng Buffer
   */
  private async downloadFile(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Không thể tải file từ URL: ${url}`, errorMessage);
      throw new Error(`Lỗi tải file tài liệu: ${errorMessage}`);
    }
  }

  /**
   * 
   * @param prompt: Content to send
   * @param setting: Temperature?, conversation history?, system prompt?, file context?
   * @description
   * Send content will look like this:
   * [
   *   { role: 'user', parts: [{ text: 'What is the capital of France?' }] }, //History messages (if any)
   *   { role: 'model', parts: [{ text: 'The capital of France is Paris.' }] },
   *   { role: 'user', parts: [{ text: 'What is the largest city in France?' }, { inlineData: { data: base64, mimeType: 'application/pdf' } }] } // current prompt with file
   * ]
   * @returns 
   */
  async chat(prompt: string, setting?: AiChatSetting): Promise<string> {
    if (!this.apiKey || !this.ai) {
      throw new Error('Gemini Error: GEMINI_API_KEY is not configured.');
    }

    const { temperature = 0.8, systemPrompt, history = [], fileContext } = setting ?? {};

    try {
      const model = this.ai.getGenerativeModel({ model: this.model });

      // Build contents array with history if provided
      const contents: any[] = history.map((msg) => ({
        role: msg.role === 'assistant' || msg.role === 'system' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // Create parts array for current user message
      const currentUserParts: any[] = [];

      // Process file context if provided
      if (fileContext) {
        const { url, mime_type, filename } = fileContext;
        const fileBuffer = await this.downloadFile(url);

        if (mime_type === 'application/pdf') {
          // For PDF: Send directly as base64 inline data to Gemini (Native Multimodal)
          currentUserParts.push({
            inlineData: {
              data: fileBuffer.toString('base64'),
              mimeType: mime_type,
            },
          });
          this.logger.log(`Đã đính kèm file PDF trực tiếp: ${filename}`);
        } else if (
          mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || // docx
          mime_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'   // pptx
        ) {
          // For DOCX / PPTX: Extract text and add to prompt
          const extractedText = await officeParser.parseOffice(fileBuffer);
          currentUserParts.push({
            text: `[Nội dung từ file tài liệu bài học: ${filename}]\n${extractedText}\n[Hết nội dung file]\n\n`,
          });
          this.logger.log(`Đã rút trích text từ file Office: ${filename}`);
        }
      }

      // Add current user prompt
      currentUserParts.push({ text: prompt });

      // Add current user message to contents
      contents.push({
        role: 'user',
        parts: currentUserParts,
      });

      const result = await model.generateContent({
        contents,
        generationConfig: {
          temperature,
          // maxOutputTokens: this.maxOutputTokens,
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
  }}
