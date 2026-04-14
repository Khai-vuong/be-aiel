import { Test, TestingModule } from '@nestjs/testing';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('AttemptsController', () => {
  let controller: AttemptsController;
  let service: AttemptsService;

  const mockAttemptsService = {
    create: jest.fn(),
    submit: jest.fn(),
    findByQuizId: jest.fn(),
    findByQuizAndStudent: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockReq = { user: { uid: 'user123' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttemptsController],
      providers: [{ provide: AttemptsService, useValue: mockAttemptsService }],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AttemptsController>(AttemptsController);
    service = module.get<AttemptsService>(AttemptsService);
    jest.clearAllMocks();
  });

  it('create', async () => {
    const dto: any = { quiz_id: 'q1', student_id: 's1' };
    mockAttemptsService.create.mockResolvedValue({ atid: 'a1' });
    expect(await controller.create(mockReq, dto)).toEqual({ atid: 'a1' });
    expect(mockAttemptsService.create).toHaveBeenCalledWith(mockReq.user, dto);
  });

  it('submit', async () => {
    const dto: any = { answers: [] };
    mockAttemptsService.submit.mockResolvedValue({
      atid: 'a1',
      status: 'submitted',
    });
    expect(await controller.submit(mockReq, 'a1', dto)).toEqual({
      atid: 'a1',
      status: 'submitted',
    });
    expect(mockAttemptsService.submit).toHaveBeenCalledWith(
      mockReq.user,
      'a1',
      dto,
    );
  });

  it('findByQuizId', async () => {
    mockAttemptsService.findByQuizId.mockResolvedValue([]);
    expect(await controller.findByQuizId('q1')).toEqual([]);
    expect(mockAttemptsService.findByQuizId).toHaveBeenCalledWith('q1');
  });

  it('findByQuizAndStudent', async () => {
    mockAttemptsService.findByQuizAndStudent.mockResolvedValue([]);
    expect(await controller.findByQuizAndStudent('q1', 's1')).toEqual([]);
    expect(mockAttemptsService.findByQuizAndStudent).toHaveBeenCalledWith(
      'q1',
      's1',
    );
  });

  it('findOne', async () => {
    mockAttemptsService.findOne.mockResolvedValue({ atid: 'a1' });
    expect(await controller.findOne('a1')).toEqual({ atid: 'a1' });
  });

  it('update', async () => {
    const dto: any = { score: 10 };
    mockAttemptsService.update.mockResolvedValue({ atid: 'a1', score: 10 });
    expect(await controller.update(mockReq, 'a1', dto)).toEqual({
      atid: 'a1',
      score: 10,
    });
  });
});
