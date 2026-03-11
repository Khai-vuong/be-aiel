import { pipeline } from '@xenova/transformers';

/**
 * Singleton class to manage the embedding model pipeline instance
 * Keeps a single shared instance across the application
 */
export class EmbeddingPipeline {
  private static readonly embeddingModel = 'Xenova/all-MiniLM-L6-v2';
  private static embeddingInstance: any = null;

  /**
   * Initialize the embedding model pipeline instance.
   * @param progress_callback Optional callback to track model loading progress.
   */
  public static async init(progress_callback?: (progress: any) => void) {
    if (this.embeddingInstance === null) {
      // const { pipeline } = await import('@xenova/transformers');

      this.embeddingInstance = await pipeline(
        'feature-extraction',
        this.embeddingModel,
        { progress_callback },
      );
    }

    return this.embeddingInstance;
  }

  /**
   * Get or initialize the embedding model instance.
   */
  public static async getInstance(): Promise<any> {
    if (this.embeddingInstance === null) {
      await this.init();
    }
    return this.embeddingInstance;
  }
}
