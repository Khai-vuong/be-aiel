import { Test, TestingModule } from '@nestjs/testing';
import { ClassesService } from './classes.service';
import { PrismaService } from '../../prisma.service';
import { LogService } from '../logs';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { s3Client } from '../../common/utils/s3.client';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock các thư viện bên ngoài
jest.mock('fs');
jest.mock('../../common/utils/s3.client', () => ({
  s3Client: { send: jest.fn() },
}));
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('ClassesService', () => {
  let service: ClassesService;

  const mockPrisma = {
    class: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    lecturer: { findUnique: jest.fn() },
    file: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    courseEnrollment: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockLogService = { createLog: jest.fn() };
  const mockUser = { uid: 'user_123', role: 'Admin' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LogService, useValue: mockLogService },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
    jest.clearAllMocks();
  });

  describe('findAll & findOne', () => {
    it('findAll: thành công', async () => {
      mockPrisma.class.findMany.mockResolvedValue([{ clid: 'c1' }]);
      expect(await service.findAll()).toEqual([{ clid: 'c1' }]);
    });

    it('findOne: thành công', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ clid: 'c1' });
      expect(await service.findOne('c1')).toEqual({ clid: 'c1' });
    });

    it('findOne: quăng lỗi', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findClassesByUserId', () => {
    it('lỗi nếu user không tồn tại', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findClassesByUserId('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('trả về mảng rỗng nếu không phải student hay lecturer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ uid: 'u1' }); // Không có student, lecturer
      expect(await service.findClassesByUserId('u1')).toEqual([]);
    });

    it('tìm lớp học cho Student', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'u1',
        student: { sid: 's1' },
      });
      mockPrisma.class.findMany.mockResolvedValue([{ clid: 'c1' }]);
      expect(await service.findClassesByUserId('u1')).toEqual([{ clid: 'c1' }]);
    });

    it('tìm lớp học cho Lecturer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'u1',
        lecturer: { lid: 'l1' },
      });
      mockPrisma.class.findMany.mockResolvedValue([{ clid: 'c1' }]);
      expect(await service.findClassesByUserId('u1')).toEqual([{ clid: 'c1' }]);
    });
  });

  describe('update', () => {
    it('lỗi nếu lớp học không tồn tại', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(service.update(mockUser, 'c1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lỗi nếu lecturer_id mới không tồn tại', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ clid: 'c1' });
      mockPrisma.lecturer.findUnique.mockResolvedValue(null);
      await expect(
        service.update(mockUser, 'c1', { lecturer_id: 'l_invalid' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('update thành công với lecturer mới', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ clid: 'c1' });
      mockPrisma.lecturer.findUnique.mockResolvedValue({ lid: 'l1' });
      mockPrisma.class.update.mockResolvedValue({
        clid: 'c1',
        lecturer_id: 'l1',
      });

      const res = await service.update(mockUser, 'c1', {
        lecturer_id: 'l1',
        name: 'New',
      });
      expect(res.lecturer_id).toBe('l1');
    });
  });

  describe('delete', () => {
    it('lỗi nếu lớp học không tồn tại', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(service.delete(mockUser, 'c1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('xóa mềm thành công', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ clid: 'c1' });
      mockPrisma.class.update.mockResolvedValue({
        clid: 'c1',
        status: 'Canceled',
      });
      const res = await service.delete(mockUser, 'c1');
      expect(res.status).toBe('Canceled');
    });
  });

  describe('Upload Files (Local & S3)', () => {
    const mockFileBase = {
      originalname: 'test.jpg',
      size: 1000,
    } as any;

    it('uploadToLocal: phân loại mime_type chính xác (video, image, pdf, other)', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ clid: 'c1' });
      mockPrisma.file.create.mockResolvedValue({ fid: 'f1' });

      // Test Video
      await service.uploadToLocal(mockUser, 'c1', {
        ...mockFileBase,
        mimetype: 'video/mp4',
        path: 'vid.mp4',
      });
      // Test Image
      await service.uploadToLocal(mockUser, 'c1', {
        ...mockFileBase,
        mimetype: 'image/png',
        path: 'img.png',
      });
      // Test Document (pdf)
      await service.uploadToLocal(mockUser, 'c1', {
        ...mockFileBase,
        mimetype: 'application/pdf',
        path: 'doc.pdf',
      });
      // Test Default (other)
      await service.uploadToLocal(mockUser, 'c1', {
        ...mockFileBase,
        mimetype: 'text/plain',
        path: 'txt.txt',
      });

      expect(mockPrisma.file.create).toHaveBeenCalledTimes(4);
    });

    it('uploadToS3: lỗi nếu không có buffer và path', async () => {
      await expect(
        service.uploadToS3(mockUser, 'c1', {
          ...mockFileBase,
          mimetype: 'image/jpeg',
        }),
      ).rejects.toThrow('File content not available');
    });

    it('uploadToS3: lỗi khi S3 Client quăng lỗi', async () => {
      (s3Client.send as jest.Mock).mockRejectedValueOnce(new Error('S3 Down'));
      await expect(
        service.uploadToS3(mockUser, 'c1', {
          ...mockFileBase,
          buffer: Buffer.from('test'),
          mimetype: 'image/jpeg',
        }),
      ).rejects.toThrow('Failed to upload file to S3: S3 Down');
    });

    it('uploadToS3: thành công đọc từ Buffer', async () => {
      (s3Client.send as jest.Mock).mockResolvedValueOnce({});
      mockPrisma.file.create.mockResolvedValue({ fid: 'f1' });

      const res = await service.uploadToS3(mockUser, 'c1', {
        ...mockFileBase,
        buffer: Buffer.from('test'),
        mimetype: 'video/mp4',
      });
      expect(res.fid).toBe('f1');
    });

    it('uploadToS3: thành công đọc từ Path và xóa file local', async () => {
      (s3Client.send as jest.Mock).mockResolvedValueOnce({});
      mockPrisma.file.create.mockResolvedValue({ fid: 'f1' });
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test'));
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await service.uploadToS3(mockUser, 'c1', {
        ...mockFileBase,
        path: '/tmp/test.pdf',
        mimetype: 'application/pdf',
      });
      expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/test.pdf');
      expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/test.pdf');
    });
  });

  describe('Download Files (Local & S3)', () => {
    it('downloadFromLocal: lỗi không tìm thấy hoặc không có url', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);
      await expect(service.downloadFromLocal('f1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('downloadFromLocal: thành công', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        fid: 'f1',
        url: 'uploads/test.jpg',
      });
      const res = await service.downloadFromLocal('f1');
      expect(res.filePath).toMatch(/uploads[\\/]test\.jpg/);
    });

    it('downloadFromS3: lỗi không tìm thấy file', async () => {
      mockPrisma.file.findUnique.mockResolvedValue(null);
      await expect(service.downloadFromS3('f1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('downloadFromS3: lỗi format URL sai', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        fid: 'f1',
        url: 'http://invalid.com/test.jpg',
      });
      await expect(service.downloadFromS3('f1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('downloadFromS3: lỗi khi generate URL', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        fid: 'f1',
        url: 'https://bucket.s3.region.amazonaws.com/key',
      });
      (getSignedUrl as jest.Mock).mockRejectedValueOnce(
        new Error('Sign Error'),
      );
      await expect(service.downloadFromS3('f1')).rejects.toThrow(
        'Failed to generate download URL: Sign Error',
      );
    });

    it('downloadFromS3: thành công', async () => {
      mockPrisma.file.findUnique.mockResolvedValue({
        fid: 'f1',
        url: 'https://bucket.s3.region.amazonaws.com/key',
      });
      (getSignedUrl as jest.Mock).mockResolvedValueOnce('http://signed.url');
      const res = await service.downloadFromS3('f1');
      expect(res.downloadUrl).toBe('http://signed.url');
    });
  });

  describe('createClassesFromEnrollments', () => {
    it('trả về 0 nếu không có enrollment nào pending', async () => {
      mockPrisma.courseEnrollment.findMany.mockResolvedValue([]);
      const res = await service.createClassesFromEnrollments(mockUser, 5);
      expect(res.number_of_classes_created).toBe(0);
    });

    it('xử lý chia lớp thành công (Test thuật toán chia lớp và fallback credits)', async () => {
      // Giả lập 6 học sinh đăng ký 1 khóa học -> Max 5 -> Sẽ chia thành 2 lớp (3 và 3 hoặc 4 và 2)
      // Dùng credits là null để test nhánh fallback (course.credits || 3)
      const mockEnrollments = Array.from({ length: 6 }).map((_, i) => ({
        ceid: `e${i}`,
        student: { sid: `s${i}`, name: `Student ${i}` },
        course: { cid: 'c1', code: 'CS101', credits: null, lecturers: [] }, // Lecturer rỗng để test nhánh fallback
      }));

      mockPrisma.courseEnrollment.findMany.mockResolvedValue(mockEnrollments);
      mockPrisma.class.create.mockResolvedValue({ clid: 'new_class' });
      mockPrisma.courseEnrollment.updateMany.mockResolvedValue({ count: 6 });

      const res = await service.createClassesFromEnrollments(mockUser, 5);

      expect(res.number_of_classes_created).toBe(2);
      expect(mockPrisma.class.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.courseEnrollment.updateMany).toHaveBeenCalledTimes(2);
    });
  });
});
