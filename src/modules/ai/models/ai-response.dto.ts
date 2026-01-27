export interface AiResponseDto {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    code: string;
  };
  metadata: {
    timestamp: string;
    cached?: boolean;
    serviceType?: string;
    processingTime?: number;
    [key: string]: any;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface ConversationResponse {
  id: string;
  messages: ChatMessage[];
  serviceType: string;
  createdAt: string;
  updatedAt: string;
}
