import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LogService } from '../logs';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  // Mock Prisma với đầy đủ các bảng và giả lập Transaction linh hoạt
  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    student: { findUnique: jest.fn() },
    lecturer: { findUnique: jest.fn() },
    admin: { findUnique: jest.fn() },
    // Giả lập Transaction chạy callback với các phương thức update
    $transaction: jest.fn(async (callback) => {
      const tx = {
        user: {
          update: jest
            .fn()
            .mockResolvedValue({ uid: 'mock-uid', status: 'Active' }),
        },
        student: { update: jest.fn().mockResolvedValue({ sid: 'mock-sid' }) },
        lecturer: { update: jest.fn().mockResolvedValue({ lid: 'mock-lid' }) },
        admin: { update: jest.fn().mockResolvedValue({ aid: 'mock-aid' }) },
      };
      return await callback(tx);
    }),
  };

  const mockJwt = { signAsync: jest.fn() };
  const mockLog = { createLog: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: LogService, useValue: mockLog },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks(); // Xóa lịch sử gọi mock trước mỗi test
  });

  // ==========================================
  // 1. CÁC HÀM TÌM KIẾM (FIND)
  // ==========================================
  describe('Tìm kiếm Users (Find)', () => {
    it('findAll: nên trả về mảng user', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ uid: 'u1' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('findUserById: nên trả về user nếu tồn tại', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ uid: 'u1' });
      const result = await service.findUserById('u1');
      expect(result.uid).toBe('u1');
    });

    it('findUserById: nên quăng lỗi NotFoundException nếu không tìm thấy', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findUserById('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('findStudent/Lecturer/Admin ByUserId: nên trả về dữ liệu tương ứng', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ sid: 's1' });
      mockPrisma.lecturer.findUnique.mockResolvedValue({ lid: 'l1' });
      mockPrisma.admin.findUnique.mockResolvedValue({ aid: 'a1' });

      expect(await service.findStudentByUserId('u1')).toEqual({ sid: 's1' });
      expect(await service.findLecturerByUserId('u1')).toEqual({ lid: 'l1' });
      expect(await service.findAdminByUserId('u1')).toEqual({ aid: 'a1' });
    });
  });

  // ==========================================
  // 2. HÀM ĐĂNG KÝ (REGISTER)
  // ==========================================
  describe('Đăng ký (Register)', () => {
    const baseDto = {
      username: 'test',
      hashed_password: '123',
      name: 'John',
      personal_info_json: '{}',
    };

    it('nên đăng ký Student thành công', async () => {
      const dto = { ...baseDto, role: 'Student' };
      mockPrisma.user.create.mockResolvedValue({ uid: 'u_student', ...dto });

      const result = await service.register(dto as any);
      expect(result.uid).toBe('u_student');
      expect(mockLog.createLog).toHaveBeenCalledWith(
        'create_user',
        'u_student',
        'User',
        'u_student',
      );
    });

    it('nên đăng ký Lecturer thành công', async () => {
      const dto = { ...baseDto, role: 'Lecturer' };
      mockPrisma.user.create.mockResolvedValue({ uid: 'u_lecturer', ...dto });

      const result = await service.register(dto as any);
      expect(result.uid).toBe('u_lecturer');
      expect(mockLog.createLog).toHaveBeenCalledWith(
        'create_user',
        'u_lecturer',
        'User',
        'u_lecturer',
      );
    });

    it('nên đăng ký Admin thành công', async () => {
      const dto = { ...baseDto, role: 'Admin' };
      mockPrisma.user.create.mockResolvedValue({ uid: 'u_admin', ...dto });

      const result = await service.register(dto as any);
      expect(result.uid).toBe('u_admin');
      expect(mockLog.createLog).toHaveBeenCalledWith(
        'create_user',
        'u_admin',
        'User',
        'u_admin',
      );
    });

    it('nên quăng lỗi nếu Role không hợp lệ', async () => {
      const dto = { ...baseDto, role: 'SuperMan' };
      await expect(service.register(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================
  // 3. HÀM ĐĂNG NHẬP (LOGIN)
  // ==========================================
  describe('Đăng nhập (Login)', () => {
    it('nên trả về Token và đúng RoleId cho Student', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'u1',
        username: 's1',
        hashed_password: '123',
        role: 'Student',
        status: 'Active',
        student: { sid: 'student_1' },
      });
      mockJwt.signAsync.mockResolvedValue('fake_token');

      const result = await service.login({
        username: 's1',
        hashed_password: '123',
      });
      expect(result).toEqual({
        userToken: 'fake_token',
        role: 'Student',
        roleId: 'student_1',
      });
    });

    it('nên trả về Token và đúng RoleId cho Lecturer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'u2',
        username: 'l1',
        hashed_password: '123',
        role: 'Lecturer',
        status: 'Active',
        lecturer: { lid: 'lecturer_1' },
      });
      mockJwt.signAsync.mockResolvedValue('fake_token');

      const result = await service.login({
        username: 'l1',
        hashed_password: '123',
      });
      expect(result).toEqual({
        userToken: 'fake_token',
        role: 'Lecturer',
        roleId: 'lecturer_1',
      });
    });

    it('nên trả về Token và đúng RoleId cho Admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'u3',
        username: 'a1',
        hashed_password: '123',
        role: 'Admin',
        status: 'Active',
        admin: { aid: 'admin_1' },
      });
      mockJwt.signAsync.mockResolvedValue('fake_token');

      const result = await service.login({
        username: 'a1',
        hashed_password: '123',
      });
      expect(result).toEqual({
        userToken: 'fake_token',
        role: 'Admin',
        roleId: 'admin_1',
      });
    });

    it('nên báo lỗi nếu sai Username', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ username: 'wrong', hashed_password: '123' }),
      ).rejects.toThrow('Invalid username');
    });

    it('nên báo lỗi nếu sai Password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        username: 'a',
        hashed_password: '123',
        status: 'Active',
      });
      await expect(
        service.login({ username: 'a', hashed_password: 'wrong' }),
      ).rejects.toThrow('Invalid password');
    });

    it('nên báo lỗi nếu tài khoản bị Xóa (Deleted)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        username: 'a',
        hashed_password: '123',
        status: 'Deleted',
      });
      await expect(
        service.login({ username: 'a', hashed_password: '123' }),
      ).rejects.toThrow('User account is deleted');
    });
  });

  // ==========================================
  // 4. HÀM CẬP NHẬT (UPDATE THÔNG QUA TRANSACTION)
  // ==========================================
  describe('Cập nhật (Update)', () => {
    const jwtPayload = { uid: 'u_admin' };
    const updateDto = { status: 'Active', personal_info_json: '{}' };

    it('nên báo lỗi nếu không tìm thấy User', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.update(jwtPayload as any, 'non-id', updateDto as any),
      ).rejects.toThrow('User not found');
    });

    it('nên update Student thành công', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'u1',
        role: 'Student',
      });
      const result = await service.update(
        jwtPayload as any,
        'u1',
        updateDto as any,
      );
      expect(result.Student).toBeDefined();
      expect(mockLog.createLog).toHaveBeenCalled();
    });

    it('nên update Lecturer thành công', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'u2',
        role: 'Lecturer',
      });
      const result = await service.update(
        jwtPayload as any,
        'u2',
        updateDto as any,
      );
      expect(result.Lecturer).toBeDefined();
    });

    it('nên update Admin thành công', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'u3',
        role: 'Admin',
      });
      const result = await service.update(
        jwtPayload as any,
        'u3',
        updateDto as any,
      );
      expect(result.Admin).toBeDefined();
    });

    it('nên báo lỗi nếu Role của user muốn update không hợp lệ', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        uid: 'u4',
        role: 'Unknown',
      });
      await expect(
        service.update(jwtPayload as any, 'u4', updateDto as any),
      ).rejects.toThrow('Invalid user role');
    });
  });

  // ==========================================
  // 5. HÀM XÓA (DELETE - SOFT DELETE)
  // ==========================================
  describe('Xóa (Delete)', () => {
    it('nên báo lỗi nếu không tìm thấy User để xóa', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.delete({ uid: 'u_admin' } as any, 'non-id'),
      ).rejects.toThrow('User not found');
    });

    it('nên Soft Delete thành công (chuyển status -> Deleted)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ uid: 'u1' });
      mockPrisma.user.update.mockResolvedValue({
        uid: 'u1',
        status: 'Deleted',
      });

      const result = await service.delete({ uid: 'u_admin' } as any, 'u1');

      expect(result.status).toBe('Deleted');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { uid: 'u1' },
        data: { status: 'Deleted' },
      });
      expect(mockLog.createLog).toHaveBeenCalledWith(
        'delete_user',
        'u_admin',
        'User',
        'u1',
      );
    });
  });
});
