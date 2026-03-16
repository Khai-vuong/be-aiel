import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportBuilderService {
  buildReport(metrics: any, insight: string) {
    return {
      totalStudents: metrics.totalStudents,
      averageScore: metrics.averageScore,
      highestScore: metrics.highestScore,
      lowestScore: metrics.lowestScore,
      passRate: metrics.passRate,
      insight,
    };
  }

  buildPrompt(classId: string, metrics: any, insights: string[]) {
    return `
You are an education data analyst AI.

Class ID: ${classId}

Metrics:
- Average Score: ${metrics.averageScore}
- Students at Risk: ${metrics.atRiskCount}
- Completion Rate: ${metrics.completionRate}%

Insights:
${insights.join('\n')}

Please provide:
1. A short analysis
2. Possible causes
3. Recommendations for instructors
`;
  }
}
