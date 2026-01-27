import { Injectable, Logger } from '@nestjs/common';
import { AIProviderConfig } from '../models/ai-context.interface';

@Injectable()
export class LocalLlmProvider {
  private readonly logger = new Logger(LocalLlmProvider.name);

  async generateCompletion(prompt: string, config?: AIProviderConfig) {
    // TODO: Implement local LLM integration (Ollama/LM Studio)
    this.logger.log('Local LLM completion - to be implemented');
    throw new Error('Not implemented');
  }
}
