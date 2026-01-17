import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Notification } from '@prisma/client';
import { CreateNotificationDto, UpdateNotificationDto, GetNotificationsFilterDto } from './notifications.dto';

/**
 * NotificationsService
 *
 * Manages notification operations for users.
 *
 * Public Methods:
 * - findAll(filter?: GetNotificationsFilterDto): Promise<Notification[]>
 *     Retrieves all notifications with optional filtering (no user filtering)
 *
 * - findAllOfUser(userId: string, filter?: GetNotificationsFilterDto): Promise<Notification[]>
 *     Retrieves all notifications for a user with optional filtering
 *
 * - findOne(nid: string): Promise<Notification>
 *     Retrieves a single notification by ID
 *
 * - getUnreadCount(userId: string): Promise<number>
 *     Gets the count of unread notifications for a user
 *
 * - getUnreadNotifications(userId: string): Promise<Notification[]>
 *     Retrieves all unread notifications for a user
 *
 * - markAsRead(nid: string): Promise<Notification>
 *     Marks a single notification as read
 *
 * - markAllAsRead(userId: string): Promise<{ count: number }>
 *     Marks all notifications for a user as read
 *
 * - create(createData: CreateNotificationDto): Promise<Notification>
 *     Creates a new notification for a user
 *
 * - update(nid: string, updaterUid: string, updateData: UpdateNotificationDto): Promise<Notification>
 *     Updates a notification with permission verification
 *
 * - delete(nid: string, requesterUid: string): Promise<Notification>
 *     Deletes a notification with permission verification
 *
 * - notifyOneUser(createData: CreateNotificationDto): Promise<Notification>
 *     Creates a notification for a single user (used by other services)
 *
 * - notifyUsers(userIds: string[], createData: Omit<CreateNotificationDto, 'recipient_uid'>): Promise<Notification[]>
 *     Creates notifications for multiple users at once (used by other services)
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter?: GetNotificationsFilterDto): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        ...(filter?.is_read !== undefined && { is_read: filter.is_read }), //spread the filter property if exists
        ...(filter?.type && { type: filter.type }),
      },
      orderBy: {
        created_at: 'desc',
      },
      take: filter?.limit || 50,
      skip: filter?.skip || 0,
    });
  }

  async findAllOfUser(userId: string, filter?: GetNotificationsFilterDto): Promise<Notification[]> {
    await this.verifyUserExists(userId);

    return this.prisma.notification.findMany({
      where: {
        user_id: userId,
        ...(filter?.is_read !== undefined && { is_read: filter.is_read }), //spread the filter property if exists
        ...(filter?.type && { type: filter.type }),
      },
      orderBy: {
        created_at: 'desc',
      },
      take: filter?.limit || 50,
      skip: filter?.skip || 0,
    });
  }

  async findOne(nid: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { nid: nid },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${nid} not found`);
    }

    return notification;
  }

  async getUnreadCount(userId: string): Promise<number> 
  {
    await this.verifyUserExists(userId);

    return this.prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
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

  async markAsRead(nid: string): Promise<Notification> {
    await this.findOne(nid);

    return this.prisma.notification.update({
      where: { nid: nid },
      data: { is_read: true },
    });
  }

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


  async create(createData: CreateNotificationDto): Promise<Notification> {
    await this.verifyUserExists(createData.recipient_uid);

    return this.prisma.notification.create({
      data: {
        title: createData.title,
        message: createData.message,
        type: createData.type || 'general',
        is_read: false,
        related_type: createData.related_type || null,
        related_id: createData.related_id || null,
        user_id: createData.recipient_uid,
      },
    });
  }

  async update(nid: string, updaterUid: string, updateData: UpdateNotificationDto): Promise<Notification> {
    await this.verifyUserPermission(updaterUid, nid);

    return this.prisma.notification.update({
      where: { nid: nid },
      data: {
        title: updateData.title,
        message: updateData.message,
        type: updateData.type,
      },
    });
  }

  async delete(nid: string, requesterUid: string): Promise<Notification> {
    await this.verifyUserPermission(requesterUid, nid);

    return this.prisma.notification.delete({
      where: { nid: nid },
    });
  }

  /**
   * region: For Other Services
   */

  async notifyOneUser(createData: CreateNotificationDto): Promise<Notification> 
  {
    await this.verifyUserExists(createData.recipient_uid);

    return this.create({
      ...createData,
    });
  }

  async notifyUsers(
    userIds: string[],
    createData: Omit<CreateNotificationDto, 'recipient_uid'>
  ): Promise<Notification[]>
    {
      await Promise.all(userIds.map(uid => this.verifyUserExists(uid)));

      const notifications = await Promise.all(
        userIds.map((userId) =>
          this.create({
            ...createData,
            recipient_uid: userId,
          }),
        ),
      );
      return notifications;
    }

  /**region: Helpers */
  private async verifyUserExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { uid: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return true;
  }

  private async verifyUserPermission(userId: string, nid: string)
    : Promise<{ user: any; notification: Notification }> 
  {
    const userExist = this.prisma.user.findUnique({
      where: { uid: userId },
    });

    const notificationExist =  this.prisma.notification.findUnique({
      where : {nid},
    })

    const [user, notification] = await Promise.all([userExist, notificationExist]);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${nid} not found`);
    }

    if (notification.user_id !== userId && user.role !== 'Admin') {
      throw new UnauthorizedException(`User with ID ${userId} does not have permission for notification ID ${nid}`);
    }

    return {
      user, notification
    }
  }

}
