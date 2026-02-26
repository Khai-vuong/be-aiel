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
import { CreateNotificationDto, UpdateNotificationDto, GetNotificationsFilterDto, CreateBulkNotificationDto, CreateClassNotificationDto } from './notifications.dto';
import {
  SwaggerGetAllNotifications,
  SwaggerGetAllNotificationsOfUser,
  SwaggerGetMyNotifications,
  SwaggerGetNotification,
  SwaggerCreateNotification,
  SwaggerCreateBulkNotification,
  SwaggerCreateClassNotification,
  SwaggerUpdateNotification,
  SwaggerDeleteNotification,
  SwaggerMarkAsRead,
  SwaggerMarkAllAsRead,
  SwaggerGetUnread,
  SwaggerGetUnreadCount,
} from './notifications.swagger';
import { InChargeGuard } from 'src/common/guards/in-charge.guard';

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
  @Roles('any')
  @SwaggerGetAllNotifications()
  async getAllNotifications(
    @Request() req,
    @Query() filter: GetNotificationsFilterDto,
  ) {
    return this.notificationsService.findAll(req.user, filter);
  }

  @Get('unread/count')
  @Roles('any')
  @SwaggerGetUnreadCount()
  async getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(req.user, req.user.uid);
  }

  @Get('unread')
  @Roles('any')
  @SwaggerGetUnread()
  async getUnreadNotifications(@Request() req) {
    return this.notificationsService.getUnreadNotifications(req.user, req.user.uid);
  }

  @Get('me')
  @Roles('any')
  @SwaggerGetMyNotifications()
  async getMyNotifications(
    @Request() req, 
    @Query() filter: GetNotificationsFilterDto,
  ) {
    return this.notificationsService.findAllOfUser(req.user, req.user.uid, filter);
  }

  @Roles('Admin')
  @Get('/user/:userId')
  @SwaggerGetAllNotificationsOfUser()
  async getAllNotificationsOfUser(
    @Request() req,
    @Param('userId') userId: string,
    @Query() filter: GetNotificationsFilterDto,
  ) {
    return this.notificationsService.findAllOfUser(req.user, userId, filter);
  }

  @Put('mark-as-read/all')
  @Roles('any')
  @SwaggerMarkAllAsRead()
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user, req.user.uid);
  }

  @Get(':nid')
  @Roles('any')
  @SwaggerGetNotification()
  async getNotification(
    @Request() req,
    @Param('nid') nid: string,
  ) {
    return this.notificationsService.findOne(req.user, nid);
  }

  @Put(':nid/mark-as-read')
  @Roles('any')
  @SwaggerMarkAsRead()
  async markAsRead(@Request() req, @Param('nid') nid: string) {
    return this.notificationsService.markAsRead(req.user, nid);
  }


  @Post()
  @Roles('Lecturer', 'Admin')
  @SwaggerCreateNotification()
  async createNotification(@Request() req, @Body() createNotificationDto: CreateNotificationDto) {
    console.log('Received create notification request:', createNotificationDto);
    return this.notificationsService.create(req.user, createNotificationDto);
  }

  @Post('bulk/class/:clid')
  @Roles('Lecturer', 'Admin')
  @UseGuards(InChargeGuard)
  @SwaggerCreateClassNotification()
  async createClassNotification(
    @Request() req,
    @Param('clid') clid: string,
    @Body() createClassNotificationDto: CreateClassNotificationDto,
  ) {
    return this.notificationsService.notifyClass(req.user, clid, createClassNotificationDto);
  }

  @Post('bulk')
  @Roles('Lecturer', 'Admin')
  @SwaggerCreateBulkNotification()
  async createBulkNotification(@Request() req, @Body() createBulkNotificationDto: CreateBulkNotificationDto) {
    const { recipients, ...notificationData } = createBulkNotificationDto;
    return this.notificationsService.notifyUsers(req.user, recipients, notificationData);
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
    return this.notificationsService.update(req.user, nid, updaterUid, updateNotificationDto);
  }

  @Delete(':nid')
  @Roles('any')
  @SwaggerDeleteNotification()
  async deleteNotification(@Param('nid') nid: string, @Request() req) {
    const requesterUid = req.user.uid;
    return this.notificationsService.delete(req.user, nid, requesterUid);
  }
}
