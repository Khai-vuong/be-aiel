import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto, GetNotificationsFilterDto } from './notifications.dto';
import {
  SwaggerGetAllNotifications,
  SwaggerGetNotification,
  SwaggerCreateNotification,
  SwaggerUpdateNotification,
  SwaggerDeleteNotification,
  SwaggerMarkAsRead,
  SwaggerMarkAllAsRead,
  SwaggerGetUnread,
  SwaggerGetUnreadCount,
} from './notifications.swagger';

@ApiTags('notifications')
@UseGuards(JwtGuard, RolesGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get all notifications for the current user
   */
  @Get()
  @SwaggerGetAllNotifications()
  async getAllNotifications(
    @Query() filter: GetNotificationsFilterDto,
  ) {
    // Get user from JWT - this would typically come from @GetUser() decorator
    // For now, we'll need to pass userId. In a real app, extract from JWT token
    throw new BadRequestException('User ID is required');
  }

  /**
   * Get unread notifications count for the current user
   */
  @Get('unread/count')
  @SwaggerGetUnreadCount()
  async getUnreadCount() {
    throw new BadRequestException('User ID is required');
  }

  /**
   * Get all unread notifications for the current user
   */
  @Get('unread')
  @SwaggerGetUnread()
  async getUnreadNotifications() {
    throw new BadRequestException('User ID is required');
  }

  /**
   * Get a single notification by ID
   */
  @Get(':id')
  @SwaggerGetNotification()
  async getNotification(@Param('id') id: string) {
    throw new BadRequestException('User ID is required');
  }

  /**
   * Create a new notification (Admin/Lecturer only)
   */
  @Post()
  @Roles('Lecturer', 'Admin')
  @SwaggerCreateNotification()
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  /**
   * Update a notification (mark as read, update message, etc.)
   */
  @Put(':id')
  @SwaggerUpdateNotification()
  async updateNotification(
    @Param('id') id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    throw new BadRequestException('User ID is required');
  }

  /**
   * Mark a single notification as read
   */
  @Put(':id/mark-as-read')
  @SwaggerMarkAsRead()
  async markAsRead(@Param('id') id: string) {
    throw new BadRequestException('User ID is required');
  }

  /**
   * Mark all notifications as read for the current user
   */
  @Put('mark-all/as-read')
  @SwaggerMarkAllAsRead()
  async markAllAsRead() {
    throw new BadRequestException('User ID is required');
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  @SwaggerDeleteNotification()
  async deleteNotification(@Param('id') id: string) {
    throw new BadRequestException('User ID is required');
  }
}
