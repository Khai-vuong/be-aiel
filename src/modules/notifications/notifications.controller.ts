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
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto, GetNotificationsFilterDto, CreateBulkNotificationDto } from './notifications.dto';
import {
  SwaggerGetAllNotifications,
  SwaggerGetAllNotificationsOfUser,
  SwaggerGetMyNotifications,
  SwaggerGetNotification,
  SwaggerCreateNotification,
  SwaggerCreateBulkNotification,
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

  @Get()
  @SwaggerGetAllNotifications()
  async getAllNotifications(
    @Query() filter: GetNotificationsFilterDto,
  ) {
    return this.notificationsService.findAll(filter);
  }

  @Get('unread/count')
  @SwaggerGetUnreadCount()
  async getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user.uid);
  }

  @Get('unread')
  @SwaggerGetUnread()
  async getUnreadNotifications(@Request() req) {
    return this.notificationsService.getUnreadNotifications(req.user.uid);
  }

  @Get('me')
  @SwaggerGetMyNotifications()
  async getMyNotifications(
    @Request() req, 
    @Query() filter: GetNotificationsFilterDto,
  ) {
    return this.notificationsService.findAllOfUser(req.user.uid, filter);
  }

  @Roles('Admin')
  @Get('/user/:userId')
  @SwaggerGetAllNotificationsOfUser()
  async getAllNotificationsOfUser(
    @Param('userId') userId: string,
    @Query() filter: GetNotificationsFilterDto,
  ) {
    return this.notificationsService.findAllOfUser(userId, filter);
  }

  @Get(':nid')
  @SwaggerGetNotification()
  async getNotification(
    @Param('nid') nid: string,
  ) {
    return this.notificationsService.findOne(nid);
  }

  @Put(':nid/mark-as-read')
  @SwaggerMarkAsRead()
  async markAsRead(@Param('nid') nid: string) {
    return this.notificationsService.markAsRead(nid);
  }

  @Put('mark-as-read/all')
  @SwaggerMarkAllAsRead()
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.uid);
  }


  @Post()
  @Roles('Lecturer', 'Admin')
  @SwaggerCreateNotification()
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Post('bulk')
  @Roles('Lecturer', 'Admin')
  @SwaggerCreateBulkNotification()
  async createBulkNotification(@Body() createBulkNotificationDto: CreateBulkNotificationDto) {
    const { recipients, ...notificationData } = createBulkNotificationDto;
    return this.notificationsService.notifyUsers(recipients, notificationData);
  }

  @Put(':nid')
  @Roles('Lecturer', 'Admin')
  @SwaggerUpdateNotification()
  async updateNotification(
    @Param('nid') nid: string,
    @Request() req,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    const updaterUid = req.user.uid;
    return this.notificationsService.update(nid, updaterUid, updateNotificationDto);
  }

  @Delete(':nid')
  @SwaggerDeleteNotification()
  async deleteNotification(@Param('nid') nid: string, @Request() req) {
    const requesterUid = req.user.uid;
    return this.notificationsService.delete(nid, requesterUid);
  }
}
