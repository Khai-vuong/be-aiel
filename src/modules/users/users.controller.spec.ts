import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  // 1. Mock toàn bộ các hàm của UsersService
  const mockUsersService = {
    findAll: jest.fn(),
    login: jest.fn(),
    findUserById: jest.fn(),
    register: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      // Bỏ qua Guards để Unit Test có thể đi thẳng vào Controller
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('findAll - nên gọi service.findAll', async () => {
    mockUsersService.findAll.mockResolvedValue([{ uid: 'user1' }]);
    const result = await controller.findAll();
    expect(result).toEqual([{ uid: 'user1' }]);
    expect(mockUsersService.findAll).toHaveBeenCalled();
  });

  it('login - nên gọi service.login với DTO', async () => {
    const dto = { username: 'test', hashed_password: '123' };
    mockUsersService.login.mockResolvedValue({ userToken: 'token123' });
    const result = await controller.login(dto);
    expect(result).toEqual({ userToken: 'token123' });
    expect(mockUsersService.login).toHaveBeenCalledWith(dto);
  });

  it('getProfile - nên lấy uid từ request và gọi service.findUserById', async () => {
    const req = { user: { uid: 'u_123' } };
    mockUsersService.findUserById.mockResolvedValue({ uid: 'u_123' });
    const result = await controller.getProfile(req);
    expect(result).toEqual({ uid: 'u_123' });
    expect(mockUsersService.findUserById).toHaveBeenCalledWith('u_123');
  });

  it('findOne - nên gọi service.findUserById với param ID', async () => {
    mockUsersService.findUserById.mockResolvedValue({ uid: 'u_456' });
    const result = await controller.findOne('u_456');
    expect(result).toEqual({ uid: 'u_456' });
    expect(mockUsersService.findUserById).toHaveBeenCalledWith('u_456');
  });

  it('register - nên gọi service.register với DTO', async () => {
    const dto: any = { username: 'new_user', role: 'Student' };
    mockUsersService.register.mockResolvedValue({ uid: 'new_u' });
    const result = await controller.register(dto);
    expect(result).toEqual({ uid: 'new_u' });
    expect(mockUsersService.register).toHaveBeenCalledWith(dto);
  });

  describe('update', () => {
    const req = { user: { uid: 'my_uid' } };
    const dto: any = { status: 'Active' };

    it('nên gọi service.update với param ID nếu có truyền ID', async () => {
      mockUsersService.update.mockResolvedValue({ updated: true });
      await controller.update('target_id', dto, req);
      expect(mockUsersService.update).toHaveBeenCalledWith(
        req.user,
        'target_id',
        dto,
      );
    });

    it('nên gọi service.update với user.uid nếu không truyền param ID (fallback branch)', async () => {
      // Test nhánh "else" của câu lệnh: (id) ? ... : ... trong controller của bạn
      mockUsersService.update.mockResolvedValue({ updated: true });
      await controller.update(undefined as any, dto, req);
      expect(mockUsersService.update).toHaveBeenCalledWith(
        req.user,
        'my_uid',
        dto,
      );
    });
  });

  it('delete - nên gọi service.delete với param ID', async () => {
    const req = { user: { uid: 'admin_uid' } };
    mockUsersService.delete.mockResolvedValue({ status: 'Deleted' });
    await controller.delete('target_id', req);
    expect(mockUsersService.delete).toHaveBeenCalledWith(req.user, 'target_id');
  });
});
