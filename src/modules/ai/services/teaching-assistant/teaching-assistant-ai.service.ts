import { Injectable, Logger } from '@nestjs/common';
import { AIContext } from '../../models/ai-context.interface';

@Injectable()
export class TeachingAssistantAiService {
  private readonly logger = new Logger(TeachingAssistantAiService.name);

  async process(message: string, context: AIContext) {
    // TODO: Implement teaching assistant AI logic
    this.logger.log('Processing teaching assistant request - to be implemented');
    throw new Error('Not implemented');
  }
}
