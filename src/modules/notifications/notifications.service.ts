import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { Notification } from '@prisma/client';
import { CreateNotificationDto, UpdateNotificationDto, GetNotificationsFilterDto } from './notifications.dto';
import { LogService } from '../logs';
import { JwtPayload } from '../users/jwt.strategy';

/**
 * NotificationsService
 *
 * Manages notification operations for users.
 * All methods accept user: JwtPayload as the first parameter for authentication context.
 *
 * Public Methods:
 * - findAll(user: JwtPayload, filter?: GetNotificationsFilterDto): Promise<Notification[]>
 *     Retrieves all notifications with optional filtering (no user filtering)
 *
 * - findAllOfUser(user: JwtPayload, userId: string, filter?: GetNotificationsFilterDto): Promise<Notification[]>
 *     Retrieves all notifications for a user with optional filtering
 *
 * - findOne(user: JwtPayload, nid: string): Promise<Notification>
 *     Retrieves a single notification by ID
 *
 * - getUnreadCount(user: JwtPayload, userId: string): Promise<number>
 *     Gets the count of unread notifications for a user
 *
 * - getUnreadNotifications(user: JwtPayload, userId: string): Promise<Notification[]>
 *     Retrieves all unread notifications for a user
 *
 * - markAsRead(user: JwtPayload, nid: string): Promise<Notification>
 *     Marks a single notification as read
 *
 * - markAllAsRead(user: JwtPayload, userId: string): Promise<{ count: number }>
 *     Marks all notifications for a user as read
 *
 * - create(user: JwtPayload, createData: CreateNotificationDto): Promise<Notification>
 *     Creates a new notification for a user
 *
 * - update(user: JwtPayload, nid: string, updaterUid: string, updateData: UpdateNotificationDto): Promise<Notification>
 *     Updates a notification with permission verification
 *
 * - delete(user: JwtPayload, nid: string, requesterUid: string): Promise<Notification>
 *     Deletes a notification with permission verification
 *
 * - notifyOneUser(user: JwtPayload, createData: CreateNotificationDto): Promise<Notification>
 *     Creates a notification for a single user (used by other services)
 *
 * - notifyUsers(user: JwtPayload, userIds: string[], createData: Omit<CreateNotificationDto, 'recipient_uid'>): Promise<Notification[]>
 *     Creates notifications for multiple users at once
 *
 * - notifyClass(user: JwtPayload, classId: string, createData: Omit<CreateNotificationDto, 'recipient_uid'>): Promise<Notification[]>
 *     Creates notifications for all students in a class (used by other services and routes)
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {}

  async findAll(user: JwtPayload, filter?: GetNotificationsFilterDto): Promise<Notification[]> {
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

  async findAllOfUser(user: JwtPayload, userId: string, filter?: GetNotificationsFilterDto): Promise<Notification[]> {
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

  async findOne(user: JwtPayload, nid: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { nid: nid },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${nid} not found`);
    }

    return notification;
  }

  async getUnreadCount(user: JwtPayload, userId: string): Promise<number> 
  {
    await this.verifyUserExists(userId);

    return this.prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }

  async getUnreadNotifications(user: JwtPayload, userId: string): Promise<Notification[]> {
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

  async markAsRead(user: JwtPayload, nid: string): Promise<Notification> {
    const notification = await this.findOne(user, nid);

    const updatedNotification = await this.prisma.notification.update({
      where: { nid: nid },
      data: { is_read: true },
    });

    await this.logService.createLog('mark_notification_as_read', user.uid, 'Notification', nid);
    
    return updatedNotification;
  }

  async markAllAsRead(user: JwtPayload, userId: string): Promise<{ count: number }> {
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

    await this.logService.createLog('mark_all_notifications_as_read', user.uid, 'Notification', userId);
    return { count: result.count };
  }


  async create(user: JwtPayload, createData: CreateNotificationDto): Promise<Notification> {
    await this.verifyUserExists(createData.recipient_uid);

    const newNotification = await this.prisma.notification.create({
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

    console.log(`Notification created ${newNotification}`);
    await this.logService.createLog('create_notification', user.uid, 'Notification', newNotification.nid);

    return newNotification;
  }

  async update(user: JwtPayload, nid: string, updaterUid: string, updateData: UpdateNotificationDto): Promise<Notification> {
    await this.verifyUserPermission(updaterUid, nid);

    const updatedNotification = await this.prisma.notification.update({
      where: { nid: nid },
      data: {
        title: updateData.title,
        message: updateData.message,
        type: updateData.type,
      },
    });

    await this.logService.createLog('update_notification', user.uid, 'Notification', nid);
    return updatedNotification;
  }

  async delete(user: JwtPayload, nid: string, requesterUid: string): Promise<Notification> {
    await this.verifyUserPermission(requesterUid, nid);

    const deletedNotification = await this.prisma.notification.delete({
      where: { nid: nid },
    });

    await this.logService.createLog('delete_notification', user.uid, 'Notification', nid);
    return deletedNotification;
  }

  /**
   * region: For Other Services
   */

  async notifyOneUser(user: JwtPayload, createData: CreateNotificationDto): Promise<Notification> 
  {
    await this.verifyUserExists(createData.recipient_uid);

    const notification = await this.create(user, {
      ...createData,
    });

    await this.logService.createLog('notify_one_user', user.uid, 'Notification', notification.nid);
    return notification;
  }

  async notifyUsers(
    user: JwtPayload,
    userIds: string[],
    createData: Omit<CreateNotificationDto, 'recipient_uid'>
  ): Promise<Notification[]>
    {
      await Promise.all(userIds.map(uid => this.verifyUserExists(uid)));

      const notifications = await Promise.all(
        userIds.map((recipientId) =>
          this.create(user, {
            ...createData,
            recipient_uid: recipientId,
          }),
        ),
      );
      console.log(`notifyUsers on call \n`);
      await this.logService.createLog('notify_multiple_users', user.uid, 'Notification', undefined);
      return notifications;
    }

  async notifyClass(
    user: JwtPayload,
    classId: string,
    createData: Omit<CreateNotificationDto, 'recipient_uid'>
  ): Promise<Notification[]> {
    // Get class with students (excluding lecturers)
    const classInfo = await this.prisma.class.findUnique({
      where: { clid: classId },
      include: {
        students: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!classInfo) {
      throw new NotFoundException(`Class with ID ${classId} not found`);
    }

    // Extract student user IDs
    const studentUserIds = classInfo.students.map(student => student.user_id);

    if (studentUserIds.length === 0) {
      throw new BadRequestException(`No students found in class ${classId}`);
    }

    const notifications = await this.notifyUsers(user, studentUserIds, createData);

    console.log(`notifyClass on call \n`);

    await this.logService.createLog('notify_class', user.uid, 'Class', classId);
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
