import { AiConversationStatus, AiMessageRole } from '@prisma/client';

export interface CreateMessageDto {
  conversationId: string;
  role: AiMessageRole;
  content: string;
  contentJson?: any;
  parentMessageId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  modelName?: string;
  metadata?: any;
}

export interface CreateConversationDto {
  userId: string;
  title?: string;
  metadata?: any;
}

export interface UpdateConversationDto {
  title?: string;
  status?: AiConversationStatus;
  lastMessageAt?: Date;
  metadata?: any;
}

export interface FindConversationsOptions {
  userId: string;
  status?: AiConversationStatus;
  limit?: number;
  offset?: number;
}

export interface FindMessagesOptions {
  conversationId: string;
  limit?: number;
  beforeMessageId?: string;
}


