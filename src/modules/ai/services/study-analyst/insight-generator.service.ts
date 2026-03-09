import { Injectable } from '@nestjs/common';

@Injectable()
export class InsightGeneratorService {
  generateInsights(metrics: any) {
    const insights: string[] = [];

    if (metrics.averageScore < 60) {
      insights.push('Class performance is below average.');
    }

    if (metrics.atRiskCount > 0) {
      insights.push(`${metrics.atRiskCount} students are at risk.`);
    }

    if (metrics.completionRate < 70) {
      insights.push('Course completion rate is decreasing.');
    }

    return insights;
  }
}
