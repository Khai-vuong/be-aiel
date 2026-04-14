import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InChargeGuard } from '../../common/guards/in-charge.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    findAll: jest.fn(),
    getUnreadCount: jest.fn(),
    getUnreadNotifications: jest.fn(),
    findAllOfUser: jest.fn(),
    markAllAsRead: jest.fn(),
    findOne: jest.fn(),
    markAsRead: jest.fn(),
    create: jest.fn(),
    notifyClass: jest.fn(),
    notifyUsers: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockReq = { user: { uid: 'user_123' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(InChargeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('getAllNotifications', async () => {
    const filter: any = { limit: 10 };
    mockNotificationsService.findAll.mockResolvedValue([]);
    expect(await controller.getAllNotifications(mockReq, filter)).toEqual([]);
    expect(mockNotificationsService.findAll).toHaveBeenCalledWith(
      mockReq.user,
      filter,
    );
  });

  it('getUnreadCount', async () => {
    mockNotificationsService.getUnreadCount.mockResolvedValue(5);
    expect(await controller.getUnreadCount(mockReq)).toEqual(5);
    expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith(
      mockReq.user,
      'user_123',
    );
  });

  it('getUnreadNotifications', async () => {
    mockNotificationsService.getUnreadNotifications.mockResolvedValue([]);
    expect(await controller.getUnreadNotifications(mockReq)).toEqual([]);
    expect(
      mockNotificationsService.getUnreadNotifications,
    ).toHaveBeenCalledWith(mockReq.user, 'user_123');
  });

  it('getMyNotifications', async () => {
    const filter: any = {};
    mockNotificationsService.findAllOfUser.mockResolvedValue([]);
    expect(await controller.getMyNotifications(mockReq, filter)).toEqual([]);
    expect(mockNotificationsService.findAllOfUser).toHaveBeenCalledWith(
      mockReq.user,
      'user_123',
      filter,
    );
  });

  it('getAllNotificationsOfUser', async () => {
    const filter: any = {};
    mockNotificationsService.findAllOfUser.mockResolvedValue([]);
    expect(
      await controller.getAllNotificationsOfUser(mockReq, 'user_456', filter),
    ).toEqual([]);
    expect(mockNotificationsService.findAllOfUser).toHaveBeenCalledWith(
      mockReq.user,
      'user_456',
      filter,
    );
  });

  it('markAllAsRead', async () => {
    mockNotificationsService.markAllAsRead.mockResolvedValue({ count: 10 });
    expect(await controller.markAllAsRead(mockReq)).toEqual({ count: 10 });
    expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith(
      mockReq.user,
      'user_123',
    );
  });

  it('getNotification', async () => {
    mockNotificationsService.findOne.mockResolvedValue({ nid: 'n1' });
    expect(await controller.getNotification(mockReq, 'n1')).toEqual({
      nid: 'n1',
    });
  });

  it('markAsRead', async () => {
    mockNotificationsService.markAsRead.mockResolvedValue({
      nid: 'n1',
      is_read: true,
    });
    expect(await controller.markAsRead(mockReq, 'n1')).toEqual({
      nid: 'n1',
      is_read: true,
    });
  });

  it('createNotification', async () => {
    const dto: any = { title: 'Test' };
    mockNotificationsService.create.mockResolvedValue({ nid: 'n1' });
    expect(await controller.createNotification(mockReq, dto)).toEqual({
      nid: 'n1',
    });
  });

  it('createClassNotification', async () => {
    const dto: any = { title: 'Class Alert' };
    mockNotificationsService.notifyClass.mockResolvedValue([{ nid: 'n1' }]);
    expect(
      await controller.createClassNotification(mockReq, 'class_1', dto),
    ).toEqual([{ nid: 'n1' }]);
  });

  it('createBulkNotification', async () => {
    const dto: any = { recipients: ['user_1', 'user_2'], title: 'Bulk Alert' };
    mockNotificationsService.notifyUsers.mockResolvedValue([{ nid: 'n1' }]);
    expect(await controller.createBulkNotification(mockReq, dto)).toEqual([
      { nid: 'n1' },
    ]);
    expect(mockNotificationsService.notifyUsers).toHaveBeenCalledWith(
      mockReq.user,
      ['user_1', 'user_2'],
      { title: 'Bulk Alert' },
    );
  });

  it('updateNotification', async () => {
    const dto: any = { title: 'Updated' };
    mockNotificationsService.update.mockResolvedValue({ nid: 'n1' });
    expect(await controller.updateNotification('n1', mockReq, dto)).toEqual({
      nid: 'n1',
    });
    expect(mockNotificationsService.update).toHaveBeenCalledWith(
      mockReq.user,
      'n1',
      'user_123',
      dto,
    );
  });

  it('deleteNotification', async () => {
    mockNotificationsService.delete.mockResolvedValue({ nid: 'n1' });
    expect(await controller.deleteNotification('n1', mockReq)).toEqual({
      nid: 'n1',
    });
    expect(mockNotificationsService.delete).toHaveBeenCalledWith(
      mockReq.user,
      'n1',
      'user_123',
    );
  });
});
