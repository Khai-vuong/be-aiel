import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { PrismaService } from '../../prisma.service';
import { LogService } from '../logs';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CoursesService', () => {
  let service: CoursesService;

  const mockPrisma = {
    course: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lecturer: {
      findUnique: jest.fn(),
    },
    student: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    courseEnrollment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockLogService = {
    createLog: jest.fn(),
  };

  const mockUser = { uid: 'user_123', role: 'Admin' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LogService, useValue: mockLogService },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    jest.clearAllMocks();
  });

  describe('findAll & findOne', () => {
    it('findAll: trả về danh sách khóa học', async () => {
      mockPrisma.course.findMany.mockResolvedValue([{ cid: 'c1' }]);
      expect(await service.findAll()).toEqual([{ cid: 'c1' }]);
    });

    it('findOne: trả về khóa học nếu tồn tại', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ cid: 'c1' });
      expect(await service.findOne('c1')).toEqual({ cid: 'c1' });
    });

    it('findOne: quăng lỗi nếu không tìm thấy', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto = { code: 'CS101', name: 'Intro', lecturer_id: 'l1' };

    it('tạo khóa học thành công', async () => {
      mockPrisma.lecturer.findUnique.mockResolvedValue({ lid: 'l1' });
      mockPrisma.course.findUnique.mockResolvedValue(null);
      mockPrisma.course.create.mockResolvedValue({ cid: 'c1', ...createDto });

      const result = await service.create(mockUser, createDto);
      expect(result.cid).toBe('c1');
      expect(mockLogService.createLog).toHaveBeenCalled();
    });

    it('lỗi nếu không tìm thấy Lecturer', async () => {
      mockPrisma.lecturer.findUnique.mockResolvedValue(null);
      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lỗi nếu mã khóa học (code) đã tồn tại', async () => {
      mockPrisma.lecturer.findUnique.mockResolvedValue({ lid: 'l1' });
      mockPrisma.course.findUnique.mockResolvedValue({ cid: 'existing' });
      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('cập nhật thành công và kiểm tra trùng mã', async () => {
      mockPrisma.course.findUnique
        .mockResolvedValueOnce({ cid: 'c1', code: 'OLD' }) // For findById
        .mockResolvedValueOnce(null); // For check duplicate code
      mockPrisma.course.update.mockResolvedValue({ cid: 'c1', code: 'NEW' });

      const result = await service.update(mockUser, 'c1', { code: 'NEW' });
      expect(result.code).toBe('NEW');
    });

    it('lỗi khi cập nhật mã khóa học bị trùng', async () => {
      mockPrisma.course.findUnique
        .mockResolvedValueOnce({ cid: 'c1', code: 'OLD' })
        .mockResolvedValueOnce({ cid: 'c2', code: 'NEW' }); // Trùng mã
      await expect(
        service.update(mockUser, 'c1', { code: 'NEW' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lỗi nếu khóa học không tồn tại', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      await expect(service.update(mockUser, 'invalid', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('xóa thành công nếu không có enrollment', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        cid: 'c1',
        _count: { enrollments: 0 },
      });
      await service.delete(mockUser, 'c1');
      expect(mockPrisma.course.delete).toHaveBeenCalledWith({
        where: { cid: 'c1' },
      });
    });

    it('chặn xóa nếu đang có enrollment', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        cid: 'c1',
        _count: { enrollments: 5 },
      });
      await expect(service.delete(mockUser, 'c1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lỗi nếu khóa học không tồn tại', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      await expect(service.delete(mockUser, 'c1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addLecturer & removeLecturer', () => {
    it('addLecturer: thêm thành công', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ cid: 'c1' });
      mockPrisma.lecturer.findUnique.mockResolvedValue({ lid: 'l1' });
      mockPrisma.course.update.mockResolvedValue({ cid: 'c1' });

      await service.addLecturer(mockUser, 'c1', 'l1');
      expect(mockPrisma.course.update).toHaveBeenCalled();
    });

    it('addLecturer: lỗi thiếu course hoặc lecturer', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      await expect(service.addLecturer(mockUser, 'c1', 'l1')).rejects.toThrow(
        NotFoundException,
      );

      mockPrisma.course.findUnique.mockResolvedValue({ cid: 'c1' });
      mockPrisma.lecturer.findUnique.mockResolvedValue(null);
      await expect(service.addLecturer(mockUser, 'c1', 'l1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('removeLecturer: xóa thành công', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        cid: 'c1',
        lecturers: [{ lid: 'l1' }],
      });
      mockPrisma.course.update.mockResolvedValue({ cid: 'c1' });

      await service.removeLecturer(mockUser, 'c1', 'l1');
      expect(mockPrisma.course.update).toHaveBeenCalled();
    });

    it('removeLecturer: lỗi nếu lecturer không dạy môn này', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({
        cid: 'c1',
        lecturers: [{ lid: 'l2' }],
      }); // Khác l1
      await expect(
        service.removeLecturer(mockUser, 'c1', 'l1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Enrollment operations', () => {
    it('registerStudentToCourse: tạo mới enrollment', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ cid: 'c1' });
      mockPrisma.student.findFirst.mockResolvedValue({ sid: 's1' });
      mockPrisma.courseEnrollment.findFirst.mockResolvedValue(null);
      mockPrisma.courseEnrollment.create.mockResolvedValue({ ceid: 'e1' });

      const res = await service.registerStudentToCourse(mockUser, 'u1', 'c1');
      expect(res.enrollment.ceid).toBe('e1');
    });

    it('registerStudentToCourse: re-enroll (update status pending) nếu đã từng đk', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ cid: 'c1' });
      mockPrisma.student.findFirst.mockResolvedValue({ sid: 's1' });
      mockPrisma.courseEnrollment.findFirst.mockResolvedValue({ ceid: 'e1' });
      mockPrisma.courseEnrollment.update.mockResolvedValue({
        ceid: 'e1',
        status: 'Pending',
      });

      const res = await service.registerStudentToCourse(mockUser, 'u1', 'c1');
      expect(res.message).toContain('Re-enrolled');
    });

    it('registerStudentToCourse: lỗi course/student NotFound', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);
      mockPrisma.student.findFirst.mockResolvedValue(null);
      await expect(
        service.registerStudentToCourse(mockUser, 'u1', 'c1'),
      ).rejects.toThrow(NotFoundException);

      mockPrisma.course.findUnique.mockResolvedValue({ cid: 'c1' });
      mockPrisma.student.findFirst.mockResolvedValue(null);
      await expect(
        service.registerStudentToCourse(mockUser, 'u1', 'c1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('unregisterStudentFromCourse: thành công', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ cid: 'c1' });
      mockPrisma.student.findFirst.mockResolvedValue({ sid: 's1' });
      mockPrisma.courseEnrollment.findFirst.mockResolvedValue({ ceid: 'e1' });
      mockPrisma.courseEnrollment.update.mockResolvedValue({
        ceid: 'e1',
        status: 'Unregistered',
      });

      const res = await service.unregisterStudentFromCourse(
        mockUser,
        'u1',
        'c1',
      );
      expect(res.enrollment.status).toBe('Unregistered');
    });

    it('unregisterStudentFromCourse: lỗi nếu chưa đăng ký hoặc không tìm thấy student', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ cid: 'c1' });
      mockPrisma.student.findFirst.mockResolvedValue(null);
      await expect(
        service.unregisterStudentFromCourse(mockUser, 'u1', 'c1'),
      ).rejects.toThrow(NotFoundException);

      mockPrisma.student.findFirst.mockResolvedValue({ sid: 's1' });
      mockPrisma.courseEnrollment.findFirst.mockResolvedValue(null);
      await expect(
        service.unregisterStudentFromCourse(mockUser, 'u1', 'c1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findEnrollmentsByUserId & findCoursesByUserId', () => {
    it('findEnrollmentsByUserId: trả về list', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({
        enrollments: [{ ceid: 'e1' }],
      });
      expect(await service.findEnrollmentsByUserId('u1')).toEqual([
        { ceid: 'e1' },
      ]);
    });

    it('findEnrollmentsByUserId: lỗi nếu không tìm thấy student', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);
      await expect(service.findEnrollmentsByUserId('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('findCoursesByUserId: trả về list của lecturer', async () => {
      mockPrisma.lecturer.findUnique.mockResolvedValue({
        courses: [{ cid: 'c1' }],
      });
      expect(await service.findCoursesByUserId('u1')).toEqual([{ cid: 'c1' }]);
    });

    it('findCoursesByUserId: lỗi nếu không tìm thấy lecturer', async () => {
      mockPrisma.lecturer.findUnique.mockResolvedValue(null);
      await expect(service.findCoursesByUserId('u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
