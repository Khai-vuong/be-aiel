import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../../providers/groq.provider';
import { OpenAIService } from '../../providers/openai.provider';
import { GeminiProvider } from '../../providers/gemini.provider';

@Injectable()
export class InsightGeneratorService {
  private readonly logger = new Logger(InsightGeneratorService.name);
  private readonly provider: 'openai' | 'groq' | 'gemini';

  constructor(
    private readonly openAIService: OpenAIService,
    private readonly groqService: GroqService,
    private readonly geminiProvider: GeminiProvider,
  ) {
    this.provider = this.determineProvider();
  }

  private determineProvider(): 'openai' | 'groq' | 'gemini' {
    const configured = (process.env.INSIGHT_PROVIDER ?? '')
      .trim()
      .toLowerCase();
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const hasGroq = Boolean(process.env.GROQ_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);

    if (configured) {
      if (!['openai', 'groq', 'gemini'].includes(configured)) {
        this.logger.warn(
          `INSIGHT_PROVIDER=${configured} is not recognized. Falling back to auto-selection.`,
        );
      } else {
        if (configured === 'openai' && !hasOpenAI) {
          this.logger.warn(
            'INSIGHT_PROVIDER=openai is configured but OPENAI_API_KEY is missing.',
          );
        }
        if (configured === 'groq' && !hasGroq) {
          this.logger.warn(
            'INSIGHT_PROVIDER=groq is configured but GROQ_API_KEY is missing.',
          );
        }
        if (configured === 'gemini' && !hasGemini) {
          this.logger.warn(
            'INSIGHT_PROVIDER=gemini is configured but GEMINI_API_KEY is missing.',
          );
        }
        return configured as 'openai' | 'groq' | 'gemini';
      }
    }

    // ĐÃ SỬA: Ưu tiên Groq và Gemini lên trước OpenAI
    if (hasGroq) {
      this.logger.log('Using Groq because GROQ_API_KEY is set.');
      return 'groq';
    }
    if (hasGemini) {
      this.logger.log('Using Gemini because GEMINI_API_KEY is set.');
      return 'gemini';
    }
    if (hasOpenAI) {
      this.logger.log('Using OpenAI because OPENAI_API_KEY is set.');
      return 'openai';
    }

    this.logger.warn(
      'No AI provider API key found (OPENAI_API_KEY, GROQ_API_KEY, GEMINI_API_KEY). Using built-in fallback insight.',
    );
    // Mặc định gọi groq nếu không có gì cấu hình (Groq đang miễn phí)
    return 'groq';
  }

  // ==========================================
  // USE CASE 1: GENERATE OVERVIEW INSIGHT
  // ==========================================
  async generateTextualInsight(
    promptText: string,
    rawData: string,
  ): Promise<any> {
    const prompt = `
You are an expert Educational Data Analyst AI for the TKEDU platform.
User prompt: "${promptText}"

Below is the raw quiz attempt data for the class:
---
${rawData}
---

Your Tasks:
1. Calculate overall metrics: 'totalStudents' (unique IDs), 'averageScore', 'highestScore', 'lowestScore', and 'passRate' (scores >= 50).
2. Generate a highly detailed, professional, and empathetic report in ENGLISH. The report MUST be formatted in Markdown and follow exactly this structure and tone:

Hello, I am the virtual assistant for the TKEDU platform. I am happy to assist you in analyzing the quiz results for this class.
Based on the data provided, there are a total of [X] attempts from [Y] students. Below is the summary and detailed analysis for your overview:

### 1. Student Results Summary
I have calculated the average, highest, and lowest scores to help you easily compare each student's progress.
[Generate a Markdown table with columns: Student ID | Total Attempts | Average Score | Highest Score | Lowest Score]

### 2. Detailed Analysis
Here are some key observations to help you adjust your teaching content or support students:
* **Persistence:** [Comment on the number of attempts students are making. E.g., "All students are very active, making up to 10 attempts each, showing the exercise system is engaging."]
* **Performance Stability:** [Name specific students doing well, e.g., "Student X and Y showed great breakthroughs, achieving perfect scores (100). Meanwhile, Student Z seems to be struggling more, with a peak score of 80 and the lowest average of 52.0."]
* **Score Volatility:** [Comment on the gap between highest and lowest scores. E.g., "There is a massive variance in scores (from 10 to 100). This might be due to uneven difficulty in the question bank or students testing different answer strategies."]

### 3. Class Completion Evaluation
Based on the overall average score of [Class Average], the class is performing at a [e.g., Fair/Average/Good/Excellent] level.

STRICT RULE: You MUST respond ONLY with a valid JSON object matching this exact structure. The 'insight' field must contain the FULL Markdown report described above (use \\n for line breaks inside the string). Do NOT wrap the JSON in markdown block quotes (\`\`\`json).
{
  "totalStudents": 0,
  "averageScore": 0,
  "highestScore": 0,
  "lowestScore": 0,
  "passRate": "0%",
  "insight": "The full Markdown report goes here..."
}
`;

    const providersToTry = this.getProviderOrder();

    for (const provider of providersToTry) {
      try {
        let aiResponse: string;

        switch (provider) {
          case 'groq':
            aiResponse = await this.groqService.chat(prompt);
            break;
          case 'gemini':
            aiResponse = await this.geminiProvider.chat(prompt);
            break;
          case 'openai':
          default:
            aiResponse = await this.openAIService.chat(prompt);
            break;
        }

        if (!aiResponse || !aiResponse.trim()) {
          throw new Error('AI provider returned empty insight');
        }

        const cleanJson = aiResponse
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();

        const parsedResult = JSON.parse(cleanJson);

        this.logger.log(
          `Overview Insight generated using provider=${provider}.`,
        );
        return parsedResult;
      } catch (error: any) {
        this.logger.warn(
          `Overview Insight generation failed for provider=${provider}: ${
            error?.message || error
          }`,
        );
      }
    }

    // Fallback
    return {
      totalStudents: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: '0%',
      insight:
        'The AI analysis is temporarily unavailable. Please try again later.',
    };
  }

