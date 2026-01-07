import { Test, TestingModule } from '@nestjs/testing';
import { AppVersionsAdminController } from './app-versions-admin.controller';
import { AppVersionsService } from '../services/app-versions.service';
import { AppVersion } from '../../domain/entities/app-version.entity';
import { BadRequestException } from '@nestjs/common';
import { RolesGuard } from '../../../core/guards/roles.guard';

describe('AppVersionsAdminController', () => {
  let controller: AppVersionsAdminController;
  let service: AppVersionsService;

  const mockAppVersionsService = {
    getMinimumVersion: jest.fn(),
    setMinimumVersion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppVersionsAdminController],
      providers: [
        {
          provide: AppVersionsService,
          useValue: mockAppVersionsService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AppVersionsAdminController>(AppVersionsAdminController);
    service = module.get<AppVersionsService>(AppVersionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMinimumVersion', () => {
    it('should return current minimum version', async () => {
      const mockVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      mockAppVersionsService.getMinimumVersion.mockResolvedValue(mockVersion);

      const result = await controller.getMinimumVersion();

      expect(result).toBeDefined();
      expect(result?.minimumVersion).toBe('1.2.0');
      expect(mockAppVersionsService.getMinimumVersion).toHaveBeenCalled();
    });

    it('should return null when no version is configured', async () => {
      mockAppVersionsService.getMinimumVersion.mockResolvedValue(null);

      const result = await controller.getMinimumVersion();

      expect(result).toBeNull();
      expect(mockAppVersionsService.getMinimumVersion).toHaveBeenCalled();
    });
  });

  describe('setMinimumVersion', () => {
    it('should set minimum version successfully', async () => {
      const mockVersion = AppVersion.create({ minimumVersion: '1.3.0' });
      mockAppVersionsService.setMinimumVersion.mockResolvedValue(mockVersion);

      const dto = { minimumVersion: '1.3.0' };
      const result = await controller.setMinimumVersion(dto);

      expect(result).toBeDefined();
      expect(result.minimumVersion).toBe('1.3.0');
      expect(mockAppVersionsService.setMinimumVersion).toHaveBeenCalledWith('1.3.0');
    });

    it('should throw BadRequestException when minimumVersion is missing', async () => {
      const dto = { minimumVersion: '' };

      await expect(controller.setMinimumVersion(dto)).rejects.toThrow(BadRequestException);
      expect(mockAppVersionsService.setMinimumVersion).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when minimumVersion is undefined', async () => {
      const dto = { minimumVersion: undefined as any };

      await expect(controller.setMinimumVersion(dto)).rejects.toThrow(BadRequestException);
      expect(mockAppVersionsService.setMinimumVersion).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when service throws error for invalid format', async () => {
      mockAppVersionsService.setMinimumVersion.mockRejectedValue(
        new Error('Invalid version format: invalid. Expected format: X.Y.Z'),
      );

      const dto = { minimumVersion: 'invalid' };

      await expect(controller.setMinimumVersion(dto)).rejects.toThrow(BadRequestException);
      expect(mockAppVersionsService.setMinimumVersion).toHaveBeenCalledWith('invalid');
    });
  });
});

