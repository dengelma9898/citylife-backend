import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CuratedSpotsService } from './curated-spots.service';
import { CURATED_SPOT_REPOSITORY } from '../../domain/repositories/curated-spot.repository';
import { SpotKeywordsService } from './spot-keywords.service';
import { CuratedSpot } from '../../domain/entities/curated-spot.entity';
import { CuratedSpotStatus } from '../../domain/enums/curated-spot-status.enum';

describe('CuratedSpotsService', () => {
  let service: CuratedSpotsService;
  let mockSpotRepository: Record<string, jest.Mock>;
  let mockSpotKeywordsService: Record<string, jest.Mock>;

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
    mockSpotRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findAllActiveNotDeleted: jest.fn(),
      findActiveNotDeletedByKeywordContains: jest.fn(),
      findActiveNotDeletedByNameLowerPrefix: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    mockSpotKeywordsService = {
      suggestByPrefix: jest.fn(),
      create: jest.fn(),
      resolveNewKeywordNamesToIds: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuratedSpotsService,
        { provide: CURATED_SPOT_REPOSITORY, useValue: mockSpotRepository },
        { provide: SpotKeywordsService, useValue: mockSpotKeywordsService },
      ],
    }).compile();
    service = module.get<CuratedSpotsService>(CuratedSpotsService);
  });

  describe('create', () => {
    it('should persist mandatory address', async () => {
      mockSpotKeywordsService.resolveNewKeywordNamesToIds.mockResolvedValue([]);
      mockSpotRepository.create.mockImplementation((s: CuratedSpot) => Promise.resolve(s));
      await service.create(
        {
          name: 'Neu',
          descriptionMarkdown: 'Text',
          address: sampleAddress,
        },
        'user-1',
      );
      const created = mockSpotRepository.create.mock.calls[0][0] as CuratedSpot;
      expect(created.address.toJSON()).toEqual(sampleAddress);
    });
  });

  describe('update', () => {
    it('should patch address when provided', async () => {
      mockSpotRepository.findById.mockResolvedValue(activeSpotA);
      mockSpotRepository.update.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      const newAddr = { ...sampleAddress, street: 'Neue Straße' };
      await service.update('s1', { address: newAddr });
      const updated = mockSpotRepository.update.mock.calls[0][1] as CuratedSpot;
      expect(updated.address.street).toBe('Neue Straße');
    });
  });

  describe('parseKeywordIdsFromQuery', () => {
    it('should parse comma-separated and dedupe', () => {
      expect(CuratedSpotsService.parseKeywordIdsFromQuery(['a,b', 'a'])).toEqual(['a', 'b']);
    });
  });

  describe('searchActive', () => {
    it('should apply AND for multiple keyword ids', async () => {
      mockSpotRepository.findActiveNotDeletedByKeywordContains.mockResolvedValue([activeSpotA, activeSpotB]);
      const result = await service.searchActive(undefined, ['k1', 'k2']);
      expect(result.map(s => s.id)).toEqual(['s1']);
    });

    it('should combine name prefix with keyword AND', async () => {
      mockSpotRepository.findActiveNotDeletedByKeywordContains.mockResolvedValue([activeSpotA, activeSpotB]);
      const result = await service.searchActive('alpha c', ['k1']);
      expect(result.map(s => s.id)).toEqual(['s1']);
    });

    it('should list all active when no filters', async () => {
      mockSpotRepository.findAllActiveNotDeleted.mockResolvedValue([activeSpotA]);
      const result = await service.searchActive(undefined, []);
      expect(result).toHaveLength(1);
    });
  });

  describe('getByIdForApp', () => {
    it('should throw when pending', async () => {
      const pending = activeSpotA.update({ status: CuratedSpotStatus.PENDING });
      mockSpotRepository.findById.mockResolvedValue(pending);
      await expect(service.getByIdForApp('s1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('appendImageUrls', () => {
    it('should throw when no urls', async () => {
      mockSpotRepository.findById.mockResolvedValue(activeSpotA);
      await expect(service.appendImageUrls('s1', [])).rejects.toThrow(BadRequestException);
    });
  });
});
