import { Injectable, Logger } from '@nestjs/common';
import { AIContext } from '../../models/ai-context.interface';

@Injectable()
export class SystemControlAiService {
  private readonly logger = new Logger(SystemControlAiService.name);

  async process(message: string, context: AIContext) {
    // TODO: Implement system control AI logic
    this.logger.log('Processing system control request - to be implemented');
    throw new Error('Not implemented');
  }
}