  // ==========================================
  // USE CASE 2: GENERATE RISK INSIGHT (TOP & BOTTOM)
  // ==========================================
  async generateRiskInsight(
    promptText: string,
    studentData: string,
  ): Promise<any> {
    const prompt = `
You are an expert Educational Data Analyst AI for the TKEDU platform.
User prompt: "${promptText}"

Below is the list of students and their AVERAGE scores for the class:
---
${studentData}
---

Your Tasks:
1. Identify up to 3 'topStudents' with the highest average scores.
2. Identify up to 3 'bottomStudents' with the lowest average scores (At-risk students).
3. Generate a professional and empathetic 'insight' in ENGLISH. The 'insight' string MUST start EXACTLY with this greeting:
"Hello, I am the virtual assistant for the TKEDU platform. Here is the list of top-performing students and those with alarming scores."
After the greeting, write a concise pedagogical analysis (2-3 sentences) in Markdown format analyzing the performance gap between the top and bottom students. Suggest targeted actions if necessary.

STRICT RULE: You MUST respond ONLY with a valid JSON object matching this exact structure. The 'insight' field must contain the greeting and the analysis (use \\n for line breaks). Do NOT wrap the JSON in markdown block quotes (like \`\`\`json).
{
  "topStudents": [
    { "name": "studentId", "averageScore": 0 }
  ],
  "bottomStudents": [
    { "name": "studentId", "averageScore": 0 }
  ],
  "insight": "Hello, I am the virtual assistant for the TKEDU platform. Here is the list of top-performing students and those with alarming scores.\\n\\n[Your detailed analysis goes here...]"
}
`;

    const providersToTry = this.getProviderOrder();

    for (const provider of providersToTry) {
      try {
        let aiResponse: string;

        switch (provider) {
          case 'groq':
            aiResponse = await this.groqService.chat(prompt);
            break;
          case 'gemini':
            aiResponse = await this.geminiProvider.chat(prompt);
            break;
          case 'openai':
          default:
            aiResponse = await this.openAIService.chat(prompt);
            break;
        }

        if (!aiResponse || !aiResponse.trim()) {
          throw new Error('AI provider returned empty response');
        }

        const cleanJson = aiResponse
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();

        const parsedResult = JSON.parse(cleanJson);

        this.logger.log(
          `Risk Insight generated successfully using provider=${provider}.`,
        );
        return parsedResult;
      } catch (error: any) {
        this.logger.warn(
          `Risk Insight generation failed for provider=${provider}: ${
            error?.message || error
          }`,
        );
      }
    }

    // Fallback
    return {
      topStudents: [],
      bottomStudents: [],
      insight:
        'The AI risk analysis is temporarily unavailable. Please try again later.',
    };
  }

