import { pipeline, env } from '@xenova/transformers';

/**
 * Singleton class to manage the summarization model pipeline instance
 * Keeps a single shared instance across the application
 */


export class SummarizationPipeline {
  // private static readonly summarizationModel = 'Xenova/distilbart-cnn-6-6-8bit';
  // private static readonly summarizationModel = 'Xenova/bart-large-cnn'
  private static readonly summarizationModel = 'Xenova/distilbart-cnn-12-3';
  

  private static summarizationInstance: any = null;

  /**
   * Initialize the summarization model pipeline instance.
   * @param progress_callback Optional callback to track model loading progress.
   */
  public static async init(progress_callback?: (progress: any) => void) {
    if (this.summarizationInstance === null) {
      // Disable all transformers logging
      env.backends.onnx.logLevel = 'fatal'; // Only show fatal errors
      env.allowRemoteModels = true;
      env.allowLocalModels = false; // Disable local model search logs
      
      const options: any = {};
      
      // Disable progress logging by default
      if (progress_callback !== undefined) {
        options.progress_callback = progress_callback;
      }
      
      // Add HuggingFace token if available
      if (process.env.HF_TOKEN) {
        options.hf_token = process.env.HF_TOKEN;
      }

      this.summarizationInstance = await pipeline(
        'summarization',
        this.summarizationModel,
        options,
      );
    }

    return this.summarizationInstance;
  }

  /**
   * Get or initialize the summarization model instance.
   */
  public static async getInstance(): Promise<any> {
    if (this.summarizationInstance === null) {
      // Don't pass progress_callback to disable logging
      await this.init();
    }
    return this.summarizationInstance;
  }
}
