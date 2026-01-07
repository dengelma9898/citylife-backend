import { Test, TestingModule } from '@nestjs/testing';
import { AppVersionsService } from './app-versions.service';
import { AppVersionRepository, APP_VERSION_REPOSITORY } from '../../domain/repositories/app-version.repository';
import { AppVersion } from '../../domain/entities/app-version.entity';

describe('AppVersionsService', () => {
  let service: AppVersionsService;
  let repository: AppVersionRepository;

  const mockAppVersionRepository = {
    findCurrent: jest.fn(),
    save: jest.fn(),
  };

  const mockAppVersion = AppVersion.create({
    minimumVersion: '1.2.0',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppVersionsService,
        {
          provide: APP_VERSION_REPOSITORY,
          useValue: mockAppVersionRepository,
        },
      ],
    }).compile();

    service = module.get<AppVersionsService>(AppVersionsService);
    repository = module.get<AppVersionRepository>(APP_VERSION_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkVersion', () => {
    it('should return false when no minimum version is configured', async () => {
      mockAppVersionRepository.findCurrent.mockResolvedValue(null);

      const result = await service.checkVersion('1.0.0');

      expect(result).toBe(false);
      expect(mockAppVersionRepository.findCurrent).toHaveBeenCalled();
    });

    it('should return false when client version is equal to minimum version', async () => {
      const currentVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      mockAppVersionRepository.findCurrent.mockResolvedValue(currentVersion);

      const result = await service.checkVersion('1.2.0');

      expect(result).toBe(false);
      expect(mockAppVersionRepository.findCurrent).toHaveBeenCalled();
    });

    it('should return false when client version is newer than minimum version', async () => {
      const currentVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      mockAppVersionRepository.findCurrent.mockResolvedValue(currentVersion);

      const result = await service.checkVersion('1.3.0');

      expect(result).toBe(false);
      expect(mockAppVersionRepository.findCurrent).toHaveBeenCalled();
    });

    it('should return true when client version is older than minimum version', async () => {
      const currentVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      mockAppVersionRepository.findCurrent.mockResolvedValue(currentVersion);

      const result = await service.checkVersion('1.1.0');

      expect(result).toBe(true);
      expect(mockAppVersionRepository.findCurrent).toHaveBeenCalled();
    });

    it('should ignore build number in version string', async () => {
      const currentVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      mockAppVersionRepository.findCurrent.mockResolvedValue(currentVersion);

      const result = await service.checkVersion('1.1.0 (123)');

      expect(result).toBe(true);
      expect(mockAppVersionRepository.findCurrent).toHaveBeenCalled();
    });

    it('should handle version comparison correctly for patch versions', async () => {
      const currentVersion = AppVersion.create({ minimumVersion: '1.2.5' });
      mockAppVersionRepository.findCurrent.mockResolvedValue(currentVersion);

      const resultOld = await service.checkVersion('1.2.4');
      const resultNew = await service.checkVersion('1.2.6');

      expect(resultOld).toBe(true);
      expect(resultNew).toBe(false);
    });

    it('should handle version comparison correctly for minor versions', async () => {
      const currentVersion = AppVersion.create({ minimumVersion: '1.3.0' });
      mockAppVersionRepository.findCurrent.mockResolvedValue(currentVersion);

      const resultOld = await service.checkVersion('1.2.9');
      const resultNew = await service.checkVersion('1.3.1');

      expect(resultOld).toBe(true);
      expect(resultNew).toBe(false);
    });

    it('should handle version comparison correctly for major versions', async () => {
      const currentVersion = AppVersion.create({ minimumVersion: '2.0.0' });
      mockAppVersionRepository.findCurrent.mockResolvedValue(currentVersion);

      const resultOld = await service.checkVersion('1.9.9');
      const resultNew = await service.checkVersion('2.0.1');

      expect(resultOld).toBe(true);
      expect(resultNew).toBe(false);
    });

    it('should throw error for invalid version format', async () => {
      const currentVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      mockAppVersionRepository.findCurrent.mockResolvedValue(currentVersion);

      await expect(service.checkVersion('invalid')).rejects.toThrow('Invalid version format');
    });
  });

  describe('setMinimumVersion', () => {
    it('should create new version when none exists', async () => {
      mockAppVersionRepository.findCurrent.mockResolvedValue(null);
      const newVersion = AppVersion.create({ minimumVersion: '1.3.0' });
      mockAppVersionRepository.save.mockResolvedValue(newVersion);

      const result = await service.setMinimumVersion('1.3.0');

      expect(result).toBeDefined();
      expect(result.minimumVersion).toBe('1.3.0');
      expect(mockAppVersionRepository.findCurrent).toHaveBeenCalled();
      expect(mockAppVersionRepository.save).toHaveBeenCalled();
    });

    it('should update existing version', async () => {
      const existingVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      mockAppVersionRepository.findCurrent.mockResolvedValue(existingVersion);
      const updatedVersion = existingVersion.update({ minimumVersion: '1.3.0' });
      mockAppVersionRepository.save.mockResolvedValue(updatedVersion);

      const result = await service.setMinimumVersion('1.3.0');

      expect(result).toBeDefined();
      expect(result.minimumVersion).toBe('1.3.0');
      expect(mockAppVersionRepository.findCurrent).toHaveBeenCalled();
      expect(mockAppVersionRepository.save).toHaveBeenCalled();
    });

    it('should throw error for invalid version format', async () => {
      await expect(service.setMinimumVersion('invalid')).rejects.toThrow('Invalid version format');
      expect(mockAppVersionRepository.findCurrent).not.toHaveBeenCalled();
      expect(mockAppVersionRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error for version without patch number', async () => {
      await expect(service.setMinimumVersion('1.2')).rejects.toThrow('Invalid version format');
      expect(mockAppVersionRepository.findCurrent).not.toHaveBeenCalled();
      expect(mockAppVersionRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error for version with non-numeric parts', async () => {
      await expect(service.setMinimumVersion('1.2.a')).rejects.toThrow('Invalid version format');
      expect(mockAppVersionRepository.findCurrent).not.toHaveBeenCalled();
      expect(mockAppVersionRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getMinimumVersion', () => {
    it('should return current minimum version', async () => {
      mockAppVersionRepository.findCurrent.mockResolvedValue(mockAppVersion);

      const result = await service.getMinimumVersion();

      expect(result).toBeDefined();
      expect(result?.minimumVersion).toBe('1.2.0');
      expect(mockAppVersionRepository.findCurrent).toHaveBeenCalled();
    });

    it('should return null when no version is configured', async () => {
      mockAppVersionRepository.findCurrent.mockResolvedValue(null);

      const result = await service.getMinimumVersion();

      expect(result).toBeNull();
      expect(mockAppVersionRepository.findCurrent).toHaveBeenCalled();
    });
  });
});

