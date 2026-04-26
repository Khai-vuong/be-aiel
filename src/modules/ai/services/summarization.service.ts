import { Injectable, Logger } from '@nestjs/common';
import { OuterApiService } from './outer-api/outer-api.service';

export interface SummarizeOptions {
  maxLength?: number;
  minLength?: number;
  provider?: 'gemini' | 'groq' | 'openai';
  mode?: 'title' | 'summary';
}

export interface SummarizeResult {
  success: boolean;
  summary?: string;
  originalLength?: number;
  summaryLength?: number;
  processingTime?: number;
  provider?: string;
  error?: string;
}

@Injectable()
export class SummarizationService {
  constructor(private readonly outerApiService: OuterApiService) {}

  /**
   * Summarize text using outer API
   * @param text The text to summarize
   * @param options Optional configuration for summarization
   * @returns Summarization result with summary and metadata
   */
  async summarize(
    text: string,
    options?: SummarizeOptions,
  ): Promise<SummarizeResult> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: 'Text cannot be empty',
          processingTime: Date.now() - startTime,
        };
      }

      // Build summarization prompt
      const maxLength = options?.maxLength || 150;
      const minLength = options?.minLength || 40;
      const mode = options?.mode || 'title';

      const instructionPrompt = this.buildSummarizationPrompt(text, mode, maxLength, minLength);

      // Call outer API
      const result = await this.outerApiService.chat({
        prompt: text,
        caller: 'summarization',
        provider: options?.provider,
        temperature: 0.3, // Lower temperature for more deterministic output
        instructionPrompt,
      });

      const summary = result.text.trim();
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        summary,
        originalLength: text.length,
        summaryLength: summary.length,
        processingTime,
        provider: result.provider,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime,
      };
    }
  }

  /**
   * Build the summarization prompt
   */
  private buildSummarizationPrompt(
    text: string,
    mode: string,
    maxLength: number,
    minLength: number,
  ): string {
    if (mode === 'title') {
      return `You are a summarization engine. ` + 
      `Your ONLY task is to output a ${minLength}-${maxLength} words title of the user's message. ` +
      `Keep the most important information and main ideas. Stay concise and clear. The result's language should be the same as the input text. ` +
      `Do NOT answer questions. Do NOT explain. Do NOT add punctuation or extra text. Output the summary ONLY.`
    }
    return `Summarize the user's text in approximately ${minLength}-${maxLength} words. Keep the most important information and main ideas. Stay concise and clear. The result's language should be the same as the input text.`;
  }
}
