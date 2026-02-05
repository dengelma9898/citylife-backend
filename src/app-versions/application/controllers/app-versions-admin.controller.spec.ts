import { Test, TestingModule } from '@nestjs/testing';
import { AppVersionsAdminController } from './app-versions-admin.controller';
import { AppVersionsService } from '../services/app-versions.service';
import { AppVersion } from '../../domain/entities/app-version.entity';
import { VersionChangelog } from '../../domain/entities/version-changelog.entity';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RolesGuard } from '../../../core/guards/roles.guard';

describe('AppVersionsAdminController', () => {
  let controller: AppVersionsAdminController;
  let service: AppVersionsService;

  const mockAppVersionsService = {
    getMinimumVersion: jest.fn(),
    setMinimumVersion: jest.fn(),
    createChangelog: jest.fn(),
    getAllChangelogs: jest.fn(),
    getChangelogForVersion: jest.fn(),
    updateChangelog: jest.fn(),
    deleteChangelog: jest.fn(),
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

  describe('createChangelog', () => {
    it('should create changelog successfully', async () => {
      const mockChangelog = VersionChangelog.create({
        version: '1.2.3',
        content: '# Changelog',
        createdBy: 'user123',
      });
      mockAppVersionsService.createChangelog.mockResolvedValue(mockChangelog);

      const dto = { version: '1.2.3', content: '# Changelog' };
      const result = await controller.createChangelog(dto, 'user123');

      expect(result).toBeDefined();
      expect(result.version).toBe('1.2.3');
      expect(mockAppVersionsService.createChangelog).toHaveBeenCalledWith('1.2.3', '# Changelog', 'user123');
    });

    it('should throw ConflictException when changelog already exists', async () => {
      mockAppVersionsService.createChangelog.mockRejectedValue(
        new ConflictException('Changelog for version 1.2.3 already exists'),
      );

      const dto = { version: '1.2.3', content: '# New' };

      await expect(controller.createChangelog(dto, 'user123')).rejects.toThrow(ConflictException);
    });
  });

  describe('getAllChangelogs', () => {
    it('should return all changelogs', async () => {
      const changelogs = [
        VersionChangelog.create({ version: '1.3.0', content: '# v1.3.0', createdBy: 'user1' }),
        VersionChangelog.create({ version: '1.2.0', content: '# v1.2.0', createdBy: 'user2' }),
      ];
      mockAppVersionsService.getAllChangelogs.mockResolvedValue(changelogs);

      const result = await controller.getAllChangelogs();

      expect(result).toHaveLength(2);
      expect(mockAppVersionsService.getAllChangelogs).toHaveBeenCalled();
    });

    it('should return empty array when no changelogs exist', async () => {
      mockAppVersionsService.getAllChangelogs.mockResolvedValue([]);

      const result = await controller.getAllChangelogs();

      expect(result).toHaveLength(0);
    });
  });

  describe('getChangelogByVersion', () => {
    it('should return changelog for version', async () => {
      const mockChangelog = VersionChangelog.create({
        version: '1.2.3',
        content: '# Changelog',
        createdBy: 'user123',
      });
      mockAppVersionsService.getChangelogForVersion.mockResolvedValue(mockChangelog);

      const result = await controller.getChangelogByVersion('1.2.3');

      expect(result).toBeDefined();
      expect(result.version).toBe('1.2.3');
      expect(mockAppVersionsService.getChangelogForVersion).toHaveBeenCalledWith('1.2.3');
    });

    it('should throw NotFoundException when changelog does not exist', async () => {
      mockAppVersionsService.getChangelogForVersion.mockResolvedValue(null);

      await expect(controller.getChangelogByVersion('1.2.3')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateChangelog', () => {
    it('should update changelog successfully', async () => {
      const mockChangelog = VersionChangelog.create({
        version: '1.2.3',
        content: '# Updated',
        createdBy: 'user123',
      });
      mockAppVersionsService.updateChangelog.mockResolvedValue(mockChangelog);

      const dto = { content: '# Updated' };
      const result = await controller.updateChangelog('1.2.3', dto);

      expect(result).toBeDefined();
      expect(mockAppVersionsService.updateChangelog).toHaveBeenCalledWith('1.2.3', '# Updated');
    });

    it('should throw NotFoundException when changelog does not exist', async () => {
      mockAppVersionsService.updateChangelog.mockRejectedValue(
        new NotFoundException('Changelog for version 1.2.3 not found'),
      );

      const dto = { content: '# Updated' };

      await expect(controller.updateChangelog('1.2.3', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteChangelog', () => {
    it('should delete changelog successfully', async () => {
      mockAppVersionsService.deleteChangelog.mockResolvedValue(undefined);

      await controller.deleteChangelog('1.2.3');

      expect(mockAppVersionsService.deleteChangelog).toHaveBeenCalledWith('1.2.3');
    });

    it('should throw NotFoundException when changelog does not exist', async () => {
      mockAppVersionsService.deleteChangelog.mockRejectedValue(
        new NotFoundException('Changelog for version 1.2.3 not found'),
      );

      await expect(controller.deleteChangelog('1.2.3')).rejects.toThrow(NotFoundException);
    });
  });
});

