import { Test, TestingModule } from '@nestjs/testing';
import { LogsController } from './logs.controller';
import { LogService } from './logs.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InChargeGuard } from '../../common/guards/in-charge.guard';

describe('LogsController', () => {
  let controller: LogsController;
  let service: LogService;

  const mockLogService = {
    getLogsByClass: jest.fn(),
    getAllSystemLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogsController],
      providers: [{ provide: LogService, useValue: mockLogService }],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(InChargeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LogsController>(LogsController);
    service = module.get<LogService>(LogService);
    jest.clearAllMocks();
  });

  describe('getClassLogs', () => {
    it('gọi service với limit an toàn (<=100)', async () => {
      mockLogService.getLogsByClass.mockResolvedValue({ data: [] });

      // Truyền limit = 150, controller phải tự động bóp về 100
      await controller.getClassLogs('class_1', 2, 150, 'LOGIN');
      expect(mockLogService.getLogsByClass).toHaveBeenCalledWith('class_1', {
        page: 2,
        limit: 100,
        action: 'LOGIN',
      });

      // Truyền limit = 50, controller giữ nguyên 50
      await controller.getClassLogs('class_1', 1, 50);
      expect(mockLogService.getLogsByClass).toHaveBeenCalledWith('class_1', {
        page: 1,
        limit: 50,
        action: undefined,
      });
    });
  });

  describe('getAllSystemLogs', () => {
    it('gọi service với đầy đủ filter và limit an toàn', async () => {
      mockLogService.getAllSystemLogs.mockResolvedValue({ data: [] });

      await controller.getAllSystemLogs(1, 500, 'CREATE', 'Quiz', 'user_1');

      expect(mockLogService.getAllSystemLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 100, // 500 bị bóp về 100
        action: 'CREATE',
        resourceType: 'Quiz',
        userId: 'user_1',
      });
    });
  });
});
