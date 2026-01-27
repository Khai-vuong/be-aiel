import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MaterialExplainerService {
  private readonly logger = new Logger(MaterialExplainerService.name);

  async explain(topic: string, context: any) {
    // TODO: Implement material explanation using API
    this.logger.log('Explaining material - to be implemented');
    return 'Explanation to be implemented';
  }
}
