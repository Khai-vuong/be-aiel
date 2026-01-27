import { Injectable, Logger } from '@nestjs/common';
import { AIServiceType } from '../models/ai-context.interface';

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);

    /**
     * 
     * @param message 
     * @param userRole 
     * @returns AIServiceType
     */
    
  async classify(message: string, userRole: string): Promise<AIServiceType> {
    // TODO: Implement intent classification logic
    this.logger.log('Classifying intent - to be implemented');
    return 'TUTOR';
  }
}
