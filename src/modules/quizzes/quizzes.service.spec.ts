import { Test, TestingModule } from '@nestjs/testing';
import { QuizzesService } from './quizzes.service';
import { PrismaService } from '../../prisma.service';
import { LogService } from '../logs';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('QuizzesService', () => {
  let service: QuizzesService;

  // Giả lập Prisma cùng chức năng Transaction
  const mockPrisma = {
    quiz: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    class: { findUnique: jest.fn() },
    lecturer: { findUnique: jest.fn() },
    question: {
      deleteMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    // Giả lập Transaction chạy callback với prisma nội bộ
    $transaction: jest.fn(async (callback) => {
      return await callback(mockPrisma);
    }),
  };

  const mockLogService = { createLog: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LogService, useValue: mockLogService },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
    jest.clearAllMocks();
  });

  describe('findAll & findOne', () => {
    it('findAll: thành công', async () => {
      mockPrisma.quiz.findMany.mockResolvedValue([{ qid: 'q1' }]);
      expect(await service.findAll()).toEqual([{ qid: 'q1' }]);
    });

    it('findOne: thành công', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({ qid: 'q1' });
      expect(await service.findOne('q1')).toEqual({ qid: 'q1' });
    });

    it('findOne: lỗi không tìm thấy', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findQuizzesByClassId', () => {
    it('thành công', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ clid: 'c1' });
      mockPrisma.quiz.findMany.mockResolvedValue([{ qid: 'q1' }]);
      expect(await service.findQuizzesByClassId('c1')).toEqual([{ qid: 'q1' }]);
    });

    it('lỗi nếu lớp học không tồn tại', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(service.findQuizzesByClassId('c1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const baseCreateDto = {
      name: 'Q1',
      status: 'draft',
      clid: 'c1',
      creator_id: 'l1',
      available_from: new Date('2026-01-01'),
      available_until: new Date('2026-01-02'),
    };

    it('lỗi nếu lecturer không tồn tại', async () => {
      mockPrisma.lecturer.findUnique.mockResolvedValue(null);
      await expect(service.create(baseCreateDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lỗi nếu class không tồn tại', async () => {
      mockPrisma.lecturer.findUnique.mockResolvedValue({ lid: 'l1' });
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(service.create(baseCreateDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lỗi nếu available_from >= available_until', async () => {
      mockPrisma.lecturer.findUnique.mockResolvedValue({ lid: 'l1' });
      mockPrisma.class.findUnique.mockResolvedValue({ clid: 'c1' });
      const badDto = {
        ...baseCreateDto,
        available_from: new Date('2026-01-02'),
        available_until: new Date('2026-01-01'),
      };
      await expect(service.create(badDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('tạo thành công không có câu hỏi', async () => {
      mockPrisma.lecturer.findUnique.mockResolvedValue({
        lid: 'l1',
        user_id: 'u1',
      });
      mockPrisma.class.findUnique.mockResolvedValue({ clid: 'c1' });
      mockPrisma.quiz.create.mockResolvedValue({ qid: 'q1' });

      const dto = { ...baseCreateDto, questions: [] };
      const res = await service.create(dto as any);
      expect(res.qid).toBe('q1');
    });

    it('tạo thành công kèm câu hỏi (mặc định options/points)', async () => {
      mockPrisma.lecturer.findUnique.mockResolvedValue({
        lid: 'l1',
        user_id: 'u1',
      });
      mockPrisma.class.findUnique.mockResolvedValue({ clid: 'c1' });
      mockPrisma.quiz.create.mockResolvedValue({ qid: 'q1' });

      const dto = {
        ...baseCreateDto,
        questions: [{ content: 'Q?', answer_key_json: '{}' }],
      };
      const res = await service.create(dto as any);
      expect(res.qid).toBe('q1');
    });
  });

  describe('update (Có Transaction)', () => {
    const existingQuiz = { qid: 'q1', creator: { user_id: 'u1' } };

    it('lỗi nếu quiz không tồn tại', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.update('q1', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lỗi nếu available_from >= available_until', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(existingQuiz);
      const badDto = {
        available_from: new Date('2026-01-02'),
        available_until: new Date('2026-01-01'),
      };
      await expect(service.update('q1', badDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lỗi nếu đổi lớp (clid) mà lớp không tồn tại', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(existingQuiz);
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(
        service.update('q1', { clid: 'c_invalid' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('update KHÔNG có danh sách questions (chỉ update thông tin quiz)', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(existingQuiz);
      mockPrisma.quiz.update.mockResolvedValue({ qid: 'q1', name: 'Updated' });

      mockPrisma.class.findUnique.mockResolvedValue({ clid: 'c1' });

      // Đảm bảo available_from NHỎ HƠN available_until
      const res = await service.update('q1', {
        name: 'New',
        description: 'Desc',
        status: 'published',
        available_from: new Date('2026-01-01'),
        available_until: new Date('2026-01-02'),
        settings_json: '{}',
        clid: 'c1',
      } as any);

      expect(res.name).toBe('Updated');
    });

    it('update có questions: Xóa hết question cũ vì gửi lên danh sách mới tinh', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(existingQuiz);
      mockPrisma.quiz.update.mockResolvedValue({ qid: 'q1' });

      // Câu hỏi không có ques_id -> Tạo mới toàn bộ
      await service.update('q1', {
        questions: [{ content: 'New', answer_key_json: '{}' }],
      } as any);

      // Nhánh deleteMany toàn bộ
      expect(mockPrisma.question.deleteMany).toHaveBeenCalledWith({
        where: { quiz_id: 'q1' },
      });
      expect(mockPrisma.question.create).toHaveBeenCalled();
    });

    it('update có questions: Xóa 1 phần, Update 1 phần, Tạo mới lỗi do thiếu data', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(existingQuiz);

      const badDto = {
        questions: [
          {
            ques_id: 'keep_me',
            content: 'Upd',
            options_json: '{}',
            answer_key_json: '{}',
            points: 2,
          }, // Đủ field update
          { content: 'Missing_answer_key' }, // Thiếu answer_key_json sẽ văng lỗi tạo mới
        ],
      };

      await expect(service.update('q1', badDto as any)).rejects.toThrow(
        BadRequestException,
      );
      // Kiểm tra nhánh deleteMany một phần
      expect(mockPrisma.question.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            quiz_id: 'q1',
            ques_id: { notIn: ['keep_me'] },
          }),
        }),
      );
    });

    it('update có questions: Tạo mới thành công (thiếu option/point thì fallback null/1.0)', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(existingQuiz);
      mockPrisma.quiz.update.mockResolvedValue({ qid: 'q1' });

      await service.update('q1', {
        questions: [
          { ques_id: 'q_upd' },
          { content: 'Good', answer_key_json: '{}' },
        ],
      } as any);

      expect(mockPrisma.question.update).toHaveBeenCalled();
      expect(mockPrisma.question.create).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('lỗi nếu quiz không tồn tại', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.delete('q1')).rejects.toThrow(NotFoundException);
    });

    it('xóa mềm thành công', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        qid: 'q1',
        creator: { user_id: 'u1' },
      });
      mockPrisma.quiz.update.mockResolvedValue({
        qid: 'q1',
        status: 'archived',
      });
      const res = await service.delete('q1');
      expect(res.status).toBe('archived');
      expect(mockLogService.createLog).toHaveBeenCalled();
    });
  });
});
