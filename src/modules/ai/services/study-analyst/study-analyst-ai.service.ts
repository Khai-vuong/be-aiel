import { Injectable } from '@nestjs/common';
import { PerformanceCalculatorService } from './performance-calculator.service';
import { InsightGeneratorService } from './insight-generator.service';
import { ReportBuilderService } from './report-builder.service';

@Injectable()
export class StudyAnalystAIService {
  constructor(
    private performanceCalculator: PerformanceCalculatorService,
    private insightGenerator: InsightGeneratorService,
    private reportBuilder: ReportBuilderService,
  ) {}

  async analyzeClass(classId: string) {
    const students = [
      { id: 1, score: 85, completed: true },
      { id: 2, score: 72, completed: true },
      { id: 3, score: 40, completed: false },
      { id: 4, score: 35, completed: false },
      { id: 5, score: 90, completed: true },
    ];

    const metrics = this.performanceCalculator.calculateMetrics(students);

    const insights = this.insightGenerator.generateInsights(metrics);

    const prompt = this.reportBuilder.buildPrompt(classId, metrics, insights);

    return {
      metrics,
      insights,
      prompt,
    };
  }

  async detectStudentRisk(classId: string) {
    const students = [
      { id: 1, score: 85, completed: true },
      { id: 2, score: 45, completed: false },
      { id: 3, score: 38, completed: false },
      { id: 4, score: 90, completed: true },
    ];

    const riskyStudents = students.filter((s) => s.score < 50 || !s.completed);

    return {
      classId,
      riskyStudents,
    };
  }

  async generateTeachingRecommendations(classId: string) {
    return {
      classId,
      recommendation:
        'Focus more on students scoring below 50%. Provide additional practice exercises.',
    };
  }
}
