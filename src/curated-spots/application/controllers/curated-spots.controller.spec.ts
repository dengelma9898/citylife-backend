import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CuratedSpotsController } from './curated-spots.controller';
import { CuratedSpotsService } from '../services/curated-spots.service';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';
import { CuratedSpot } from '../../interfaces/curated-spot.interface';
import { CuratedSpotStatus } from '../../domain/enums/curated-spot-status.enum';
import { KidsLocationType } from '../../domain/enums/kids-location-type.enum';
import { KidsAgeGroup } from '../../domain/enums/kids-age-group.enum';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { CuratedSpotsUserRatingsSettingsService } from '../services/curated-spots-user-ratings-settings.service';
import { CuratedSpotUserRatingsService } from '../services/curated-spot-user-ratings.service';
import { CuratedSpotsUserRatingsEnabledGuard } from '../guards/curated-spots-user-ratings-enabled.guard';

describe('CuratedSpotsController', () => {
  let controller: CuratedSpotsController;
  let mockCuratedSpotsService: Record<string, jest.Mock>;
  let mockFirebaseStorageService: Record<string, jest.Mock>;

  const sampleAddress = {
    street: 'Hauptstraße',
    houseNumber: '1',
    postalCode: '90403',
    city: 'Nürnberg',
    latitude: 49.45,
    longitude: 11.08,
  };

  const mockSpot = ({
    id: 'spot-1',
    name: 'Test Spot',
    nameLower: 'test spot',
    descriptionMarkdown: 'Hello',
    imageUrls: [],
    keywordIds: ['k1'],
    address: sampleAddress,
    videoUrl: null,
    instagramUrl: null,
    status: CuratedSpotStatus.ACTIVE,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: 'user-1',
  });

  beforeEach(async () => {
    mockCuratedSpotsService = {
      listAllForAdmin: jest.fn(),
      getByIdForAdmin: jest.fn(),
      searchActive: jest.fn(),
      searchKids: jest.fn(),
      listActiveForApp: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      appendImageUrls: jest.fn(),
      getByIdForApp: jest.fn(),
    };
    mockFirebaseStorageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };
    const mockUserRatingsSettingsService = {
      getSettings: jest.fn(),
      isFeatureEnabled: jest.fn(),
      updateSettings: jest.fn(),
    };
    const mockCuratedSpotUserRatingsService = {
      getMyRating: jest.fn(),
      submitOnce: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CuratedSpotsController],
      providers: [
        { provide: CuratedSpotsService, useValue: mockCuratedSpotsService },
        { provide: FirebaseStorageService, useValue: mockFirebaseStorageService },
        { provide: CuratedSpotsUserRatingsSettingsService, useValue: mockUserRatingsSettingsService },
        { provide: CuratedSpotUserRatingsService, useValue: mockCuratedSpotUserRatingsService },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CuratedSpotsUserRatingsEnabledGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<CuratedSpotsController>(CuratedSpotsController);
  });

  it('listAdmin should delegate', async () => {
    mockCuratedSpotsService.listAllForAdmin.mockResolvedValue([mockSpot]);
    const result = await controller.listAdmin();
    expect(result).toHaveLength(1);
  });

  it('search should parse keyword ids', async () => {
    mockCuratedSpotsService.searchActive.mockResolvedValue([mockSpot]);
    const result = await controller.search('caf', ['a', 'b']);
    expect(mockCuratedSpotsService.searchActive).toHaveBeenCalledWith('caf', ['a', 'b']);
    expect(result).toHaveLength(1);
  });

  it('listKids should convert query to filters and delegate', async () => {
    mockCuratedSpotsService.searchKids.mockResolvedValue([mockSpot]);
    const result = await controller.listKids({
      locationType: KidsLocationType.INDOOR,
      ageGroup: KidsAgeGroup.TODDLER,
      isFree: 'true',
      isBadWeatherTip: 'false',
    });
    expect(mockCuratedSpotsService.searchKids).toHaveBeenCalledWith({
      locationType: KidsLocationType.INDOOR,
      ageGroup: KidsAgeGroup.TODDLER,
      isFree: true,
      isBadWeatherTip: undefined,
    });
    expect(result).toHaveLength(1);
  });

  it('listKids should pass empty filters when no query is given', async () => {
    mockCuratedSpotsService.searchKids.mockResolvedValue([]);
    await controller.listKids({});
    expect(mockCuratedSpotsService.searchKids).toHaveBeenCalledWith({
      locationType: undefined,
      ageGroup: undefined,
      isFree: undefined,
      isBadWeatherTip: undefined,
    });
  });

  it('should register GET kids before GET :id so the route is not shadowed', () => {
    const routeOf = (name: keyof CuratedSpotsController): string =>
      Reflect.getMetadata('path', CuratedSpotsController.prototype[name]);
    const handlerNames = Object.getOwnPropertyNames(CuratedSpotsController.prototype);
    expect(routeOf('listKids')).toBe('kids');
    expect(handlerNames.indexOf('listKids')).toBeLessThan(handlerNames.indexOf('getById'));
  });

  it('uploadImages should throw when no files', async () => {
    mockCuratedSpotsService.getByIdForAdmin.mockResolvedValue(mockSpot);
    await expect(controller.uploadImages('spot-1', undefined)).rejects.toThrow(BadRequestException);
  });

  it('uploadVideo should upload and update', async () => {
    mockCuratedSpotsService.getByIdForAdmin.mockResolvedValue(mockSpot);
    mockFirebaseStorageService.uploadFile.mockResolvedValue('https://storage/video.mp4');
    mockCuratedSpotsService.update.mockResolvedValue(mockSpot);
    const file = { originalname: 'v.mp4' } as Express.Multer.File;
    await controller.uploadVideo('spot-1', file);
    expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalled();
    expect(mockCuratedSpotsService.update).toHaveBeenCalledWith('spot-1', { videoUrl: 'https://storage/video.mp4' });
  });
});
