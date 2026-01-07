import { Test, TestingModule } from '@nestjs/testing';
import { AppVersionsController } from './app-versions.controller';
import { AppVersionsService } from '../services/app-versions.service';
import { BadRequestException } from '@nestjs/common';

describe('AppVersionsController', () => {
  let controller: AppVersionsController;
  let service: AppVersionsService;

  const mockAppVersionsService = {
    checkVersion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppVersionsController],
      providers: [
        {
          provide: AppVersionsService,
          useValue: mockAppVersionsService,
        },
      ],
    }).compile();

    controller = module.get<AppVersionsController>(AppVersionsController);
    service = module.get<AppVersionsService>(AppVersionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkVersion', () => {
    it('should return requiresUpdate false when version is current', async () => {
      mockAppVersionsService.checkVersion.mockResolvedValue(false);

      const result = await controller.checkVersion('1.2.0');

      expect(result).toEqual({ requiresUpdate: false });
      expect(mockAppVersionsService.checkVersion).toHaveBeenCalledWith('1.2.0');
    });

    it('should return requiresUpdate true when version needs update', async () => {
      mockAppVersionsService.checkVersion.mockResolvedValue(true);

      const result = await controller.checkVersion('1.1.0');

      expect(result).toEqual({ requiresUpdate: true });
      expect(mockAppVersionsService.checkVersion).toHaveBeenCalledWith('1.1.0');
    });

    it('should handle version with build number', async () => {
      mockAppVersionsService.checkVersion.mockResolvedValue(false);

      const result = await controller.checkVersion('1.2.0 (123)');

      expect(result).toEqual({ requiresUpdate: false });
      expect(mockAppVersionsService.checkVersion).toHaveBeenCalledWith('1.2.0 (123)');
    });

    it('should throw BadRequestException when version parameter is missing', async () => {
      await expect(controller.checkVersion(undefined as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockAppVersionsService.checkVersion).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when version parameter is empty string', async () => {
      await expect(controller.checkVersion('')).rejects.toThrow(BadRequestException);
      expect(mockAppVersionsService.checkVersion).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when service throws error for invalid format', async () => {
      mockAppVersionsService.checkVersion.mockRejectedValue(
        new Error('Invalid version format: invalid. Expected format: X.Y.Z or X.Y.Z (Build Nummer)'),
      );

      await expect(controller.checkVersion('invalid')).rejects.toThrow(BadRequestException);
      expect(mockAppVersionsService.checkVersion).toHaveBeenCalledWith('invalid');
    });
  });
});

