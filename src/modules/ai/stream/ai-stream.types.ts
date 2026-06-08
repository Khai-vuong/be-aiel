export type AiProgressEvent = {
  stage: string;
  message: string;
  data?: Record<string, unknown>;
};

export type AiProgressReporter = (event: AiProgressEvent) => void;