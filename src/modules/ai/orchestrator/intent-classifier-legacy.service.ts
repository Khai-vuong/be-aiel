import { Injectable, Logger } from '@nestjs/common';
import { fewShotExamples, curatedFewShotTokenCache } from '../fewShotData';
import { EmbeddingPipeline } from './embedding.pipeline';

type Decision = {
  category: string;
  score: number;
};

type Embedding = number[];

type ChunkClassification = {
  chunkIndex: number;
  text: string;
  scores: Record<string, number>;
  position: number;
};

type IntentRating = {
  maxConfidence: number;
  chunkAppearances: Array<{
    chunkIndex: number;
    score: number;
    isWinner: boolean;
  }>;
  secondaryCoverage: number;
  totalScore: number;
  positionWeightedScore: number;
};

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);

  private categoryEmbeddings: Record<string, number[]> | null = null;
  private fewShotTokenCache: Record<string, Set<string>> | null = null;

  public minSentenceLength = 5;

  public chunkSimilarityThreshold = 0.4;
  public chunkSignificanceThreshold = 0.45;
  public secondaryCoverageWeight = 0.4;
  public closeToWinnerThreshold = 0.92;
  public positionBoost = 0.5;
  public decisionThreshold = 0.5;

  public coefMaxConfidence = 0.5;
  public coefPositionWeighted = 0.2;
  public coefCoverage = 0.3;

  private roleCoefficients: Record<string, Record<string, number>> = {
    admin: {
      system_configuration: 1.0,
      data_analysis: 0.5,
      quiz_creation: 0.0,
    },
    lecturer: {
      system_configuration: 0.0,
      data_analysis: 0.5,
      quiz_creation: 1.0,
    },
    student: {
      system_configuration: 0.0,
      data_analysis: 0.0,
      quiz_creation: 0.0,
    },
  };

  public async getInstance(progress_callback?: (progress: any) => void) {
    if (this.categoryEmbeddings === null) {
      await this.computeCategoryEmbeddings();
    }
    return progress_callback === undefined
      ? EmbeddingPipeline.init(progress_callback)
      : EmbeddingPipeline.getInstance();
  }

  public splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.split(/\s+/).length >= this.minSentenceLength);
  }

  public countWords(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  private async computeCategoryEmbeddings() {
    if (this.categoryEmbeddings !== null) return;

    this.categoryEmbeddings = {};
    const embeddingInstance = await this.getInstance();

    for (const [category, examples] of Object.entries(fewShotExamples) as [
      string,
      string[],
    ][]) {
      const embeddings: number[][] = [];
      for (const example of examples) {
        const result = await embeddingInstance(example, {
          pooling: 'mean',
          normalize: true,
        });
        embeddings.push(result.data as number[]);
      }

      const embeddingDim = embeddings[0].length;
      const centroid = new Array(embeddingDim).fill(0);

      for (const embedding of embeddings) {
        for (let i = 0; i < embeddingDim; i++) {
          centroid[i] += embedding[i];
        }
      }

      for (let i = 0; i < embeddingDim; i++) {
        centroid[i] /= embeddings.length;
      }

      const magnitude = Math.sqrt(
        centroid.reduce((sum, val) => sum + val * val, 0),
      );
      for (let i = 0; i < embeddingDim; i++) {
        centroid[i] /= magnitude;
      }

      this.categoryEmbeddings[category] = centroid;
    }
  }

  public cosineSimilarity(vecA: Embedding, vecB: Embedding): number {
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
  }

  public getFewShotTokenCache() {
    if (this.fewShotTokenCache) return this.fewShotTokenCache;
    const cache = {};
    const curated = curatedFewShotTokenCache || {};
    for (const [category, tokenList] of Object.entries(curated)) {
      const tokens = new Set();
      for (const token of tokenList as unknown[]) {
        const normalized = String(token).toLowerCase().trim();
        if (normalized.length >= 4) tokens.add(normalized);
      }
      cache[category] = tokens;
    }

    for (const [category, examples] of Object.entries(fewShotExamples) as [
      string,
      string[],
    ][]) {
      if (cache[category]) continue;
      const tokens = new Set();
      for (const example of examples) {
        const words = example
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length >= 4);
        for (const w of words) tokens.add(w);
      }
      cache[category] = tokens;
    }
    this.fewShotTokenCache = cache;
    return cache;
  }

  public hasFewShotOverlap(category, text: string) {
    if (!text) return 0;
    const cache = this.getFewShotTokenCache();
    const tokenSet = cache[category];
    if (!tokenSet || tokenSet.size === 0) return 0;
    const words = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4);
    let hits = 0;
    for (const w of words) {
      if (tokenSet.has(w)) {
        hits++;
        if (hits >= 3) return 3;
      }
    }
    return hits;
  }

  public applyRoleHeuristic(
    categoryScores,
    role?: string,
    text?: string,
  ): Record<string, number> {
    if (!role) return categoryScores;

    const normalizedRole = role.toLowerCase();
    const coefficients = this.roleCoefficients[normalizedRole];

    if (!coefficients) {
      console.warn(`Unknown role: ${role}. No heuristic applied.`);
      return categoryScores;
    }

    const minBoostScore = 0.45;
    const maxBoostScore = 0.08;
    const minBoostScoreDelta = 0.04;
    const epsilon = 1e-6;
    const microBoostTextAmount = 0.02;

    const entries = Object.entries(categoryScores) as [string, number][];
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    const [topCategory, topScore] = sorted[0] || [null, null];

    const desiredBoosts = {};
    for (const [category, score] of entries) {
      const coef = coefficients[category] || 0;
      if (coef > 0 && score >= minBoostScore) {
        const normalized = Math.min(1, coef);
        desiredBoosts[category] =
          minBoostScoreDelta +
          (maxBoostScore - minBoostScoreDelta) * normalized;
      } else {
        desiredBoosts[category] = 0;
      }
    }

    const topAllowedBoost = topCategory ? desiredBoosts[topCategory] : 0;

    const boostedScores = {};
    for (const [category, score] of entries) {
      let boost = desiredBoosts[category];
      if (category !== topCategory) {
        boost = Math.min(boost, topAllowedBoost);
        const maxAllowed = (topScore ?? 0) + topAllowedBoost - score - epsilon;
        if (maxAllowed < boost) {
          boost = Math.max(0, maxAllowed);
        }
      }
      boostedScores[category] = score + boost;
    }

    if (text) {
      for (const [category, score] of entries) {
        if (score >= 0.4) {
          const hits = this.hasFewShotOverlap(category, text);
          if (hits > 0) {
            boostedScores[category] =
              boostedScores[category] + microBoostTextAmount * hits;
          }
        }
      }
    }

    return boostedScores;
  }

  public async classifySingleText(
    text: string,
  ): Promise<Record<string, number>> {
    const embeddingInstance = await this.getInstance();
    const textEmbedding = await embeddingInstance(text, {
      pooling: 'mean',
      normalize: true,
    });
    const textVector = textEmbedding.data as number[];

    const categoryScores: Record<string, number> = {};
    for (const [category, centroidEmbedding] of Object.entries(
      this.categoryEmbeddings ?? {},
    )) {
      categoryScores[category] = this.cosineSimilarity(
        textVector,
        centroidEmbedding,
      );
    }

    return categoryScores;
  }

  public async classify(text: string, role?: string): Promise<Decision[]> {
    // Sửa lỗi: Cần toLowerCase() để so sánh cho an toàn
    if (role?.toLowerCase() === 'student') {
      return [
        {
          category: 'outer_api',
          score: 1.0,
        },
      ] as Decision[];
    }

    const sentences = this.splitIntoSentences(text);
    console.log(`Split into ${sentences.length} sentences \n\n`);
    sentences.forEach((s, i) => console.log(`  [${i}] ${s}`));

    if (sentences.length <= 1) {
      const result = await this.classifySingleText(text);
      const boostedResult = this.applyRoleHeuristic(result, role, text);

      // ==========================================
      // ==========================================
      let bestCategory = 'outer_api';
      let bestScore = -1;

      for (const [cat, score] of Object.entries(boostedResult)) {
        if ((score as number) > bestScore) {
          bestScore = score as number;
          bestCategory = cat;
        }
      }

      this.logger.log(`Scores: ${JSON.stringify(boostedResult)}`); // In ra log để bạn kiểm tra

      if (bestScore >= this.decisionThreshold) {
        return [{ category: bestCategory, score: bestScore }] as Decision[];
      } else {
        return [{ category: 'outer_api', score: 1 - bestScore }] as Decision[];
      }
    }

    const sentenceEmbeddings: Embedding[] = [];
    const embeddingInstance = await this.getInstance();
    for (const sentence of sentences) {
      const embedding = await embeddingInstance(sentence, {
        pooling: 'mean',
        normalize: true,
      });
      sentenceEmbeddings.push(embedding.data as Embedding);
    }

    const chunks: number[][] = [];
    let currentChunk = [0];

    for (let i = 1; i < sentences.length; i++) {
      const similarity = this.cosineSimilarity(
        sentenceEmbeddings[i - 1],
        sentenceEmbeddings[i],
      );

      if (similarity >= this.chunkSimilarityThreshold) {
        currentChunk.push(i);
      } else {
        chunks.push(currentChunk);
        currentChunk = [i];
      }
    }
    chunks.push(currentChunk);

    const chunkClassifications: ChunkClassification[] = [];

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk = chunks[chunkIdx];
      const chunkText = chunk
        .map((localIndex) => sentences[localIndex])
        .join(' ');

      const scores = await this.classifySingleText(chunkText);
      const boostedScores = this.applyRoleHeuristic(scores, role, chunkText);

      chunkClassifications.push({
        chunkIndex: chunkIdx,
        text: chunkText,
        scores: boostedScores,
        position: chunks.length > 1 ? chunkIdx / (chunks.length - 1) : 0,
      } as ChunkClassification);
    }

    const intentStats: Record<string, IntentRating> = {};
    const categories = Object.keys(this.categoryEmbeddings ?? {}) as string[];

    for (const category of categories) {
      intentStats[category] = {
        maxConfidence: 0,
        chunkAppearances: [],
        secondaryCoverage: 0,
        totalScore: 0,
        positionWeightedScore: 0,
      };
    }

    for (const classification of chunkClassifications) {
      const positionWeight = 1 + classification.position * this.positionBoost;

      let winningCategory: string | null = null;
      let maxScoreInChunk = -1;
      for (const category of categories) {
        const score = classification.scores[category];
        if (score > maxScoreInChunk) {
          maxScoreInChunk = score;
          winningCategory = category;
        }
      }

      if (maxScoreInChunk < this.chunkSignificanceThreshold) {
        winningCategory = null;
      }

      for (const category of categories) {
        const score = classification.scores[category];
        const stats = intentStats[category];

        if (score > stats.maxConfidence) {
          stats.maxConfidence = score;
        }

        if (winningCategory && category === winningCategory) {
          stats.chunkAppearances.push({
            chunkIndex: classification.chunkIndex,
            score: score,
            isWinner: true,
          });
        } else if (
          winningCategory &&
          score >= this.chunkSignificanceThreshold &&
          score >= maxScoreInChunk * this.closeToWinnerThreshold
        ) {
          stats.secondaryCoverage += this.secondaryCoverageWeight;
        }

        stats.totalScore += score;
        stats.positionWeightedScore += score * positionWeight;
      }
    }

    const totalScores: Record<string, number> = {};
    const numChunks = chunks.length;

    for (const category of categories) {
      const stats = intentStats[category];
      const chunksWon = stats.chunkAppearances.length;
      const coverageRatio = (chunksWon + stats.secondaryCoverage) / numChunks;
      const avgPositionWeighted = stats.positionWeightedScore / numChunks;

      totalScores[category] =
        stats.maxConfidence * this.coefMaxConfidence +
        avgPositionWeighted * this.coefPositionWeighted +
        coverageRatio * this.coefCoverage;
    }

    console.log('\nFinal total scores:', totalScores);

    const decisions: Decision[] = Object.entries(totalScores)
      .filter(([, score]) => score >= this.decisionThreshold)
      .map(([category, score]) => ({ category, score }));

    if (decisions.length === 0) {
      const maxScore = Math.max(...Object.values(totalScores));
      return [
        {
          category: 'outer_api',
          score: 1 - maxScore,
        },
      ] as Decision[];
    }

    return decisions;
  }

  // ==========================================
  // ==========================================
  private intentRouteMap: Record<string, string> = {
    data_analysis: 'data_analysis',
    quiz_creation: 'quiz_creation',
    system_configuration: 'system_configuration',
    outer_api: 'general_ai',
  };

  public mapDecisionToIntent(decisions: Decision[]): string {
    if (!decisions || decisions.length === 0) {
      return 'general_ai';
    }
    const sorted = [...decisions].sort((a, b) => b.score - a.score);
    const topDecision = sorted[0];
    return this.intentRouteMap[topDecision.category] ?? 'general_ai';
  }

  public async classifyIntent(text: string, role?: string): Promise<string> {
    const decisions = await this.classify(text, role);
    return this.mapDecisionToIntent(decisions);
  }
}
