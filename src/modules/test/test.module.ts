import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { TestService } from './test.service';
import { PrismaService } from 'src/prisma.service';
import { AiModule } from '../ai/ai.module';
import { GeminiProvider } from '../ai/providers/gemini.provider';

@Module({
  imports: [AiModule,],
  controllers: [TestController],
  providers: [TestService, PrismaService, GeminiProvider]
})
export class TestModule {}
