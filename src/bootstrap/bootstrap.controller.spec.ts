import { Test, TestingModule } from '@nestjs/testing';
import { BootstrapController } from './bootstrap.controller';
import { BootstrapService } from './bootstrap.service';
import { AuthGuard } from '../core/guards/auth.guard';

describe('BootstrapController', () => {
  let controller: BootstrapController;
  const mockBootstrapService = {
    getBootstrap: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BootstrapController],
      providers: [{ provide: BootstrapService, useValue: mockBootstrapService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<BootstrapController>(BootstrapController);
    jest.clearAllMocks();
  });

  it('should call bootstrap service with user id from request', async () => {
    const mockResponse = {
      appSettings: [],
      eventCategories: [],
      businessCategories: [],
      keywords: [],
      downtime: { isDowntime: false },
      userProfile: null,
    };
    mockBootstrapService.getBootstrap.mockResolvedValue(mockResponse);
    const result = await controller.getBootstrap({ user: { uid: 'user-abc' } });
    expect(result).toEqual(mockResponse);
    expect(mockBootstrapService.getBootstrap).toHaveBeenCalledWith('user-abc', undefined);
  });

  it('should pass optional version query to bootstrap service', async () => {
    mockBootstrapService.getBootstrap.mockResolvedValue({
      appSettings: [],
      eventCategories: [],
      businessCategories: [],
      keywords: [],
      downtime: { isDowntime: false },
      appVersion: { requiresUpdate: false },
      userProfile: null,
    });
    await controller.getBootstrap({ user: { uid: 'user-abc' } }, '1.2.3');
    expect(mockBootstrapService.getBootstrap).toHaveBeenCalledWith('user-abc', '1.2.3');
  });
});
