import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { IntentClassifierService } from './orchestrator/intent-classifier.service';
import { ContextBuilderService } from './orchestrator/context-builder.service';
import { StudyAnalystAIService } from './services/study-analyst/study-analyst-ai.service';
import { PerformanceCalculatorService } from './services/study-analyst/performance-calculator.service';
import { InsightGeneratorService } from './services/study-analyst/insight-generator.service';
import { ReportBuilderService } from './services/study-analyst/report-builder.service';

import { ConversationService } from './services/conversation.service';
import { OuterApiService } from './services/outer-api/outer-api.service';
import { SummarizationService } from './services/summarization.service';
import { QuizGenerationService } from './services/Quiz-gen/quizGeneration.service';
import { RagOrchestratorService } from './services/RAG/rag-orchestrator.service';
import { RagPlannerService } from './services/RAG/rag-planner.service';
import { RagPlanExecuterService } from './services/RAG/rag-plan-executer.service';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIService } from './providers/openai.provider';
import { GroqService } from './providers/groq.provider';

import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [AiController],
  providers: [
    PrismaService,
    // Orchestrator
    OrchestratorService,
    IntentClassifierService,
    ContextBuilderService,

    // Study Analyst
    StudyAnalystAIService,
    PerformanceCalculatorService,
    InsightGeneratorService,
    ReportBuilderService,

    // Conversation Management
    ConversationService,
    OuterApiService,
    SummarizationService,
    QuizGenerationService,
    RagPlannerService,
    RagPlanExecuterService,
    RagOrchestratorService,
    // Providers
    GeminiProvider,
    OpenAIService,
    GroqService,
  ],
  exports: [
    OrchestratorService,
    StudyAnalystAIService,
    ConversationService,
    OuterApiService,
    QuizGenerationService,
    RagOrchestratorService,
  ],
})
export class AiModule {}
