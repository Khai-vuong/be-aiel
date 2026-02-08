import { pipeline } from '@xenova/transformers';
import { fewShotExamples } from './fewShotData.js';

export class FeatureEmbeddedClassifier {
  static embeddingModel = 'Xenova/all-MiniLM-L6-v2';
  static embeddingInstance = null;
  static categoryEmbeddings = null;
  static fewShotTokenCache = null;
  
  // Long text processing thresholds
  static longTextThreshold = 15; // words
  static minSentenceLength = 5; // words
  
  // Discourse chunking thresholds
  static chunkSimilarityThreshold = 0.4; // cosine similarity threshold for grouping sentences into chunks
  static chunkSignificanceThreshold = 0.45; // minimum score to count as "significant appearance" in coverage
  static secondaryCoverageWeight = 0.4; // fractional coverage boost for strong secondary intent
  static decisionThreshold = 0.50; // minimum score for an intent to be included in results
  
  static closeToWinnerThreshold = 0.92; // how close to winner to count as strong secondary intents
  
  // Position weighting - how much to boost later chunks (e.g., 0.5 = 50% boost for last chunk)
  static positionBoost = 0.5;
  
  // Routing threshold - must reach 50% similarity to route to a module
  static routingThreshold = 0.5;
  
  // Role-based heuristic coefficients (boost percentages)
  static roleCoefficients = {
    'admin': {
      'system_configuration': 0.10,
      'data_analysis': 0.05,
      'quiz_creation': 0.00
    },
    'lecturer': {
      'system_configuration': 0.00,
      'data_analysis': 0.05,
      'quiz_creation': 0.10
    },
    'student': {
      'system_configuration': 0.00,
      'data_analysis': 0.00,
      'quiz_creation': 0.00
    }
  };

  static async getInstance(progress_callback = null) {
    if (this.embeddingInstance === null) {
      this.embeddingInstance = await pipeline('feature-extraction', this.embeddingModel, { progress_callback });
      
      // Pre-compute centroid embeddings for all examples
      await this.computeCategoryEmbeddings();
    }

    return this.embeddingInstance;
  }

  static splitIntoSentences(text) {
    // Split by sentence delimiters (., !, ?)
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => {
        const wordCount = s.split(/\s+/).length;
        return wordCount >= this.minSentenceLength;
      });
    
