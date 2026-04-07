import { Test, TestingModule } from '@nestjs/testing';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('CoursesController', () => {
  let controller: CoursesController;
  let service: CoursesService;

  const mockCoursesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addLecturer: jest.fn(),
    removeLecturer: jest.fn(),
    registerStudentToCourse: jest.fn(),
    unregisterStudentFromCourse: jest.fn(),
    findEnrollmentsByUserId: jest.fn(),
    findCoursesByUserId: jest.fn(),
  };

  const mockReq = { user: { uid: 'my_uid' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [{ provide: CoursesService, useValue: mockCoursesService }],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CoursesController>(CoursesController);
    service = module.get<CoursesService>(CoursesService);
    jest.clearAllMocks();
  });

  it('findAll', async () => {
    mockCoursesService.findAll.mockResolvedValue([]);
    expect(await controller.findAll()).toEqual([]);
  });

  it('findOne', async () => {
    mockCoursesService.findOne.mockResolvedValue({ cid: 'c1' });
    expect(await controller.findOne('c1')).toEqual({ cid: 'c1' });
  });

  it('create', async () => {
    const dto: any = { code: '123' };
    mockCoursesService.create.mockResolvedValue({ cid: 'c1' });
    expect(await controller.create(mockReq, dto)).toEqual({ cid: 'c1' });
    expect(mockCoursesService.create).toHaveBeenCalledWith(mockReq.user, dto);
  });

  it('update', async () => {
    const dto: any = { code: '123' };
    mockCoursesService.update.mockResolvedValue({ cid: 'c1' });
    expect(await controller.update(mockReq, 'c1', dto)).toEqual({ cid: 'c1' });
  });

  it('delete', async () => {
    mockCoursesService.delete.mockResolvedValue(undefined);
    expect(await controller.delete(mockReq, 'c1')).toEqual({
      message: 'Course deleted successfully',
    });
  });

  it('addLecturer', async () => {
    mockCoursesService.addLecturer.mockResolvedValue({ cid: 'c1' });
    expect(await controller.addLecturer(mockReq, 'c1', 'l1')).toEqual({
      cid: 'c1',
    });
  });

  it('removeLecturer', async () => {
    mockCoursesService.removeLecturer.mockResolvedValue({ cid: 'c1' });
    expect(await controller.removeLecturer(mockReq, 'c1', 'l1')).toEqual({
      cid: 'c1',
    });
  });

  it('registerToCourse', async () => {
    mockCoursesService.registerStudentToCourse.mockResolvedValue({
      success: true,
    });
    expect(await controller.registerToCourse(mockReq, 'c1')).toEqual({
      success: true,
    });
    expect(mockCoursesService.registerStudentToCourse).toHaveBeenCalledWith(
      mockReq.user,
      'my_uid',
      'c1',
    );
  });

  it('unregisterFromCourse', async () => {
    mockCoursesService.unregisterStudentFromCourse.mockResolvedValue({
      success: true,
    });
    expect(await controller.unregisterFromCourse(mockReq, 'c1')).toEqual({
      success: true,
    });
  });

  it('findEnrollmentsByUserId', async () => {
    mockCoursesService.findEnrollmentsByUserId.mockResolvedValue([]);
    expect(await controller.findEnrollmentsByUserId(mockReq)).toEqual([]);
  });

  it('findCoursesByUserId', async () => {
    mockCoursesService.findCoursesByUserId.mockResolvedValue([]);
    expect(await controller.findCoursesByUserId(mockReq)).toEqual([]);
  });
});
