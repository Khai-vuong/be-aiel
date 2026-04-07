import { Test, TestingModule } from '@nestjs/testing';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InChargeGuard } from '../../common/guards/in-charge.guard';

describe('ClassesController', () => {
  let controller: ClassesController;
  let service: ClassesService;

  const mockClassesService = {
    findAll: jest.fn(),
    findClassesByUserId: jest.fn(),
    findOne: jest.fn(),
    createClassesFromEnrollments: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    uploadToS3: jest.fn(),
    uploadToLocal: jest.fn(),
    downloadFromS3: jest.fn(),
    downloadFromLocal: jest.fn(),
  };

  const mockReq = { user: { uid: 'user123' } };
  const mockRes = { download: jest.fn() } as any;
  const mockFile = { originalname: 'test.jpg' } as any;

  // Lưu trữ biến môi trường gốc để phục hồi sau khi test
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv }; // Reset env trước mỗi test

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [{ provide: ClassesService, useValue: mockClassesService }],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(InChargeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClassesController>(ClassesController);
    service = module.get<ClassesService>(ClassesService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('findAll', async () => {
    mockClassesService.findAll.mockResolvedValue([]);
    expect(await controller.findAll()).toEqual([]);
  });

  it('findMyClasses', async () => {
    mockClassesService.findClassesByUserId.mockResolvedValue([]);
    expect(await controller.findMyClasses(mockReq)).toEqual([]);
    expect(mockClassesService.findClassesByUserId).toHaveBeenCalledWith(
      'user123',
    );
  });

  it('findOne', async () => {
    mockClassesService.findOne.mockResolvedValue({ clid: 'c1' });
    expect(await controller.findOne('c1')).toEqual({ clid: 'c1' });
  });

  it('processPendingEnrollments', async () => {
    const dto = { maxStudentsPerClass: 10 };
    mockClassesService.createClassesFromEnrollments.mockResolvedValue({
      created_classes: [],
    });
    await controller.processPendingEnrollments(mockReq, dto);
    expect(
      mockClassesService.createClassesFromEnrollments,
    ).toHaveBeenCalledWith(mockReq.user, 10);

    // Test default maxStudentsPerClass = 5
    await controller.processPendingEnrollments(mockReq, {});
    expect(
      mockClassesService.createClassesFromEnrollments,
    ).toHaveBeenCalledWith(mockReq.user, 5);
  });

  it('update', async () => {
    mockClassesService.update.mockResolvedValue({ clid: 'c1' });
    expect(await controller.update(mockReq, 'c1', {})).toEqual({ clid: 'c1' });
  });

  it('delete', async () => {
    mockClassesService.delete.mockResolvedValue(undefined);
    expect(await controller.delete(mockReq, 'c1')).toEqual({
      message: 'Class with ID c1 deleted successfully',
    });
  });

  describe('addResource (Upload)', () => {
    it('nên gọi uploadToS3 khi ở Production', async () => {
      process.env.NODE_ENV = 'production';
      mockClassesService.uploadToS3.mockResolvedValue({ fid: 'f1' });
      await controller.addResource(mockReq, 'c1', mockFile);
      expect(mockClassesService.uploadToS3).toHaveBeenCalledWith(
        mockReq.user,
        'c1',
        mockFile,
      );
    });

    it('nên gọi uploadToLocal khi không ở Production', async () => {
      process.env.NODE_ENV = 'development';
      mockClassesService.uploadToLocal.mockResolvedValue({ fid: 'f1' });
      await controller.addResource(mockReq, 'c1', mockFile);
      expect(mockClassesService.uploadToLocal).toHaveBeenCalledWith(
        mockReq.user,
        'c1',
        mockFile,
      );
    });
  });

  describe('downloadFile', () => {
    it('nên gọi downloadFromS3 khi ở Production', async () => {
      process.env.NODE_ENV = 'production';
      mockClassesService.downloadFromS3.mockResolvedValue({
        downloadUrl: 'http://s3...',
      });
      const result = await controller.downloadFile('c1', 'f1', mockRes);
      expect(result).toEqual({ downloadUrl: 'http://s3...' });
    });

    it('nên gọi downloadFromLocal và res.download khi không ở Production', async () => {
      process.env.NODE_ENV = 'development';
      mockClassesService.downloadFromLocal.mockResolvedValue({
        file: { original_name: 'test.jpg' },
        filePath: '/path/test.jpg',
      });
      await controller.downloadFile('c1', 'f1', mockRes);
      expect(mockRes.download).toHaveBeenCalledWith(
        '/path/test.jpg',
        'test.jpg',
      );
    });
  });
});
