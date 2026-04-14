import { Test, TestingModule } from '@nestjs/testing';
import { LogService } from './logs.service';
import { PrismaService } from '../../prisma.service';
import { RequestContextService } from '../../common/context';
import { BadRequestException } from '@nestjs/common';

describe('LogService', () => {
  let service: LogService;

  const mockPrisma = {
    log: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    class: {
      findUnique: jest.fn(),
    },
  };

  const mockRequestContextService = {
    getUserId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RequestContextService, useValue: mockRequestContextService },
      ],
    }).compile();

    service = module.get<LogService>(LogService);
    jest.clearAllMocks();
  });

  describe('Private Methods & Simple Queries', () => {
    it('getUserId (Test Private Method)', () => {
      mockRequestContextService.getUserId.mockReturnValue('user_context');
      // Dùng cú pháp [] để test hàm private trong Typescript
      const result = service['getUserId']();
      expect(result).toBe('user_context');
      expect(mockRequestContextService.getUserId).toHaveBeenCalled();
    });

    it('createLog', async () => {
      mockPrisma.log.create.mockResolvedValue({ id: 1 });
      const res = await service.createLog('LOGIN', 'u1', 'Auth', 'res1');
      expect(mockPrisma.log.create).toHaveBeenCalledWith({
        data: {
          action: 'LOGIN',
          user_id: 'u1',
          resource_type: 'Auth',
          resource_id: 'res1',
        },
      });
      expect(res).toEqual({ id: 1 });
    });

    it('getLogs (Với filter rỗng - Fallback limit 100)', async () => {
      mockPrisma.log.findMany.mockResolvedValue([]);
      await service.getLogs();
      expect(mockPrisma.log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('getLogs (Với filter đầy đủ)', async () => {
      mockPrisma.log.findMany.mockResolvedValue([]);
      await service.getLogs({ limit: 10, userId: 'u1', action: 'UPDATE' });
      expect(mockPrisma.log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          where: expect.objectContaining({ user_id: 'u1', action: 'UPDATE' }),
        }),
      );
    });

    it('getLogsByUser', async () => {
      mockPrisma.log.findMany.mockResolvedValue([]);
      await service.getLogsByUser('u1');
      expect(mockPrisma.log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          where: { user_id: 'u1' },
        }),
      );
    });

    it('getLogsByAction', async () => {
      mockPrisma.log.findMany.mockResolvedValue([]);
      await service.getLogsByAction('LOGIN', 20);
      expect(mockPrisma.log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          where: { action: 'LOGIN' },
        }),
      );
    });
  });

  describe('getLogsByClass', () => {
    it('lỗi nếu lớp không tồn tại', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(
        service.getLogsByClass('c1', { page: 1, limit: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('thành công (Có phân trang và nối userIds)', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({
        clid: 'c1',
        students: [{ user: { uid: 's1' } }],
        lecturer: { user: { uid: 'l1' } },
      });
      mockPrisma.log.count.mockResolvedValue(10);
      mockPrisma.log.findMany.mockResolvedValue([{ id: 1 }]);

      const res = await service.getLogsByClass('c1', {
        page: 2,
        limit: 5,
        action: 'LOGIN',
      });

      expect(mockPrisma.log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (2 - 1) * 5
          take: 5,
          where: { user_id: { in: ['s1', 'l1'] }, action: 'LOGIN' },
        }),
      );
      expect(res.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 10,
        totalPages: 2,
      });
    });
  });

  describe('getAllSystemLogs', () => {
    it('thành công (Với đầy đủ tham số tìm kiếm)', async () => {
      mockPrisma.log.count.mockResolvedValue(20);
      mockPrisma.log.findMany.mockResolvedValue([{ id: 1 }]);

      const res = await service.getAllSystemLogs({
        page: 1,
        limit: 10,
        action: 'CREATE',
        resourceType: 'Quiz',
        userId: 'u1',
      });

      expect(mockPrisma.log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: { action: 'CREATE', resource_type: 'Quiz', user_id: 'u1' },
        }),
      );
      expect(res.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 20,
        totalPages: 2,
      });
    });

    it('thành công (Với filter rỗng)', async () => {
      mockPrisma.log.count.mockResolvedValue(0);
      mockPrisma.log.findMany.mockResolvedValue([]);

      const res = await service.getAllSystemLogs({ page: 1, limit: 10 });
      expect(mockPrisma.log.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}, // Chắc chắn where query rỗng nếu không truyền tham số
        }),
      );
      expect(res.data).toEqual([]);
    });
  });
});
