import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CuratedSpotsService } from './curated-spots.service';
import { SpotKeywordsService } from './spot-keywords.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { CuratedSpot } from '../../domain/entities/curated-spot.entity';
import { CuratedSpotStatus } from '../../domain/enums/curated-spot-status.enum';
import { UpdateCuratedSpotDto } from '../../dto/update-curated-spot.dto';

describe('CuratedSpotsService', () => {
  let service: CuratedSpotsService;
  let mockSpotKeywordsService: Record<string, jest.Mock>;
  let findByIdSpy: jest.SpyInstance;
  let findAllActiveNotDeletedSpy: jest.SpyInstance;
  let findActiveNotDeletedByKeywordContainsSpy: jest.SpyInstance;
  let createSpotSpy: jest.SpyInstance;
  let updateSpotSpy: jest.SpyInstance;

  const sampleAddress = {
    street: 'Hauptstraße',
    houseNumber: '1',
    postalCode: '90403',
    city: 'Nürnberg',
    latitude: 49.45,
    longitude: 11.08,
  };

  const activeSpotA = CuratedSpot.fromProps({
    id: 's1',
    name: 'Alpha Cafe',
    nameLower: 'alpha cafe',
    descriptionMarkdown: 'x',
    imageUrls: [],
    keywordIds: ['k1', 'k2'],
    address: sampleAddress,
    videoUrl: null,
    instagramUrl: null,
    status: CuratedSpotStatus.ACTIVE,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: null,
  });

  const activeSpotB = CuratedSpot.fromProps({
    id: 's2',
    name: 'Alpha Bar',
    nameLower: 'alpha bar',
    descriptionMarkdown: 'y',
    imageUrls: [],
    keywordIds: ['k1'],
    address: sampleAddress,
    videoUrl: null,
    instagramUrl: null,
    status: CuratedSpotStatus.ACTIVE,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: null,
  });

  beforeEach(async () => {
    mockSpotKeywordsService = {
      suggestByPrefix: jest.fn(),
      create: jest.fn(),
      resolveNewKeywordNamesToIds: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuratedSpotsService,
        { provide: FirebaseService, useValue: { getFirestore: jest.fn() } },
        { provide: SpotKeywordsService, useValue: mockSpotKeywordsService },
      ],
    }).compile();
    service = module.get<CuratedSpotsService>(CuratedSpotsService);
    findByIdSpy = jest.spyOn(service as any, 'findById');
    findAllActiveNotDeletedSpy = jest.spyOn(service as any, 'findAllActiveNotDeleted');
    findActiveNotDeletedByKeywordContainsSpy = jest.spyOn(
      service as any,
      'findActiveNotDeletedByKeywordContains',
    );
    createSpotSpy = jest.spyOn(service as any, 'createSpot');
    updateSpotSpy = jest.spyOn(service as any, 'updateSpot');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('should persist mandatory address', async () => {
      mockSpotKeywordsService.resolveNewKeywordNamesToIds.mockResolvedValue([]);
      createSpotSpy.mockImplementation((s: CuratedSpot) => Promise.resolve(s));
      await service.create(
        {
          name: 'Neu',
          descriptionMarkdown: 'Text',
          address: sampleAddress,
        },
        'user-1',
      );
      const created = createSpotSpy.mock.calls[0][0] as CuratedSpot;
      expect(created.address.toJSON()).toEqual(sampleAddress);
    });
  });

  describe('update', () => {
    it('should patch address when provided', async () => {
      findByIdSpy.mockResolvedValue(activeSpotA);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      const newAddr = { ...sampleAddress, street: 'Neue Straße' };
      await service.update('s1', { address: newAddr });
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.address.street).toBe('Neue Straße');
    });

    it('should set adminRating and adminRatedAt on first assign', async () => {
      findByIdSpy.mockResolvedValue(activeSpotA);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      await service.update('s1', { adminRating: 4 });
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.adminRating).toBe(4);
      expect(updated.adminRatedAt).toMatch(/^\d{4}-/);
    });

    it('should update adminRating and refresh adminRatedAt when value changes', async () => {
      const rated = activeSpotA.update({ adminRating: 4, adminRatedAt: '2026-01-02T00:00:00.000Z' });
      findByIdSpy.mockResolvedValue(rated);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      await service.update('s1', { adminRating: 5 });
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.adminRating).toBe(5);
      expect(updated.adminRatedAt).not.toBe('2026-01-02T00:00:00.000Z');
      expect(updated.adminRatedAt).toMatch(/^\d{4}-/);
    });

    it('should clear adminRating and adminRatedAt when PATCH sends null', async () => {
      const rated = activeSpotA.update({ adminRating: 4, adminRatedAt: '2026-01-02T00:00:00.000Z' });
      findByIdSpy.mockResolvedValue(rated);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      await service.update('s1', { adminRating: null });
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.adminRating).toBeNull();
      expect(updated.adminRatedAt).toBeNull();
    });

    it('should not touch admin fields when adminRating equals existing (idempotent)', async () => {
      const rated = activeSpotA.update({ adminRating: 4, adminRatedAt: '2026-01-02T00:00:00.000Z' });
      findByIdSpy.mockResolvedValue(rated);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      await service.update('s1', { name: 'Renamed', adminRating: 4 });
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.name).toBe('Renamed');
      expect(updated.adminRating).toBe(4);
      expect(updated.adminRatedAt).toBe('2026-01-02T00:00:00.000Z');
    });

    it('should normalize videoUrl with spaces on update', async () => {
      findByIdSpy.mockResolvedValue(activeSpotA);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      await service.update('s1', {
        videoUrl: 'https://storage.test/x/Video File Name.mp4',
      } as UpdateCuratedSpotDto);
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.videoUrl).toBe('https://storage.test/x/Video%20File%20Name.mp4');
    });
  });

  describe('parseKeywordIdsFromQuery', () => {
    it('should parse comma-separated and dedupe', () => {
      expect(CuratedSpotsService.parseKeywordIdsFromQuery(['a,b', 'a'])).toEqual(['a', 'b']);
    });
  });

  describe('searchActive', () => {
    it('should apply AND for multiple keyword ids', async () => {
      findActiveNotDeletedByKeywordContainsSpy.mockResolvedValue([activeSpotA, activeSpotB]);
      const result = await service.searchActive(undefined, ['k1', 'k2']);
      expect(result.map(s => s.id)).toEqual(['s1']);
    });

    it('should combine name prefix with keyword AND', async () => {
      findActiveNotDeletedByKeywordContainsSpy.mockResolvedValue([activeSpotA, activeSpotB]);
      const result = await service.searchActive('alpha c', ['k1']);
      expect(result.map(s => s.id)).toEqual(['s1']);
    });

    it('should list all active when no filters', async () => {
      findAllActiveNotDeletedSpy.mockResolvedValue([activeSpotA]);
      const result = await service.searchActive(undefined, []);
      expect(result).toHaveLength(1);
    });
  });

  describe('getByIdForApp', () => {
    it('should throw when pending', async () => {
      const pending = activeSpotA.update({ status: CuratedSpotStatus.PENDING });
      findByIdSpy.mockResolvedValue(pending);
      await expect(service.getByIdForApp('s1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('appendImageUrls', () => {
    it('should throw when no urls', async () => {
      findByIdSpy.mockResolvedValue(activeSpotA);
      await expect(service.appendImageUrls('s1', [])).rejects.toThrow(BadRequestException);
    });
  });
});