    return sentences;
  }

  static countWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  static async computeCategoryEmbeddings() {
    if (this.categoryEmbeddings !== null) return;

    this.categoryEmbeddings = {};

    // Compute centroid (average) embedding for each category
    for (const [category, examples] of Object.entries(fewShotExamples)) {
      // Get embeddings for all examples in this category
      const embeddings = [];
      for (const example of examples) {
        const result = await this.embeddingInstance(example, { pooling: 'mean', normalize: true });
        embeddings.push(result.data);
      }
      
      // Compute centroid: average all embeddings element-wise
      const embeddingDim = embeddings[0].length;
      const centroid = new Array(embeddingDim).fill(0);
      
      for (const embedding of embeddings) {
        for (let i = 0; i < embeddingDim; i++) {
          centroid[i] += embedding[i];
        }
      }
      
      // Average and normalize the centroid
      for (let i = 0; i < embeddingDim; i++) {
        centroid[i] /= embeddings.length;
      }
      
      // Normalize centroid to unit vector
      const magnitude = Math.sqrt(centroid.reduce((sum, val) => sum + val * val, 0));
      for (let i = 0; i < embeddingDim; i++) {
        centroid[i] /= magnitude;
      }
      
      // Store single centroid embedding for this category
      this.categoryEmbeddings[category] = centroid;
    }
  }

  static cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct; // Vectors are already normalized
  }

  static getFewShotTokenCache() {
    if (this.fewShotTokenCache) return this.fewShotTokenCache;
    const cache = {};
    for (const [category, examples] of Object.entries(fewShotExamples)) {
      const tokens = new Set();
      for (const example of examples) {
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

  static hasFewShotOverlap(category, text) {
    if (!text) return false;
    const cache = this.getFewShotTokenCache();
    const tokenSet = cache[category];
    if (!tokenSet || tokenSet.size === 0) return false;
    const words = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 4);
    let hits = 0;
    for (const w of words) {
      if (tokenSet.has(w)) {
        hits++;
        if (hits >= 2) return true;
      }
    }
    return false;
  }

  static applyRoleHeuristic(categoryScores, role, text = null) {
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
    const microBoostFloor = 0.42;
    const microBoostCeil = 0.45;
    const microBoostAmount = 0.02;
    const microBoostTextAmount = 0.02;

    const entries = Object.entries(categoryScores);
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    const [topCategory, topScore] = sorted[0] || [null, null];

    const desiredBoosts = {};
    for (const [category, score] of entries) {
      const coef = coefficients[category] || 0;
      if (coef > 0 && score >= minBoostScore) {
        // Map role coefficient to a 4% - 8% boost range.
        const normalized = Math.min(1, coef / 0.10);
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

    // Micro boost for top1 near threshold (does not change ranking)
    if (topCategory && topScore >= microBoostFloor && topScore < microBoostCeil) {
      boostedScores[topCategory] = boostedScores[topCategory] + microBoostAmount;
    }
    if (topCategory && this.hasFewShotOverlap(topCategory, text)) {
      boostedScores[topCategory] = boostedScores[topCategory] + microBoostTextAmount;
    }

    return boostedScores;
  }

  static async classifySingleText(text) {
    // Get embedding for the input text
    const textEmbedding = await this.embeddingInstance(text, { pooling: 'mean', normalize: true });
    const textVector = textEmbedding.data;

    // Calculate similarity with each category centroid
    const categoryScores = {};
    
    for (const [category, centroidEmbedding] of Object.entries(this.categoryEmbeddings)) {
      categoryScores[category] = this.cosineSimilarity(textVector, centroidEmbedding);
    }

    return categoryScores;
  }

  static async classifyLongText(text, role = null) {
    console.log('\nLong text detected - using discourse chunking classification...\n');

    // Step 1: Split into sentences
    const sentences = this.splitIntoSentences(text);
    console.log(`Split into ${sentences.length} sentences \n\n`);
    sentences.forEach((s, i) => console.log(`  [${i}] ${s}`));
    
    if (sentences.length <= 1) {
      return await this.classifySingleText(text);
    }

    // Step 2: Compute sentence embeddings and create discourse chunks
    // console.log('\n--- Step 2: Discourse Chunking ---');
    const sentenceEmbeddings = [];
    for (const sentence of sentences) {
      const embedding = await this.embeddingInstance(sentence, { pooling: 'mean', normalize: true });
      sentenceEmbeddings.push(embedding.data);
    }

    // Create chunks based on cosine similarity between consecutive sentences
    const chunks = [];
    let currentChunk = [0]; // Start with first sentence
    

    for (let i = 1; i < sentences.length; i++) {
      const similarity = this.cosineSimilarity(sentenceEmbeddings[i-1], sentenceEmbeddings[i]);
      console.log(`Similarity [${i-1}]-[${i}]: ${(similarity * 100).toFixed(1)}%`);
      
      if (similarity >= this.chunkSimilarityThreshold) {
        // Add to current chunk
        currentChunk.push(i);
      } else {
        // Start new chunk
        chunks.push(currentChunk);
        currentChunk = [i];
      }
    }
    // Don't forget the last chunk
    chunks.push(currentChunk);

    console.log(`\nCreated ${chunks.length} discourse chunks:`);
    chunks.forEach((chunk, idx) => {
      const chunkText = chunk.map(sentIdx => sentences[sentIdx]).join(' ');
      console.log(`  Chunk ${idx + 1}: [sentences ${chunk.join(', ')}]`);
      console.log(`    Text: "${chunkText}"`);
    });

    // Step 3: Classify each chunk with category centroids
    // console.log('\n--- Step 3: Classify Each Chunk ---');
    const chunkClassifications = [];
    
    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk = chunks[chunkIdx];
      const chunkText = chunk.map(sentIdx => sentences[sentIdx]).join(' ');
      
      // Classify this chunk
      const scores = await this.classifySingleText(chunkText);
      
      // Apply role heuristic
      const boostedScores = this.applyRoleHeuristic(scores, role, chunkText);
      // const boostedScores = scores; // Role heuristic will be applied later globally
      
      // Find best category for this chunk (sortedScores just to log out, not used further)
      const sortedScores = Object.entries(boostedScores)
        .sort((a, b) => b[1] - a[1]);
      
      console.log(`\n  Chunk ${chunkIdx + 1}:`);
      console.log(`    Top 3: ${sortedScores.slice(0, 3).map(([cat, score]) => 
        `${cat}(${(score * 100).toFixed(1)}%)`).join(', ')}`);
      
      chunkClassifications.push({
        chunkIndex: chunkIdx,
        text: chunkText,
        scores: boostedScores,
        position: chunks.length > 1 ? chunkIdx / (chunks.length - 1) : 0 // 0 to 1
      });
    }

    // Step 4: Rank using multiple signals
    // console.log('\n--- Step 4: Aggregate with Ranking Signals ---');
    
    const intentStats = {};
    const categories = Object.keys(this.categoryEmbeddings);
    
    // Initialize stats for each category
    for (const category of categories) {
      intentStats[category] = {
        maxConfidence: 0,
        chunkAppearances: [],
        secondaryCoverage: 0,
        totalScore: 0,
        positionWeightedScore: 0
      };
    }
    
    // Collect statistics from each chunk
    for (const classification of chunkClassifications) {
      const positionWeight = 1 + (classification.position * this.positionBoost);
      
      // Find the winner of this chunk (highest score)
      let winningCategory = null;
      let maxScoreInChunk = -1;
      for (const category of categories) {
        const score = classification.scores[category];
        if (score > maxScoreInChunk) {
          maxScoreInChunk = score;
          winningCategory = category;
        }
      }
      // Winner takes chunk only if it is significant enough
      if (maxScoreInChunk < this.chunkSignificanceThreshold) {
        winningCategory = null;
      }
      
      for (const category of categories) {
        const score = classification.scores[category];
        const stats = intentStats[category];
        
        // Max confidence signal
        if (score > stats.maxConfidence) {
          stats.maxConfidence = score;
        }
        
        // Coverage signal - only count if this category WON this chunk
        if (winningCategory && category === winningCategory) {
          stats.chunkAppearances.push({
            chunkIndex: classification.chunkIndex,
            score: score,
            isWinner: true
          });
        } else if (
          winningCategory &&
          score >= this.chunkSignificanceThreshold &&
          score >= maxScoreInChunk * this.closeToWinnerThreshold
        ) {
          // Strong secondary intent close to winner gets fractional coverage credit
          stats.secondaryCoverage += this.secondaryCoverageWeight;
        }
        
        stats.totalScore += score;
        
        // Position weighting - later chunks get boosted (call-to-action)
        stats.positionWeightedScore += score * positionWeight;
      }
    }
    
    // Calculate final scores
    const finalScores = {};
    const numChunks = chunks.length;
    
    console.log('\nSignal Analysis:');
    for (const category of categories) {
      const stats = intentStats[category];
      
      // Coverage: how many chunks did this intent WIN (competitive coverage)
      const chunksWon = stats.chunkAppearances.length; // Only winners are in the array now
      const coverageRatio = (chunksWon + stats.secondaryCoverage) / numChunks;
      
      // Combine signals:
      // - Max confidence (50% weight) - strongest signal
      // - Position weighted average (20% weight) - considers call-to-action
      // - Coverage boost (30% weight) - recurring themes
      const avgPositionWeighted = stats.positionWeightedScore / numChunks;
      
      finalScores[category] = 
        (stats.maxConfidence * 0.5) +
        (avgPositionWeighted * 0.2) +
        (coverageRatio * 0.3);
      
      console.log(`  ${category}:`);
      console.log(`    Max Confidence: ${(stats.maxConfidence * 100).toFixed(1)}%`);
      console.log(`    Coverage (Chunks Won): ${chunksWon}/${numChunks} chunks (${(coverageRatio * 100).toFixed(1)}%)`);
      console.log(`    Position-Weighted Avg: ${(avgPositionWeighted * 100).toFixed(1)}%`);
      console.log(`    Final Score: ${(finalScores[category] * 100).toFixed(1)}%`);
    }
    
    // Step 5: Filter by decision threshold and return sorted list
    // console.log(`\n--- Step 5: Filter & Sort (Threshold: ${(this.decisionThreshold * 100)}%) ---`);
    
    const qualifyingIntents = Object.entries(finalScores)
      .filter(([category, score]) => score >= this.decisionThreshold)
      .sort((a, b) => b[1] - a[1])
      .map(([category, score]) => ({
        category,
        score,
        details: {
          maxConfidence: intentStats[category].maxConfidence,
          coverage: intentStats[category].chunkAppearances.length, // Already filtered to winners only
          totalChunks: numChunks
        }
      }));
    
    console.log(`\n${qualifyingIntents.length} intent(s) passed the threshold:`);
    qualifyingIntents.forEach((intent, idx) => {
      console.log(`  ${idx + 1}. ${intent.category}: ${(intent.score * 100).toFixed(1)}% ` +
        `[max: ${(intent.details.maxConfidence * 100).toFixed(1)}%, ` +
        `coverage: ${intent.details.coverage}/${intent.details.totalChunks}]`);
    });
    
    // Return result in format compatible with existing code
    // Convert to simple scores object for backward compatibility
    const scoresObject = {};
    for (const category of categories) {
      scoresObject[category] = finalScores[category];
    }
    
    return scoresObject;
  }

  static async classify(text, role = null) {
    await this.getInstance();

    const wordCount = this.countWords(text);
    let categoryScores;

    console.log(`\nClassifying text with ${wordCount} words...`);

    // Decide whether to use long-text processing
    if (wordCount > this.longTextThreshold) {
        console.log('Text exceeds long text threshold, using long text classification.');
        categoryScores = await this.classifyLongText(text, role);
    } else {
        console.log('Text within normal length, using single text classification.');
        categoryScores = await this.classifySingleText(text);
    }

    // Apply role-based heuristic boost
    // If long text, role heuristic was already applied during chunk scoring.
    const boostedScores = wordCount > this.longTextThreshold
      ? categoryScores
      : this.applyRoleHeuristic(categoryScores, role, text);

    // Sort categories by boosted score
    const sortedCategories = Object.entries(boostedScores)
      .sort((a, b) => b[1] - a[1])
      .map(([category, score]) => ({ category, score }));

    // Find all categories that pass the routing threshold
    const qualifyingCategories = sortedCategories.filter(cat => cat.score >= this.routingThreshold);
    
    // Generate decisions array
    const decisions = qualifyingCategories.length > 0
      ? qualifyingCategories.map(cat => ({
          action: `forward to ${cat.category} module`,
          category: cat.category,
          score: cat.score
        }))
      : [{
          action: 'forward to outer API',
          category: 'outer api',
          score: sortedCategories[0] ? 1.0 - sortedCategories[0].score : 0
        }];

    // Primary decision (for backward compatibility)
    const topCategory = sortedCategories[0];
    let decision;
    let bestMatch;

    if (topCategory && topCategory.score >= this.routingThreshold) {
      // Route to the module
      decision = `forward to ${topCategory.category} module`;
      bestMatch = topCategory;
    } else {
      // Route to outer API
      decision = 'forward to outer API';
      bestMatch = { category: 'outer api', score: topCategory ? 1.0 - topCategory.score : 0 };
    }

    return {
      sequence: text,
      decision: decision, // Primary decision for backward compatibility
      decisions: decisions, // All qualifying decisions
      bestMatch: {
        category: bestMatch.category,
        score: bestMatch.score
      },
      allScores: sortedCategories,
      threshold: this.routingThreshold,
      role: role,
      originalScores: Object.entries(categoryScores)
        .sort((a, b) => b[1] - a[1])
        .map(([category, score]) => ({ category, score }))
    };
  }
}
