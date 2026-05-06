import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CuratedSpotsController } from './curated-spots.controller';
import { CuratedSpotsService } from '../services/curated-spots.service';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';
import { CuratedSpot } from '../../domain/entities/curated-spot.entity';
import { CuratedSpotStatus } from '../../domain/enums/curated-spot-status.enum';
import { RolesGuard } from '../../../core/guards/roles.guard';

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

  const mockSpot = CuratedSpot.fromProps({
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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CuratedSpotsController],
      providers: [
        { provide: CuratedSpotsService, useValue: mockCuratedSpotsService },
        { provide: FirebaseStorageService, useValue: mockFirebaseStorageService },
      ],
    })
      .overrideGuard(RolesGuard)
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
