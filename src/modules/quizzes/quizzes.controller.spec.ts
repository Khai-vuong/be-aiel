import { Test, TestingModule } from '@nestjs/testing';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InChargeGuard } from '../../common/guards/in-charge.guard';

describe('QuizzesController', () => {
  let controller: QuizzesController;
  let service: QuizzesService;

  const mockQuizzesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findQuizzesByClassId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockReq = { user: { uid: 'user123' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizzesController],
      providers: [{ provide: QuizzesService, useValue: mockQuizzesService }],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(InChargeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<QuizzesController>(QuizzesController);
    service = module.get<QuizzesService>(QuizzesService);
    jest.clearAllMocks();
  });

  it('findAll', async () => {
    mockQuizzesService.findAll.mockResolvedValue([]);
    expect(await controller.findAll()).toEqual([]);
  });

  it('findOne', async () => {
    mockQuizzesService.findOne.mockResolvedValue({ qid: 'q1' });
    expect(await controller.findOne('q1')).toEqual({ qid: 'q1' });
  });

  it('findQuizzesByClass', async () => {
    mockQuizzesService.findQuizzesByClassId.mockResolvedValue([]);
    expect(await controller.findQuizzesByClass('c1')).toEqual([]);
    expect(mockQuizzesService.findQuizzesByClassId).toHaveBeenCalledWith('c1');
  });

  it('create', async () => {
    const dto: any = { name: 'Quiz 1' };
    mockQuizzesService.create.mockResolvedValue({ qid: 'q1' });
    expect(await controller.create(mockReq, dto)).toEqual({ qid: 'q1' });
    expect(mockQuizzesService.create).toHaveBeenCalledWith(dto);
  });

  it('update', async () => {
    const dto: any = { name: 'Quiz 2' };
    mockQuizzesService.update.mockResolvedValue({ qid: 'q1' });
    expect(await controller.update(mockReq, 'q1', dto)).toEqual({ qid: 'q1' });
    expect(mockQuizzesService.update).toHaveBeenCalledWith('q1', dto);
  });

  it('delete', async () => {
    mockQuizzesService.delete.mockResolvedValue(undefined);
    expect(await controller.delete(mockReq, 'q1')).toEqual({
      message: 'Quiz with ID q1 deleted successfully',
    });
    expect(mockQuizzesService.delete).toHaveBeenCalledWith('q1');
  });
});
