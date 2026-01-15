import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Notification } from '@prisma/client';
import { CreateNotificationDto, UpdateNotificationDto, GetNotificationsFilterDto } from './notifications.dto';

/**
 * NotificationsService
 *
 * Manages notification operations for users.
 *
 * Public Methods:
 * - findAll(userId: string, filter?: GetNotificationsFilterDto): Promise<Notification[]>
 *     Retrieves all notifications for a user with optional filtering
 *
 * - findOne(id: string, userId: string): Promise<Notification>
 *     Retrieves a single notification by ID, verifying ownership
 *
 * - findUnread(userId: string): Promise<Notification[]>
 *     Retrieves all unread notifications for a user
 *
 * - create(createData: CreateNotificationDto): Promise<Notification>
 *     Creates a new notification for a user
 *
 * - update(id: string, userId: string, updateData: UpdateNotificationDto): Promise<Notification>
 *     Updates a notification (usually to mark as read)
 *
 * - delete(id: string, userId: string): Promise<Notification>
 *     Deletes a notification
 *
 * - markAsRead(id: string, userId: string): Promise<Notification>
 *     Marks a single notification as read
 *
 * - markAllAsRead(userId: string): Promise<{ count: number }>
 *     Marks all notifications for a user as read
 *
 * - createForUser(userId: string, createData: CreateNotificationDto): Promise<Notification>
 *     Internal method to create a notification for a specific user
 *
 * - notifyUsers(userIds: string[], createData: Omit<CreateNotificationDto, 'user_id'>): Promise<Notification[]>
 *     Creates notifications for multiple users at once
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all notifications for a user
   */
  async findAll(userId: string, filter?: GetNotificationsFilterDto): Promise<Notification[]> {
    // Verify user exists
    await this.verifyUserExists(userId);

    return this.prisma.notification.findMany({
      where: {
        user_id: userId,
        ...(filter?.is_read !== undefined && { is_read: filter.is_read }),
        ...(filter?.type && { type: filter.type }),
      },
      orderBy: {
        created_at: 'desc',
      },
      take: filter?.limit || 50,
      skip: filter?.skip || 0,
    });
  }

  /**
   * Get a single notification
   */
  async findOne(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { nid: id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    if (notification.user_id !== userId) {
      throw new BadRequestException('You do not have permission to access this notification');
    }

    return notification;
  }

  /**
   * Get unread notifications for a user
   */
  async findUnread(userId: string): Promise<Notification[]> {
    await this.verifyUserExists(userId);

    return this.prisma.notification.findMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Create a notification for a user
   */
  async create(createData: CreateNotificationDto): Promise<Notification> {
    // Verify user exists
    await this.verifyUserExists(createData.user_id);

    // Validate related resource if provided
    if (createData.related_id && createData.related_type) {
      await this.verifyRelatedResource(createData.related_type, createData.related_id);
    }

    return this.prisma.notification.create({
      data: {
        title: createData.title,
        message: createData.message,
        type: createData.type || 'general',
        is_read: false,
        related_type: createData.related_type || null,
        related_id: createData.related_id || null,
        user_id: createData.user_id,
      },
    });
  }

  /**
   * Update a notification
   */
  async update(id: string, userId: string, updateData: UpdateNotificationDto): Promise<Notification> {
    // Verify ownership
    const notification = await this.findOne(id, userId);

    return this.prisma.notification.update({
      where: { nid: id },
      data: {
        title: updateData.title || notification.title,
        message: updateData.message || notification.message,
        is_read: updateData.is_read !== undefined ? updateData.is_read : notification.is_read,
        type: updateData.type || notification.type,
      },
    });
  }

  /**
   * Delete a notification
   */
  async delete(id: string, userId: string): Promise<Notification> {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.notification.delete({
      where: { nid: id },
    });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.notification.update({
      where: { nid: id },
      data: { is_read: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    await this.verifyUserExists(userId);

    const result = await this.prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });

    return { count: result.count };
  }

  /**
   * Create a notification for a specific user (internal use)
   */
  async createForUser(userId: string, createData: Omit<CreateNotificationDto, 'user_id'>): Promise<Notification> {
    return this.create({
      ...createData,
      user_id: userId,
    });
  }

  /**
   * Create notifications for multiple users at once
   */
  async notifyUsers(
    userIds: string[],
    createData: Omit<CreateNotificationDto, 'user_id'>,
  ): Promise<Notification[]> {
    // Verify all users exist
    const users = await this.prisma.user.findMany({
      where: {
        uid: { in: userIds },
      },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException('One or more users do not exist');
    }

    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.createForUser(userId, createData),
      ),
    );

    return notifications;
  }

  /**
   * Helper method to verify user exists
   */
  private async verifyUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { uid: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  /**
   * Helper method to verify related resource exists
   */
  private async verifyRelatedResource(resourceType: string, resourceId: string): Promise<void> {
    switch (resourceType) {
      case 'Quiz':
        const quiz = await this.prisma.quiz.findUnique({
          where: { qid: resourceId },
        });
        if (!quiz) {
          throw new NotFoundException(`Quiz with ID ${resourceId} not found`);
        }
        break;

      case 'Course':
        const course = await this.prisma.course.findUnique({
          where: { cid: resourceId },
        });
        if (!course) {
          throw new NotFoundException(`Course with ID ${resourceId} not found`);
        }
        break;

      case 'Attempt':
        const attempt = await this.prisma.attempt.findUnique({
          where: { atid: resourceId },
        });
        if (!attempt) {
          throw new NotFoundException(`Attempt with ID ${resourceId} not found`);
        }
        break;

      case 'Class':
        const cls = await this.prisma.class.findUnique({
          where: { clid: resourceId },
        });
        if (!cls) {
          throw new NotFoundException(`Class with ID ${resourceId} not found`);
        }
        break;

      default:
        // For unknown types, we won't validate
        break;
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    await this.verifyUserExists(userId);

    return this.prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }
}
