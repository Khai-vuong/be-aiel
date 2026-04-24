import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { AiConversationStatus, AiMessageRole } from '@prisma/client';
import { CreateMessageDto, CreateConversationDto, UpdateConversationDto, FindConversationsOptions, FindMessagesOptions } from '../dtos/ai-conversations.dto';
import { HistoryMessage } from '../providers/iProvider.interface';



@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new AI conversation
   */
  async createConversation(dto: CreateConversationDto) {
    const conversation = await this.prisma.aiConversation.create({
      data: {
        user_id: dto.userId,
        title: dto.title || null,
        status: AiConversationStatus.active,
        metadata_json: dto.metadata || null,
      },
    });

    return conversation;
  }

  /**
   * Find all conversations for a user
   */
  async findUserConversations(options: FindConversationsOptions) {
    const { userId, status, limit = 20, offset = 0 } = options;

    const where: any = { user_id: userId };
    if (status) {
      where.status = status;
    }

    const [conversations, total] = await Promise.all([
      this.prisma.aiConversation.findMany({
        where,
        orderBy: {
          last_message_at: 'desc',
        },
        take: limit,
        skip: offset,
        include: {
          messages: {
            orderBy: { created_at: 'desc' },
            take: 1, // Get last message for preview
            select: {
              amid: true,
              role: true,
              content: true,
              created_at: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      this.prisma.aiConversation.count({ where }),
    ]);

    return {
      conversations: conversations.map((conv) => ({
        conversationId: conv.acid,
        title: conv.title,
        status: conv.status,
        lastMessageAt: conv.last_message_at,
        messageCount: conv._count.messages,
        preview: conv.messages[0]?.content.substring(0, 100) || null,
        metadata: conv.metadata_json,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      })),
      total: limit ? total : conversations.length,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Find conversation by ID with ownership check
   */
  async findConversationById(conversationId: string, userId: string) {
    const conversation = await this.prisma.aiConversation.findUnique({
      where: { acid: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    if (conversation.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    return conversation;
  }

  /**
   * Get conversation with messages (paginated)
   */
  async getConversationWithMessages(
    conversationId: string,
    userId: string,
    options: { limit?: number; beforeMessageId?: string } = {},
  ) {
    // Verify ownership
    await this.findConversationById(conversationId, userId);

    const { limit = 50, beforeMessageId } = options;

    const where: any = { conversation_id: conversationId };

    // Pagination: get messages before a specific message
    if (beforeMessageId) {
      const beforeMessage = await this.prisma.aiMessage.findUnique({
        where: { amid: beforeMessageId },
        select: { created_at: true },
      });

      if (beforeMessage) {
        where.created_at = { lt: beforeMessage.created_at };
      }
    }

    const [conversation, messages, totalMessages] = await Promise.all([
      this.prisma.aiConversation.findUnique({
        where: { acid: conversationId },
      }),
      this.prisma.aiMessage.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
      }),
      this.prisma.aiMessage.count({
        where: { conversation_id: conversationId },
      }),
    ]);

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    return {
      conversation: {
        conversationId: conversation.acid,
        title: conversation.title,
        status: conversation.status,
        metadata: conversation.metadata_json,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      },
      messages: messages.reverse().map((msg) => ({
        messageId: msg.amid,
        conversationId: msg.conversation_id,
        role: msg.role,
        content: msg.content,
        contentJson: msg.content_json,
        parentMessageId: msg.parent_message_id,
        promptTokens: msg.prompt_tokens,
        completionTokens: msg.completion_tokens,
        totalTokens: msg.total_tokens,
        modelName: msg.model_name,
        metadata: msg.metadata_json,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at,
      })),
      totalMessages,
      hasMore: totalMessages > messages.length,
    };
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    dto: UpdateConversationDto,
  ) {
    // Verify ownership
    await this.findConversationById(conversationId, userId);

    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.lastMessageAt !== undefined) updateData.last_message_at = dto.lastMessageAt;
    if (dto.metadata !== undefined) updateData.metadata_json = dto.metadata;

    const updated = await this.prisma.aiConversation.update({
      where: { acid: conversationId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Archive conversation (soft delete)
   */
  async archiveConversation(conversationId: string, userId: string) {
    return this.updateConversation(conversationId, userId, {
      status: AiConversationStatus.archived,
    });
  }

  /**
   * Delete conversation permanently
   */
  async deleteConversation(conversationId: string, userId: string) {
    // Verify ownership
    await this.findConversationById(conversationId, userId);

    await this.prisma.aiConversation.delete({
      where: { acid: conversationId },
    });
  }

  /**
   * Create a new message in conversation
   */
  async createMessage(dto: CreateMessageDto) {
    const message = await this.prisma.aiMessage.create({
      data: {
        conversation_id: dto.conversationId,
        role: dto.role,
        content: dto.content,
        content_json: dto.contentJson || null,
        parent_message_id: dto.parentMessageId || null,
        prompt_tokens: dto.promptTokens || null,
        completion_tokens: dto.completionTokens || null,
        total_tokens: dto.totalTokens || null,
        model_name: dto.modelName || null,
        metadata_json: dto.metadata || null,
      },
    });

    // Update conversation's last_message_at
    await this.prisma.aiConversation.update({
      where: { acid: dto.conversationId },
      data: { last_message_at: new Date() },
    });

    return message;
  }

  /**
   * Find messages by conversation (without pagination)
   */
  async findMessagesByConversation(conversationId: string, userId: string, limit = 100) {
    // Verify ownership
    await this.findConversationById(conversationId, userId);

    const messages = await this.prisma.aiMessage.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
      take: limit,
    });

    return messages;
  }

  /**
   * Get conversation history as HistoryMessage format for AI providers
   * @param conversationId - The conversation ID
   * @param userId - The user ID (for ownership verification)
   * @param convLimit - Maximum number of messages to retrieve (default: 20)
   * @param convOffset - Number of messages to skip from the end (default: 0)
   * @returns Array of HistoryMessage objects
   */
  async getConversationHistory(
    conversationId?: string,
    userId?: string,
    convLimit: number = 20,
    convOffset: number = 0,
  ): Promise<HistoryMessage[]> {
    // Validate required parameters
    if (!conversationId || !userId) {
      return [];
    }

    try {
      // Verify ownership
      await this.findConversationById(conversationId, userId);

      // Fetch messages with limit and offset
      const messages = await this.prisma.aiMessage.findMany({
        where: { conversation_id: conversationId },
        orderBy: { created_at: 'asc' },
        take: convLimit,
        skip: convOffset,
        select: {
          role: true,
          content: true,
        },
      });

      // Transform to HistoryMessage format
      return messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (error) {
      // Log error but return empty array to allow graceful degradation
      this.logger.warn(
        `Failed to fetch conversation history for ${conversationId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Generate conversation title from first user message
   */
  async generateConversationTitle(conversationId: string, userId: string): Promise<string> {
    const firstMessage = await this.prisma.aiMessage.findFirst({
      where: {
        conversation_id: conversationId,
        role: AiMessageRole.user,
      },
      orderBy: { created_at: 'asc' },
    });

    if (!firstMessage) {
      return 'New Conversation';
    }

    // Simple title generation: first 50 chars of first message
    const title = firstMessage.content.substring(0, 50).trim();
    return title + (firstMessage.content.length > 50 ? '...' : '');
  }

  /**
   * Get conversation summary (for context window optimization)
   */
  async getConversationSummary(conversationId: string, userId: string) {
    await this.findConversationById(conversationId, userId);

    const summary = await this.prisma.aiConversationSummary.findFirst({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'desc' },
    });

    return summary;
  }

  /**
   * Create conversation summary
   */
  async createConversationSummary(
    conversationId: string,
    uptoMessageId: string,
    summaryText: string,
    summaryJson?: any,
  ) {
    const summary = await this.prisma.aiConversationSummary.create({
      data: {
        conversation_id: conversationId,
        upto_message_id: uptoMessageId,
        summary_text: summaryText,
        summary_json: summaryJson || null,
      },
    });

    return summary;
  }
}
