import { Test, TestingModule } from '@nestjs/testing';
import { AttemptsService } from './attempts.service';
import { PrismaService } from '../../prisma.service';
import { LogService } from '../logs';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AttemptsService', () => {
  let service: AttemptsService;

  const mockPrisma = {
    quiz: { findUnique: jest.fn() },
    student: { findUnique: jest.fn() },
    attempt: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockLogService = { createLog: jest.fn() };
  const mockUser = { uid: 'user_123' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttemptsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LogService, useValue: mockLogService },
      ],
    }).compile();

    service = module.get<AttemptsService>(AttemptsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = { quiz_id: 'q1', student_id: 's1' };

    it('lỗi nếu quiz không tồn tại', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);
      mockPrisma.student.findUnique.mockResolvedValue({ sid: 's1' });
      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lỗi nếu student không tồn tại', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({ qid: 'q1' });
      mockPrisma.student.findUnique.mockResolvedValue(null);
      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lỗi nếu vượt quá số lần làm bài (maxAttempts)', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        qid: 'q1',
        settings_json: '{"maxAttempts": 2}',
      });
      mockPrisma.student.findUnique.mockResolvedValue({ sid: 's1' });
      mockPrisma.attempt.count.mockResolvedValue(2); // Đã làm 2 lần

      await expect(service.create(mockUser, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('tạo thành công (Không có settings_json)', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        qid: 'q1',
        settings_json: null,
      });
      mockPrisma.student.findUnique.mockResolvedValue({ sid: 's1' });
      mockPrisma.attempt.create.mockResolvedValue({ atid: 'a1' });

      const res = await service.create(mockUser, createDto);
      expect(res.atid).toBe('a1');
    });

    it('tạo thành công (Có maxAttempts nhưng chưa vượt mức)', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({
        qid: 'q1',
        settings_json: '{"maxAttempts": 3}',
      });
      mockPrisma.student.findUnique.mockResolvedValue({ sid: 's1' });
      mockPrisma.attempt.count.mockResolvedValue(1); // Mới làm 1 lần
      mockPrisma.attempt.create.mockResolvedValue({ atid: 'a2' });

      const res = await service.create(mockUser, createDto);
      expect(res.atid).toBe('a2');
    });
  });

  describe('submit (Chấm điểm logic)', () => {
    it('lỗi nếu attempt không tồn tại', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue(null);
      await expect(
        service.submit(mockUser, 'a1', { answers: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lỗi nếu attempt không ở trạng thái in_progress', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        atid: 'a1',
        status: 'submitted',
      });
      await expect(
        service.submit(mockUser, 'a1', { answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lỗi nếu quiz không tồn tại (Edge case)', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        atid: 'a1',
        status: 'in_progress',
        quiz_id: 'q1',
      });
      mockPrisma.quiz.findUnique.mockResolvedValue(null); // Lỗi khi query quiz
      await expect(
        service.submit(mockUser, 'a1', { answers: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lỗi nếu gửi ID câu hỏi không có trong quiz', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        atid: 'a1',
        status: 'in_progress',
        quiz_id: 'q1',
      });
      mockPrisma.quiz.findUnique.mockResolvedValue({
        qid: 'q1',
        questions: [{ ques_id: 'ques_1' }],
      });

      // Submit ID sai 'ques_invalid'
      const dto = {
        answers: [{ question_id: 'ques_invalid', answer_json: '{}' }],
      };
      await expect(service.submit(mockUser, 'a1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('chấm điểm thành công (Bao phủ Single, Multiple và Lỗi parse JSON)', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        atid: 'a1',
        status: 'in_progress',
        quiz_id: 'q1',
        student_id: 's1',
      });

      const mockQuiz = {
        qid: 'q1',
        questions: [
          {
            ques_id: 'q_single',
            points: 10,
            answer_key_json: '{"correct": "A"}',
          },
          {
            ques_id: 'q_multi',
            points: 20,
            answer_key_json: '{"correct": ["A", "B"]}',
          },
          {
            ques_id: 'q_error',
            points: 5,
            answer_key_json: '{"correct": "C"}',
          }, // Test lỗi parse JSON
          {
            ques_id: 'q_empty',
            points: 5,
            answer_key_json: '{"correct": "D"}',
          }, // Câu hỏi người dùng không trả lời
        ],
      };
      mockPrisma.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrisma.attempt.update.mockResolvedValue({
        atid: 'a1',
        status: 'submitted',
      });

      const submitDto = {
        answers: [
          { question_id: 'q_single', answer_json: '{"selected": "A"}' }, // Đúng -> 10 điểm
          { question_id: 'q_multi', answer_json: '{"selected": ["A", "B"]}' }, // Đúng -> 20 điểm
          { question_id: 'q_error', answer_json: 'INVALID_JSON' }, // Lỗi parse -> 0 điểm
          // q_empty không có trong mảng trả lời -> 0 điểm
        ],
      };

      const res = await service.submit(mockUser, 'a1', submitDto);
      expect(res.status).toBe('submitted');

      // Tổng điểm tối đa = 10+20+5+5 = 40
      // Tổng điểm làm được = 10+20+0+0 = 30
      // Phần trăm = 30/40 * 100 = 75
      expect(mockPrisma.attempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            score: 30,
            max_score: 40,
            percentage: 75,
          }),
        }),
      );
    });

    it('chia 0 điểm nếu quiz không có điểm (Ngăn chặn lỗi NaN/Infinity)', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        atid: 'a1',
        status: 'in_progress',
        quiz_id: 'q1',
      });
      mockPrisma.quiz.findUnique.mockResolvedValue({
        qid: 'q1',
        questions: [],
      }); // Không có câu hỏi -> maxPoints = 0
      mockPrisma.attempt.update.mockResolvedValue({ atid: 'a1' });

      await service.submit(mockUser, 'a1', { answers: [] });

      expect(mockPrisma.attempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ percentage: 0 }), // Kiểm tra nhánh xử lý chia cho 0
        }),
      );
    });
  });

  describe('Queries (Find)', () => {
    it('findByQuizId: lỗi không tìm thấy', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);
      await expect(service.findByQuizId('q1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('findByQuizId: thành công', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({ qid: 'q1' });
      mockPrisma.attempt.findMany.mockResolvedValue([{ atid: 'a1' }]);
      expect(await service.findByQuizId('q1')).toEqual([{ atid: 'a1' }]);
    });

    it('findByQuizAndStudent: lỗi không tìm thấy quiz hoặc student', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue(null);
      mockPrisma.student.findUnique.mockResolvedValue({ sid: 's1' });
      await expect(service.findByQuizAndStudent('q1', 's1')).rejects.toThrow(
        NotFoundException,
      );

      mockPrisma.quiz.findUnique.mockResolvedValue({ qid: 'q1' });
      mockPrisma.student.findUnique.mockResolvedValue(null);
      await expect(service.findByQuizAndStudent('q1', 's1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('findByQuizAndStudent: thành công', async () => {
      mockPrisma.quiz.findUnique.mockResolvedValue({ qid: 'q1' });
      mockPrisma.student.findUnique.mockResolvedValue({ sid: 's1' });
      mockPrisma.attempt.findMany.mockResolvedValue([{ atid: 'a1' }]);
      expect(await service.findByQuizAndStudent('q1', 's1')).toEqual([
        { atid: 'a1' },
      ]);
    });

    it('findOne: lỗi không tìm thấy', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue(null);
      await expect(service.findOne('a1')).rejects.toThrow(NotFoundException);
    });

    it('findOne: thành công', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({ atid: 'a1' });
      expect(await service.findOne('a1')).toEqual({ atid: 'a1' });
    });
  });

  describe('update', () => {
    it('lỗi không tìm thấy attempt', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue(null);
      await expect(service.update(mockUser, 'a1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('cập nhật thành công (Có tính lại phần trăm)', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({ atid: 'a1' });
      mockPrisma.attempt.update.mockResolvedValue({ atid: 'a1' });

      await service.update(mockUser, 'a1', { score: 80, max_score: 100 });
      expect(mockPrisma.attempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ percentage: 80 }), // 80/100 * 100 = 80
        }),
      );
    });

    it('cập nhật thành công (Không cập nhật điểm)', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({ atid: 'a1' });
      mockPrisma.attempt.update.mockResolvedValue({ atid: 'a1' });

      await service.update(mockUser, 'a1', { status: 'graded' }); // Gửi thiếu score và max_score
      expect(mockPrisma.attempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ percentage: undefined }), // Test nhánh undefined
        }),
      );
    });
  });
});
