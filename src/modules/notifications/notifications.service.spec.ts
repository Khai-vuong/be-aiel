import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma.service';
import { LogService } from '../logs';
import {
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma = {
    notification: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    class: {
      findUnique: jest.fn(),
    },
  };

  const mockLogService = { createLog: jest.fn() };
  const mockUser = { uid: 'user_123', role: 'Student' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LogService, useValue: mockLogService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('thành công (Có kèm filter)', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ nid: 'n1' }]);
      const result = await service.findAll(mockUser, {
        is_read: false,
        type: 'general',
        limit: 10,
        skip: 5,
      });
      expect(result).toEqual([{ nid: 'n1' }]);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_read: false, type: 'general' },
          take: 10,
          skip: 5,
        }),
      );
    });

    it('thành công (Không truyền filter)', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ nid: 'n1' }]);
      await service.findAll(mockUser);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });
  });

  describe('findAllOfUser', () => {
    it('lỗi nếu user không tồn tại', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.findAllOfUser(mockUser, 'invalid_user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('thành công', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ uid: 'user_1' });
      mockPrisma.notification.findMany.mockResolvedValue([{ nid: 'n1' }]);
      const res = await service.findAllOfUser(mockUser, 'user_1');
      expect(res).toEqual([{ nid: 'n1' }]);
    });
  });

  describe('findOne & markAsRead', () => {
    it('findOne lỗi nếu notification không tồn tại', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.findOne(mockUser, 'n1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('markAsRead thành công', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({ nid: 'n1' });
      mockPrisma.notification.update.mockResolvedValue({
        nid: 'n1',
        is_read: true,
      });
      const res = await service.markAsRead(mockUser, 'n1');
      expect(res.is_read).toBe(true);
      expect(mockLogService.createLog).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount & getUnreadNotifications & markAllAsRead', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ uid: 'user_1' }); // Bỏ qua check UserExists
    });

    it('getUnreadCount', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);
      expect(await service.getUnreadCount(mockUser, 'user_1')).toBe(5);
    });

    it('getUnreadNotifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ nid: 'n1' }]);
      expect(await service.getUnreadNotifications(mockUser, 'user_1')).toEqual([
        { nid: 'n1' },
      ]);
    });

    it('markAllAsRead', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });
      expect(await service.markAllAsRead(mockUser, 'user_1')).toEqual({
        count: 3,
      });
    });
  });

  describe('verifyUserPermission (Helpers)', () => {
    it('lỗi nếu user không tồn tại', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.notification.findUnique.mockResolvedValue({ nid: 'n1' });
      await expect(service.update(mockUser, 'n1', 'u1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lỗi nếu notification không tồn tại', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ uid: 'u1' });
      mockPrisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.update(mockUser, 'n1', 'u1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lỗi Unauthorized nếu không phải Admin và không phải chủ thông báo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'u1',
        role: 'Student',
      });
      mockPrisma.notification.findUnique.mockResolvedValue({
        nid: 'n1',
        user_id: 'other_user',
      });
      await expect(service.delete(mockUser, 'n1', 'u1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('thành công nếu là Admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'admin_1',
        role: 'Admin',
      });
      mockPrisma.notification.findUnique.mockResolvedValue({
        nid: 'n1',
        user_id: 'other_user',
      });
      mockPrisma.notification.delete.mockResolvedValue({ nid: 'n1' });
      const res = await service.delete(mockUser, 'n1', 'admin_1');
      expect(res.nid).toBe('n1');
    });

    it('thành công nếu là chủ thông báo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'u1',
        role: 'Student',
      });
      mockPrisma.notification.findUnique.mockResolvedValue({
        nid: 'n1',
        user_id: 'u1',
      });
      mockPrisma.notification.update.mockResolvedValue({ nid: 'n1' });
      const res = await service.update(mockUser, 'n1', 'u1', { title: 'new' });
      expect(res.nid).toBe('n1');
    });
  });

  describe('Bulk & Class Notifications', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({ uid: 'user_1' }); // Pass UserExists
      mockPrisma.notification.create.mockResolvedValue({ nid: 'n_new' });
    });

    it('notifyOneUser thành công', async () => {
      const res = await service.notifyOneUser(mockUser, {
        recipient_uid: 'u1',
        title: 't',
        message: 'm',
      });
      expect(res.nid).toBe('n_new');
    });

    it('notifyUsers thành công', async () => {
      const res = await service.notifyUsers(mockUser, ['u1', 'u2'], {
        title: 't',
        message: 'm',
      });
      expect(res.length).toBe(2);
    });

    it('notifyClass: lỗi nếu lớp không tồn tại', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(
        service.notifyClass(mockUser, 'c1', { title: 't', message: 'm' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('notifyClass: lỗi nếu lớp không có học sinh', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({
        clid: 'c1',
        students: [],
      });
      await expect(
        service.notifyClass(mockUser, 'c1', { title: 't', message: 'm' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('notifyClass: thành công', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({
        clid: 'c1',
        students: [{ user_id: 'student_1' }, { user_id: 'student_2' }],
      });
      const res = await service.notifyClass(mockUser, 'c1', {
        title: 't',
        message: 'm',
      });
      expect(res.length).toBe(2); // Vì gọi notifyUsers cho 2 user
    });
  });
});
