import { Injectable, Logger } from '@nestjs/common';
import { AIServiceType } from '../models/ai-context.interface';
import { fewShotExamples, fewShotTokenCache as curatedFewShotTokenCache } from '../fewShotData.js';
import { EmbeddingPipeline } from './embedding-pipeline';
import { Chunk } from '@xenova/transformers';

type Decision =  {
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
  chunkAppearances: Array<{ chunkIndex: number; score: number; isWinner: boolean }>;
  secondaryCoverage: number;
  totalScore: number;
  positionWeightedScore: number;
}

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);

  private categoryEmbeddings: Record<string, number[]> | null = null;
  private fewShotTokenCache: Record<string, Set<string>> | null = null;

  public minSentenceLength = 5; //Use to filter out very short sentences

  public chunkSimilarityThreshold = 0.4; //Minimum Cosine similarity threshold to group sentences into chunks
  public chunkSignificanceThreshold = 0.45; //Minimum score within a chunk to consider it significant
  public secondaryCoverageWeight = 0.4; //Weight for secondary coverage in scoring
  public closeToWinnerThreshold = 0.92; //Threshold to consider a category close to the winner in a chunk
  public positionBoost = 0.5; //Boost factor for position weighted score
  public decisionThreshold = 0.5; //Threshold for qualifying a category as a decision

  public coefMaxConfidence = 0.5;
  public coefPositionWeighted = 0.2;
  public coefCoverage = 0.3;
  
  // Role-based heuristic coefficients (0 to 1 scale)
  private roleCoefficients: Record<string, Record<string, number>> = {
    'admin': {
      'system_configuration': 1.00,
      'data_analysis': 0.50,
      'quiz_creation': 0.00
    },
    'lecturer': {
      'system_configuration': 0.00,
      'data_analysis': 0.50,
      'quiz_creation': 1.00
    },
    'student': {
      'system_configuration': 0.00,
      'data_analysis': 0.00,
      'quiz_creation': 0.00
    }
  };

  // Get (and initialize if needed) the embedding model instance
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

    for (const [category, examples] of Object.entries(fewShotExamples) as [string, string[]][]) {
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

      const magnitude = Math.sqrt(centroid.reduce((sum, val) => sum + val * val, 0));
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
      for (const token of (tokenList as unknown[])) {
        const normalized = String(token).toLowerCase().trim();
        if (normalized.length >= 4) tokens.add(normalized);
      }
      cache[category] = tokens;
    }

    // Fallback: build from examples if no curated tokens exist for a category
    for (const [category, examples] of Object.entries(fewShotExamples) as [string, string[]][]) {
      if (cache[category]) continue;
      const tokens = new Set();
      for (const example of examples ) {
        const words = example
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(w => w.length >= 4);
        for (const w of words) tokens.add(w);
      }
      cache[category] = tokens;
    }
    this.fewShotTokenCache = cache;
    return cache;
  }

  public hasFewShotOverlap(category, text : string) {
    if (!text) return 0;
    const cache = this.getFewShotTokenCache();
    const tokenSet = cache[category];
    if (!tokenSet || tokenSet.size === 0) return 0;
    const words = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 4);
    let hits = 0;
    for (const w of words) {
      if (tokenSet.has(w)) {
        hits++;
        if (hits >= 3) return 3;
      }
    }
    return hits;
  }

  public applyRoleHeuristic(categoryScores, role?: string, text?: string ) {
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
        // Map 0-1 coefficient to a 4% - 8% boost range.
        const normalized = Math.min(1, coef);
        desiredBoosts[category] = minBoostScoreDelta + (maxBoostScore - minBoostScoreDelta) * normalized;
      } else {
        desiredBoosts[category] = 0;
      }
    }

    const topAllowedBoost = topCategory
      ? desiredBoosts[topCategory]
      : 0;

    const boostedScores = {};
    for (const [category, score] of entries) {
      let boost = desiredBoosts[category];

      // Preserve ranking: if secondary gets boost x, primary must get at least x.
      if (category !== topCategory) {
        boost = Math.min(boost, topAllowedBoost);

        // Do not let any secondary overtake the top category.
        const maxAllowed = (topScore ?? 0) + topAllowedBoost - score - epsilon;
        if (maxAllowed < boost) {
          boost = Math.max(0, maxAllowed);
        }
      }

      boostedScores[category] = score + boost;
    }

    if (text) {
      for (const [category, score] of entries) {
        if (score >= 0.40) {
          const hits = this.hasFewShotOverlap(category, text);
          if (hits > 0) {
            boostedScores[category] = boostedScores[category] + (microBoostTextAmount * hits);
          }
        }
      }
    }

    return boostedScores;
  }

  public async classifySingleText(text: string): Promise<Record<string, number>> {
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

  /**
   * Main classification method - classifies user input and determines routing
   * @param message - The text message to classify
   * @param userRole - The user's role (admin, lecturer, student)
   * @returns Classification result with routing decision
   */
  public async classify(  
    text: string,
    role?: string,
  ): Promise<Decision[]> 
  {
    // Step 1: Base case and split sentences
    if (role === 'Student') {
      return [
        {
          category: 'outer_api',
          score: 1.0,
        }] as Decision[];
    }

    const sentences = this.splitIntoSentences(text);
    console.log(`Split into ${sentences.length} sentences \n\n`);
    sentences.forEach((s, i) => console.log(`  [${i}] ${s}`));


    if (sentences.length <= 1) {
      const result =  await this.classifySingleText(text);
      const boostedResult = this.applyRoleHeuristic(result, role, text);
      return [{
        category: Object.keys(boostedResult)[0],
        score: Object.values(boostedResult)[0]
      }] as Decision[];
    }

    // Step 2: Compute embeddings for each sentence
    const sentenceEmbeddings: Embedding[] = [];
    const embeddingInstance = await this.getInstance();
    for (const sentence of sentences) {
      const embedding = await embeddingInstance(sentence, {
        pooling: 'mean',
        normalize: true,
      });
      sentenceEmbeddings.push(embedding.data as Embedding);
    }

    

    // Step 3: Group consecutive sentences into chunks based on cosine similarity
    const chunks: number[][] = [];
    let currentChunk = [0]; //start with the first sentence

    for (let i = 1; i < sentences.length; i++) {
      const similarity = this.cosineSimilarity(
        sentenceEmbeddings[i - 1],
        sentenceEmbeddings[i],
      );

      if (similarity >= this.chunkSimilarityThreshold) {
        // Add to current chunk
        currentChunk.push(i);
      } else {
        // Start a new chunk
        chunks.push(currentChunk);
        currentChunk = [i];
      }
    }
    // Push the last chunk
    chunks.push(currentChunk);

    // Step 4: Classify each discourse chunk and apply local role heuristic

    const chunkClassifications: ChunkClassification[] = [];

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      //Merge the sentences in the chunk
      const chunk = chunks[chunkIdx]; //Eg: [0,1,2]
      const chunkText = chunk.map((localIndex) => sentences[localIndex]).join(' ');

      // Classify the chunk + apply heuristic boost
      const scores = await this.classifySingleText(chunkText);
      const boostedScores = this.applyRoleHeuristic(scores, role, chunkText);

      //Store result
      chunkClassifications.push({
          chunkIndex: chunkIdx,
          text: chunkText,
          scores: boostedScores,
          position: chunks.length > 1 ? chunkIdx / (chunks.length - 1) : 0,
        } as ChunkClassification
      );
    }

    // Step 5: Collect multiple signals (max confidence, coverage, position weighting)
    const intentStats: Record< string, IntentRating > = {};
    const categories = Object.keys(this.categoryEmbeddings ?? {}) as string[];

    //Init the intent ratings
    for (const category of categories) {
      intentStats[category] = {
        maxConfidence: 0,
        chunkAppearances: [],
        secondaryCoverage: 0,
        totalScore: 0,
        positionWeightedScore: 0,
      };
    }

    //The rating are calculated from chunks
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

      // if the top score is below significance threshold, no winner
      if (maxScoreInChunk < this.chunkSignificanceThreshold) {
        winningCategory = null;
      }

      // Update the stats for each category
      for (const category of categories) {
        const score = classification.scores[category];
        const stats = intentStats[category];

        if (score > stats.maxConfidence) {
          stats.maxConfidence = score;
        }

        // Add score for winner category
        if (winningCategory && category === winningCategory) {
          stats.chunkAppearances.push({
            chunkIndex: classification.chunkIndex,
            score: score,
            isWinner: true,
          });
        } 
        // Add secondary coverage for close contenders (only get coverage, a fraction of full winner)
        else if (
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

    // Step 6: Calulate final scores combining all signals
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

    // If no category passes the threshold, return outer_api with score = 1 - max
    if (decisions.length === 0) {
      const maxScore = Math.max(...Object.values(totalScores));
      return [{ 
        category: "outer_api", 
        score: 1 - maxScore 
      }] as Decision[];
    }

    return decisions;
  }
   
}