  private getProviderOrder(): Array<'groq' | 'openai' | 'gemini'> {
    const configured = (process.env.INSIGHT_PROVIDER ?? '')
      .trim()
      .toLowerCase();

    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const hasGroq = Boolean(process.env.GROQ_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);

    const providers: Array<'groq' | 'openai' | 'gemini'> = [];

    if (configured && ['groq', 'openai', 'gemini'].includes(configured)) {
      providers.push(configured as any);
    }

    // ĐÃ SỬA: Đưa Groq và Gemini lên trước OpenAI
    if (hasGroq && !providers.includes('groq')) {
      providers.push('groq');
    }
    if (hasGemini && !providers.includes('gemini')) {
      providers.push('gemini');
    }
    if (hasOpenAI && !providers.includes('openai')) {
      providers.push('openai');
    }

    if (providers.length === 0) {
      providers.push(this.provider);
    }

    return providers;
  }

  // ==========================================
  // USE CASE 3: COMPLETION TRENDS
  // ==========================================
  async generateTrendInsight(
    promptText: string,
    trendData: string,
  ): Promise<any> {
    const prompt = `
You are an expert Educational Data Analyst AI for the TKEDU platform.
User prompt: "${promptText}"

Below is the raw data of total quiz submissions grouped by month:
---
${trendData}
---

Your Tasks:
1. Re-format the 'monthlyCompletion' into an array of objects.
2. Identify the overall 'trend' (Choose exactly one: Increasing / Decreasing / Stable).
3. Generate a professional 'insight' in ENGLISH (3 to 5 sentences).
   - The string MUST start EXACTLY with: "Hello, I am the virtual assistant for the TKEDU platform. Here is the quiz completion trend and my strategic recommendations."
   - Follow with a general comment on the trend (e.g., "Quiz completion increased steadily in the last two months, indicating improved student engagement.").
   - Conclude with actionable strategies to maintain or improve this rate.

STRICT RULE: You MUST respond ONLY with a valid JSON object matching this exact structure. Do NOT wrap it in markdown block quotes (like \`\`\`json).
{
  "monthlyCompletion": [
    { "month": "YYYY-MM", "submissions": 0 }
  ],
  "trend": "Increasing | Decreasing | Stable",
  "insight": "Hello, I am the virtual assistant for the TKEDU platform. Here is the quiz completion trend and my strategic recommendations.\\n\\n[Write 3 to 5 sentences here...]"
}
`;

    const providersToTry = this.getProviderOrder();

    for (const provider of providersToTry) {
      try {
        let aiResponse: string;
        switch (provider) {
          case 'groq':
            aiResponse = await this.groqService.chat(prompt);
            break;
          case 'gemini':
            aiResponse = await this.geminiProvider.chat(prompt);
            break;
          case 'openai':
          default:
            aiResponse = await this.openAIService.chat(prompt);
            break;
        }

        if (!aiResponse || !aiResponse.trim())
          throw new Error('Empty response');

        const cleanJson = aiResponse
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        const parsedResult = JSON.parse(cleanJson);

        this.logger.log(
          `Trend Insight generated successfully using provider=${provider}.`,
        );
        return parsedResult;
      } catch (error: any) {
        this.logger.warn(`Trend Insight generation failed: ${error?.message}`);
      }
    }

    return {
      monthlyCompletion: [],
      trend: 'Unknown',
      insight:
        'The AI trend analysis is temporarily unavailable. Please try again later.',
    };
  }

