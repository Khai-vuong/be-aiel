import { Injectable, Logger } from '@nestjs/common';
import { AIContext } from '../../dtos/ai-context.interface';

@Injectable()
export class AnomalyDetectorService {
  private readonly logger = new Logger(AnomalyDetectorService.name);

  async detectAnomalies(context: AIContext) {
    // TODO: Implement local anomaly detection logic
    this.logger.log('Detecting anomalies - to be implemented');
    return {
      critical: [],
      warnings: [],
      info: [],
    };
  }
}
