import { Injectable } from '@nestjs/common';
import { AiResponseDto } from '../models/ai-response.dto';

@Injectable()
export class ResponseAggregatorService {
  format(response: any, metadata: any = {}): AiResponseDto {
    // TODO: Implement response formatting
    return {
      success: true,
      data: response,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };
  }

  formatError(error: Error, metadata: any = {}): AiResponseDto {
    return {
      success: false,
      error: {
        message: error.message,
        code: 'AI_PROCESSING_ERROR',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };
  }
}
