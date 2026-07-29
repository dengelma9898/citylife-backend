import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BootstrapService } from './bootstrap.service';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { EventCategoriesService } from '../event-categories/services/event-categories.service';
import { BusinessCategoriesService } from '../business-categories/application/services/business-categories.service';
import { KeywordsService } from '../keywords/keywords.service';
import { DowntimeService } from '../downtime/downtime.service';
import { AppVersionsService } from '../app-versions/application/services/app-versions.service';
import { UsersService } from '../users/users.service';
import { BootstrapPublicPayload } from './interfaces/bootstrap-payload.interface';

describe('BootstrapService', () => {
  let service: BootstrapService;
  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };
  const mockAppSettingsService = { getAll: jest.fn() };
  const mockEventCategoriesService = { findAll: jest.fn() };
  const mockBusinessCategoriesService = { getAll: jest.fn() };
  const mockKeywordsService = { getAll: jest.fn() };
  const mockDowntimeService = { getIsDowntime: jest.fn() };
  const mockAppVersionsService = {
    checkVersion: jest.fn(),
    getChangelogForVersion: jest.fn(),
  };
  const mockUsersService = { getById: jest.fn() };

  const mockPublicPayload: BootstrapPublicPayload = {
    appSettings: [{ id: 'general', preferences: [] }],
    eventCategories: [
      {
        id: 'cat1',
        name: 'Party',
        description: 'Party events',
        colorCode: '#fff',
        iconName: 'party',
        createdAt: '',
        updatedAt: '',
      },
    ],
    businessCategories: [
      {
        id: 'bc1',
        name: 'Food',
        iconName: 'food',
        description: 'Food',
        keywordIds: [],
        createdAt: '',
        updatedAt: '',
      },
    ],
    keywords: [{ id: 'kw1', name: 'Pizza', description: 'Pizza', createdAt: '', updatedAt: '' }],
    downtime: { isDowntime: false },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BootstrapService,
        { provide: AppSettingsService, useValue: mockAppSettingsService },
        { provide: EventCategoriesService, useValue: mockEventCategoriesService },
        { provide: BusinessCategoriesService, useValue: mockBusinessCategoriesService },
        { provide: KeywordsService, useValue: mockKeywordsService },
        { provide: DowntimeService, useValue: mockDowntimeService },
        { provide: AppVersionsService, useValue: mockAppVersionsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();
    service = module.get<BootstrapService>(BootstrapService);
    jest.clearAllMocks();
  });

  const setupServiceMocks = (): void => {
    mockAppSettingsService.getAll.mockResolvedValue(mockPublicPayload.appSettings);
    mockEventCategoriesService.findAll.mockResolvedValue(mockPublicPayload.eventCategories);
    mockBusinessCategoriesService.getAll.mockResolvedValue(mockPublicPayload.businessCategories);
    mockKeywordsService.getAll.mockResolvedValue(mockPublicPayload.keywords);
    mockDowntimeService.getIsDowntime.mockResolvedValue(false);
  };

  it('should return full bootstrap payload on cache miss', async () => {
    mockCacheManager.get.mockResolvedValue(null);
    setupServiceMocks();
    mockUsersService.getById.mockResolvedValue({ name: 'Test User', userType: 'user' });
    const result = await service.getBootstrap('user-1');
    expect(result.appSettings).toEqual(mockPublicPayload.appSettings);
    expect(result.eventCategories).toEqual(mockPublicPayload.eventCategories);
    expect(result.businessCategories).toEqual(mockPublicPayload.businessCategories);
    expect(result.keywords).toEqual(mockPublicPayload.keywords);
    expect(result.downtime).toEqual({ isDowntime: false });
    expect(result.appVersion).toBeUndefined();
    expect(result.userProfile).toEqual({ name: 'Test User', userType: 'user' });
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'bootstrap:public',
      expect.objectContaining({ downtime: { isDowntime: false } }),
      300000,
    );
    expect(mockUsersService.getById).toHaveBeenCalledWith('user-1');
  });

  it('should use cached public payload and still load user profile fresh', async () => {
    mockCacheManager.get.mockResolvedValue(mockPublicPayload);
    mockUsersService.getById.mockResolvedValue({ name: 'Cached User', userType: 'user' });
    const result = await service.getBootstrap('user-2');
    expect(result.userProfile).toEqual({ name: 'Cached User', userType: 'user' });
    expect(mockAppSettingsService.getAll).not.toHaveBeenCalled();
    expect(mockUsersService.getById).toHaveBeenCalledWith('user-2');
  });

  it('should include appVersion when version query is provided', async () => {
    mockCacheManager.get.mockResolvedValue(null);
    setupServiceMocks();
    mockAppVersionsService.checkVersion.mockResolvedValue(true);
    mockAppVersionsService.getChangelogForVersion.mockResolvedValue({
      content: 'Bug fixes',
    });
    mockUsersService.getById.mockResolvedValue(null);
    const result = await service.getBootstrap('user-1', '1.2.0');
    expect(result.appVersion).toEqual({
      requiresUpdate: true,
      changelogContent: 'Bug fixes',
    });
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'bootstrap:public:1.2.0',
      expect.objectContaining({
        appVersion: { requiresUpdate: true, changelogContent: 'Bug fixes' },
      }),
      300000,
    );
  });

  it('should omit changelogContent when no changelog exists', async () => {
    mockCacheManager.get.mockResolvedValue(null);
    setupServiceMocks();
    mockAppVersionsService.checkVersion.mockResolvedValue(false);
    mockAppVersionsService.getChangelogForVersion.mockResolvedValue(null);
    mockUsersService.getById.mockResolvedValue(null);
    const result = await service.getBootstrap('user-1', '2.0.0');
    expect(result.appVersion).toEqual({ requiresUpdate: false });
  });
});
