import { Injectable, Logger } from '@nestjs/common';
import { AIContext } from '../../dtos/ai-context.interface';

@Injectable()
export class TutorAiService {
  private readonly logger = new Logger(TutorAiService.name);

  async process(message: string, context: AIContext) {
    // TODO: Implement AI tutor logic
    this.logger.log('Processing tutor request - to be implemented');
    throw new Error('Not implemented');
  }
}
