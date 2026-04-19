import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { EntryController } from './entry.controller';
import { EntryService } from './entry.service';

@Module({
  imports: [AiModule],
  controllers: [EntryController],
  providers: [EntryService],
})
export class EntryModule {}
