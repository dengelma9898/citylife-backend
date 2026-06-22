import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AppVersionsService } from './app-versions.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { AppVersion } from '../../domain/entities/app-version.entity';
import { VersionChangelog } from '../../domain/entities/version-changelog.entity';

describe('AppVersionsService', () => {
  let service: AppVersionsService;
  let currentAppVersion: AppVersion | null;
  let changelogs: VersionChangelog[];
  let currentVersionDoc: { exists: boolean; get: jest.Mock; update: jest.Mock; set: jest.Mock };
  let mockFirestore: { collection: jest.Mock };

  const mockAppVersion = AppVersion.create({
    minimumVersion: '1.2.0',
  });

  const createChangelogQuery = (versionFilter?: string) => ({
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockImplementation(async () => {
      const filtered = versionFilter
        ? changelogs.filter(c => c.version === versionFilter)
        : changelogs;
      return {
        empty: filtered.length === 0,
        docs: filtered.map(c => ({
          id: c.id,
          data: () => ({
            version: c.version,
            content: c.content,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            createdBy: c.createdBy,
          }),
        })),
      };
    }),
  });

  beforeEach(async () => {
    currentAppVersion = null;
    changelogs = [];
    currentVersionDoc = {
      exists: false,
      get: jest.fn().mockImplementation(async () => ({
        exists: currentAppVersion !== null,
        id: 'current',
        data: () =>
          currentAppVersion
            ? {
                minimumVersion: currentAppVersion.minimumVersion,
                createdAt: currentAppVersion.createdAt,
                updatedAt: currentAppVersion.updatedAt,
              }
            : undefined,
      })),
      update: jest.fn().mockImplementation(async (data: { minimumVersion: string }) => {
        if (currentAppVersion) {
          currentAppVersion = currentAppVersion.update({ minimumVersion: data.minimumVersion });
        }
      }),
      set: jest.fn().mockImplementation(async (data: { minimumVersion: string }) => {
        currentAppVersion = AppVersion.fromProps({
          id: 'current',
          minimumVersion: data.minimumVersion,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        currentVersionDoc.exists = true;
      }),
    };
    mockFirestore = {
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'app_versions') {
          return { doc: jest.fn().mockReturnValue(currentVersionDoc) };
        }
        if (name === 'version_changelogs') {
          return {
            where: jest.fn().mockImplementation((_field: string, _op: string, version: string) => {
              return createChangelogQuery(version);
            }),
            orderBy: jest.fn().mockReturnValue({
              get: jest.fn().mockImplementation(async () => ({
                docs: [...changelogs]
                  .sort((a, b) => b.version.localeCompare(a.version))
                  .map(c => ({
                    id: c.id,
                    data: () => ({
                      version: c.version,
                      content: c.content,
                      createdAt: c.createdAt,
                      updatedAt: c.updatedAt,
                      createdBy: c.createdBy,
                    }),
                  })),
              })),
            }),
            doc: jest.fn().mockImplementation((id: string) => ({
              set: jest.fn().mockImplementation(async (data: { version: string; content: string; createdBy: string }) => {
                changelogs.push(
                  VersionChangelog.fromProps({
                    id,
                    version: data.version,
                    content: data.content,
                    createdBy: data.createdBy,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }),
                );
              }),
              update: jest.fn().mockImplementation(async (data: { content: string }) => {
                const index = changelogs.findIndex(c => c.id === id);
                if (index >= 0) {
                  changelogs[index] = changelogs[index].update({ content: data.content });
                }
              }),
              delete: jest.fn().mockImplementation(async () => {
                changelogs = changelogs.filter(c => c.id !== id);
              }),
            })),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppVersionsService,
        { provide: FirebaseService, useValue: { getFirestore: jest.fn().mockReturnValue(mockFirestore) } },
      ],
    }).compile();
    service = module.get<AppVersionsService>(AppVersionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkVersion', () => {
    it('should return false when no minimum version is configured', async () => {
      const result = await service.checkVersion('1.0.0');
      expect(result).toBe(false);
    });

    it('should return false when client version is equal to minimum version', async () => {
      currentAppVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      const result = await service.checkVersion('1.2.0');
      expect(result).toBe(false);
    });

    it('should return false when client version is newer than minimum version', async () => {
      currentAppVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      const result = await service.checkVersion('1.3.0');
      expect(result).toBe(false);
    });

    it('should return true when client version is older than minimum version', async () => {
      currentAppVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      const result = await service.checkVersion('1.1.0');
      expect(result).toBe(true);
    });

    it('should ignore build number in version string', async () => {
      currentAppVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      const result = await service.checkVersion('1.1.0 (123)');
      expect(result).toBe(true);
    });

    it('should handle version comparison correctly for patch versions', async () => {
      currentAppVersion = AppVersion.create({ minimumVersion: '1.2.5' });
      const resultOld = await service.checkVersion('1.2.4');
      const resultNew = await service.checkVersion('1.2.6');
      expect(resultOld).toBe(true);
      expect(resultNew).toBe(false);
    });

    it('should handle version comparison correctly for minor versions', async () => {
      currentAppVersion = AppVersion.create({ minimumVersion: '1.3.0' });
      const resultOld = await service.checkVersion('1.2.9');
      const resultNew = await service.checkVersion('1.3.1');
      expect(resultOld).toBe(true);
      expect(resultNew).toBe(false);
    });

    it('should handle version comparison correctly for major versions', async () => {
      currentAppVersion = AppVersion.create({ minimumVersion: '2.0.0' });
      const resultOld = await service.checkVersion('1.9.9');
      const resultNew = await service.checkVersion('2.0.1');
      expect(resultOld).toBe(true);
      expect(resultNew).toBe(false);
    });

    it('should throw error for invalid version format', async () => {
      currentAppVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      await expect(service.checkVersion('invalid')).rejects.toThrow('Invalid version format');
    });
  });

  describe('setMinimumVersion', () => {
    it('should create new version when none exists', async () => {
      const result = await service.setMinimumVersion('1.3.0');
      expect(result).toBeDefined();
      expect(result.minimumVersion).toBe('1.3.0');
      expect(currentVersionDoc.set).toHaveBeenCalled();
    });

    it('should update existing version', async () => {
      currentAppVersion = AppVersion.create({ minimumVersion: '1.2.0' });
      const result = await service.setMinimumVersion('1.3.0');
      expect(result).toBeDefined();
      expect(result.minimumVersion).toBe('1.3.0');
      expect(currentVersionDoc.update).toHaveBeenCalled();
    });

    it('should throw error for invalid version format', async () => {
      await expect(service.setMinimumVersion('invalid')).rejects.toThrow('Invalid version format');
    });

    it('should throw error for version without patch number', async () => {
      await expect(service.setMinimumVersion('1.2')).rejects.toThrow('Invalid version format');
    });

    it('should throw error for version with non-numeric parts', async () => {
      await expect(service.setMinimumVersion('1.2.a')).rejects.toThrow('Invalid version format');
    });
  });

  describe('getMinimumVersion', () => {
    it('should return current minimum version', async () => {
      currentAppVersion = mockAppVersion;
      const result = await service.getMinimumVersion();
      expect(result).toBeDefined();
      expect(result?.minimumVersion).toBe('1.2.0');
    });

    it('should return null when no version is configured', async () => {
      const result = await service.getMinimumVersion();
      expect(result).toBeNull();
    });
  });

  describe('getChangelogForVersion', () => {
    it('should return changelog when it exists', async () => {
      const changelog = VersionChangelog.create({
        version: '1.2.3',
        content: '# Changelog\n\n- New feature',
        createdBy: 'user123',
      });
      changelogs = [changelog];
      const result = await service.getChangelogForVersion('1.2.3');
      expect(result).toBeDefined();
      expect(result?.version).toBe('1.2.3');
      expect(result?.content).toBe('# Changelog\n\n- New feature');
    });

    it('should return null when changelog does not exist', async () => {
      const result = await service.getChangelogForVersion('1.2.3');
      expect(result).toBeNull();
    });

    it('should extract version from string with build number', async () => {
      const changelog = VersionChangelog.create({
        version: '1.2.3',
        content: '# Changelog',
        createdBy: 'user123',
      });
      changelogs = [changelog];
      const result = await service.getChangelogForVersion('1.2.3 (456)');
      expect(result?.version).toBe('1.2.3');
    });
  });

  describe('createChangelog', () => {
    it('should create changelog successfully', async () => {
      const result = await service.createChangelog('1.2.3', '# Changelog', 'user123');
      expect(result).toBeDefined();
      expect(result.version).toBe('1.2.3');
      expect(changelogs).toHaveLength(1);
    });

    it('should throw ConflictException when changelog already exists', async () => {
      changelogs = [
        VersionChangelog.create({
          version: '1.2.3',
          content: '# Existing',
          createdBy: 'user123',
        }),
      ];
      await expect(service.createChangelog('1.2.3', '# New', 'user123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw error for invalid version format', async () => {
      await expect(service.createChangelog('invalid', '# Content', 'user123')).rejects.toThrow(
        'Invalid version format',
      );
    });
  });

  describe('updateChangelog', () => {
    it('should update changelog successfully', async () => {
      changelogs = [
        VersionChangelog.create({
          version: '1.2.3',
          content: '# Old content',
          createdBy: 'user123',
        }),
      ];
      const result = await service.updateChangelog('1.2.3', '# New content');
      expect(result).toBeDefined();
      expect(result.content).toBe('# New content');
    });

    it('should throw NotFoundException when changelog does not exist', async () => {
      await expect(service.updateChangelog('1.2.3', '# Content')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllChangelogs', () => {
    it('should return all changelogs', async () => {
      changelogs = [
        VersionChangelog.create({ version: '1.3.0', content: '# v1.3.0', createdBy: 'user1' }),
        VersionChangelog.create({ version: '1.2.0', content: '# v1.2.0', createdBy: 'user2' }),
      ];
      const result = await service.getAllChangelogs();
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no changelogs exist', async () => {
      const result = await service.getAllChangelogs();
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteChangelog', () => {
    it('should delete changelog successfully', async () => {
      const changelog = VersionChangelog.create({
        version: '1.2.3',
        content: '# Content',
        createdBy: 'user123',
      });
      changelogs = [changelog];
      await service.deleteChangelog('1.2.3');
      expect(changelogs).toHaveLength(0);
    });

    it('should throw NotFoundException when changelog does not exist', async () => {
      await expect(service.deleteChangelog('1.2.3')).rejects.toThrow(NotFoundException);
    });
  });
});