  // ==========================================
  // USE CASE 4: KNOWLEDGE GAP & MISCONCEPTIONS
  // ==========================================
  async generateKnowledgeGapInsight(
    promptText: string,
    gapData: string,
  ): Promise<any> {
    const prompt = `
You are an expert Educational Data Analyst AI for the TKEDU platform.
User prompt: "${promptText}"

Below is the aggregated data of student answers for a quiz/class, including question tags (skills) and the distribution of selected options:
---
${gapData}
---

Your Tasks:
1. Identify 'Common Misconceptions' (Điểm mù chung): Find questions where a large percentage of students chose the EXACT SAME WRONG answer. This indicates a confusing concept or misleading question.
2. Evaluate 'Skill Matrix' (Ma trận kỹ năng): Analyze the success rate based on 'Tags' to see which knowledge areas the class has mastered and which areas have critical gaps.
3. Generate a pedagogical 'insight' report in ENGLISH (Markdown format) starting EXACTLY with:
"Hello, I am the virtual assistant for the TKEDU platform. Here is the Knowledge Gap Analysis to help you optimize your upcoming lectures."
- Detail the specific concepts students are struggling with.
- Provide actionable advice on what topics need to be re-taught ("dạy bù").

STRICT RULE: Respond ONLY with a valid JSON object matching this exact structure:
{
  "misconceptions": [
    { "question": "...", "wrongAnswerChosen": "...", "percentage": 0 }
  ],
  "skillMatrix": [
    { "skillTag": "...", "masteryLevel": "Strong | Weak | Average" }
  ],
  "insight": "Hello, I am the virtual assistant for the TKEDU platform. Here is the Knowledge Gap Analysis... \\n\\n[Detailed Markdown report here]"
}
`;

    const providersToTry = this.getProviderOrder();

    for (const provider of providersToTry) {
      try {
        let aiResponse: string;
        switch (provider) {
          case 'groq':
            aiResponse = await this.groqService.chat(prompt);
            break;
          case 'gemini':
            aiResponse = await this.geminiProvider.chat(prompt);
            break;
          case 'openai':
          default:
            aiResponse = await this.openAIService.chat(prompt);
            break;
        }

        if (!aiResponse || !aiResponse.trim())
          throw new Error('Empty response');

        const cleanJson = aiResponse
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        return JSON.parse(cleanJson);
      } catch (error: any) {
        this.logger.warn(
          `Knowledge Gap Insight failed using provider=${provider}: ${error?.message}`,
        );
      }
    }

    return {
      misconceptions: [],
      skillMatrix: [],
      insight: 'The AI Knowledge Gap analysis is temporarily unavailable.',
    };
  }

  // ==========================================
  // NLP: EXTRACT ENTITIES FROM PROMPT
  // ==========================================
  async extractEntitiesFromPrompt(
    promptText: string,
  ): Promise<{ classId: string | null; quizId: string | null }> {
    const prompt = `
You are an AI assistant helping a backend system parse user intents.
Read the following user prompt and extract the relevant IDs for a Class or a Quiz.
User prompt: "${promptText}"

Rules:
1. If the user mentions a class (e.g., "class001", "class L01", "L01"), extract it as 'classId' (format exactly as the user typed the ID, removing the word 'class' if needed).
2. If the user mentions a specific quiz (e.g., "quiz 1", "quiz001", "assignment 2"), extract it as 'quizId'.
3. If an entity is not mentioned, set its value to null.

STRICT RULE: Respond ONLY with a valid JSON object matching this structure. Do NOT wrap it in markdown block quotes (like \`\`\`json).
{
  "classId": "string or null",
  "quizId": "string or null"
}
`;

    const providersToTry = this.getProviderOrder();

    for (const provider of providersToTry) {
      try {
        let aiResponse: string;
        switch (provider) {
          case 'groq':
            aiResponse = await this.groqService.chat(prompt);
            break;
          case 'gemini':
            aiResponse = await this.geminiProvider.chat(prompt);
            break;
          case 'openai':
          default:
            aiResponse = await this.openAIService.chat(prompt);
            break;
        }

        if (!aiResponse || !aiResponse.trim())
          throw new Error('Empty response');

        const cleanJson = aiResponse
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        return JSON.parse(cleanJson);
      } catch (error: any) {
        this.logger.warn(
          `Entity extraction failed using provider=${provider}: ${error?.message}`,
        );
      }
    }

    // Fallback: Nếu AI sập, trả về null để Backend dùng ID mặc định từ request body
    return { classId: null, quizId: null };
  }

  async generateMaterialInsight(
    promptText: string,
    rawData: string,
  ): Promise<any> {
    const prompt = `
You are an expert Educational Data Analyst.
Analyze the correlation between study material usage and quiz performance:
---
${rawData}
---
Tasks:
1. Identify if students who view materials more often get higher scores (Material Correlation).
2. Detect 'Drop-off points': Do failures increase at the end of the quiz? (Indicates fatigue/loss of focus).
3. Return ONLY a JSON object:
{
  "correlationScore": "High | Medium | Low",
  "dropOffPoint": "Question #X or None",
  "insight": "Hello, I am the virtual assistant for the TKEDU platform. [Markdown report analyzing if videos/materials are actually helping and where students lose interest...]"
}
`;
    // Gọi provider (Groq/Gemini) tương tự các hàm trước
    const providersToTry = this.getProviderOrder();
    for (const provider of providersToTry) {
      try {
        const aiResponse = await this.groqService.chat(prompt); // Hoặc dùng Switch-case như cũ
        const cleanJson = aiResponse
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        return JSON.parse(cleanJson);
      } catch (e) {
        continue;
      }
    }
  }
}
