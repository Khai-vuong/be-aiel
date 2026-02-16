import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { IntentClassifierService } from './orchestrator/intent-classifier.service';
import { ContextBuilderService } from './orchestrator/context-builder.service';
import { ResponseAggregatorService } from './orchestrator/response-aggregator.service';
import { SystemControlAiService } from './services/system-control/system-control-ai.service';
import { AnomalyDetectorService } from './services/system-control/anomaly-detector.service';
import { TrafficAnalyzerService } from './services/system-control/traffic-analyzer.service';
import { HealthMonitorService } from './services/system-control/health-monitor.service';
import { StudyAnalystAiService } from './services/study-analyst/study-analyst-ai.service';
import { PerformanceCalculatorService } from './services/study-analyst/performance-calculator.service';
import { InsightGeneratorService } from './services/study-analyst/insight-generator.service';
import { ReportBuilderService } from './services/study-analyst/report-builder.service';
import { TutorAiService } from './services/tutor/tutor-ai.service';
import { FaqEngineService } from './services/tutor/faq-engine.service';
import { MaterialExplainerService } from './services/tutor/material-explainer.service';
import { QuizSuggesterService } from './services/tutor/quiz-suggester.service';
import { TeachingAssistantAiService } from './services/teaching-assistant/teaching-assistant-ai.service';
import { QuizGeneratorService } from './services/teaching-assistant/quiz-generator.service';
import { ContentGeneratorService } from './services/teaching-assistant/content-generator.service';
import { ContentSummarizerService } from './services/teaching-assistant/content-summarizer.service';
import { OpenAIService } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { LocalLlmProvider } from './providers/local-llm.provider';
import { EmbeddingProvider } from './providers/embedding.provider';
import { VectorStoreService } from './utils/vector-store.service';
import { CacheService } from './utils/cache.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [AiController],
  providers: [
    PrismaService,
    // Orchestrator
    OrchestratorService,
    IntentClassifierService,
    ContextBuilderService,
    ResponseAggregatorService,
    // System Control
    SystemControlAiService,
    AnomalyDetectorService,
    TrafficAnalyzerService,
    HealthMonitorService,
    // Study Analyst
    StudyAnalystAiService,
    PerformanceCalculatorService,
    InsightGeneratorService,
    ReportBuilderService,
    // Tutor
    TutorAiService,
    FaqEngineService,
    MaterialExplainerService,
    QuizSuggesterService,
    // Teaching Assistant
    TeachingAssistantAiService,
    QuizGeneratorService,
    ContentGeneratorService,
    ContentSummarizerService,
    // Providers
    OpenAIService,
    AnthropicProvider,
    LocalLlmProvider,
    EmbeddingProvider,
    // Utils
    VectorStoreService,
    CacheService,
  ],
  exports: [
    OrchestratorService,
    TutorAiService,
    TeachingAssistantAiService,
    StudyAnalystAiService,
    SystemControlAiService,
  ],
})
export class AiModule {}
