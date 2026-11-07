import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FeatureFlagsService } from './feature-flags.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { FeatureFlag } from '../../domain/enums/feature-flag.enum';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let mockCache: Record<string, jest.Mock>;
  let mockFirestore: Record<string, jest.Mock>;
  let mockCollection: Record<string, jest.Mock>;
  let mockDoc: Record<string, jest.Mock>;
  let docDataByDocumentId: Map<string, Record<string, unknown> | null>;
  let currentDocumentId = '';

  beforeEach(async () => {
    docDataByDocumentId = new Map();
    mockDoc = {
      get: jest.fn(async () => {
        const data = docDataByDocumentId.get(currentDocumentId);
        return {
          exists: data !== null && data !== undefined,
          id: currentDocumentId,
          data: () => data,
        };
      }),
      set: jest.fn(async (data: Record<string, unknown>) => {
        docDataByDocumentId.set(currentDocumentId, data);
      }),
    };
    mockCollection = {
      doc: jest.fn((documentId: string) => {
        currentDocumentId = documentId;
        return mockDoc;
      }),
    };
    mockFirestore = { collection: jest.fn(() => mockCollection) };
    mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagsService,
        { provide: FirebaseService, useValue: { getFirestore: () => mockFirestore } },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();
    service = module.get<FeatureFlagsService>(FeatureFlagsService);
  });

  describe('getFlag defaults', () => {
    beforeEach(() => {
      mockCache.get.mockResolvedValue(undefined);
    });

    it('should default community to enabled and persist the default document', async () => {
      const result = await service.getFlag(FeatureFlag.COMMUNITY);
      expect(result).toMatchObject({ id: 'community_settings', isEnabled: true });
      expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: true }));
    });

    it('should default kids spots to disabled and persist the default document', async () => {
      const result = await service.getFlag(FeatureFlag.KIDS_SPOTS);
      expect(result).toMatchObject({ id: 'kids_spots_settings', isEnabled: false });
      expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }));
    });

    it('should default christmas markets to disabled and persist the default document', async () => {
      const result = await service.getFlag(FeatureFlag.CHRISTMAS_MARKETS);
      expect(result).toMatchObject({ id: 'christmas_markets_settings', isEnabled: false });
      expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({ isEnabled: false }));
    });

    it('should read an existing document', async () => {
      docDataByDocumentId.set('kids_spots_settings', {
        isEnabled: true,
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedBy: 'admin-1',
      });
      const result = await service.getFlag(FeatureFlag.KIDS_SPOTS);
      expect(result).toEqual({
        id: 'kids_spots_settings',
        isEnabled: true,
        updatedAt: '2026-01-01T00:00:00.000Z',
        updatedBy: 'admin-1',
      });
      expect(mockDoc.set).not.toHaveBeenCalled();
    });

    it('should fall back to the default when isEnabled is malformed', async () => {
      docDataByDocumentId.set('community_settings', { isEnabled: 'yes' });
      const result = await service.getFlag(FeatureFlag.COMMUNITY);
      expect(result.isEnabled).toBe(true);
    });

    it('should convert Firestore timestamps', async () => {
      docDataByDocumentId.set('community_settings', {
        isEnabled: false,
        updatedAt: { toDate: () => new Date('2026-02-02T10:00:00.000Z') },
      });
      const result = await service.getFlag(FeatureFlag.COMMUNITY);
      expect(result.updatedAt).toBe('2026-02-02T10:00:00.000Z');
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags keyed for clients', async () => {
      mockCache.get.mockResolvedValue(undefined);
      docDataByDocumentId.set('community_settings', { isEnabled: true });
      docDataByDocumentId.set('kids_spots_settings', { isEnabled: false });
      docDataByDocumentId.set('christmas_markets_settings', { isEnabled: false });
      const result = await service.getAllFlags();
      expect(result.community).toMatchObject({ id: 'community_settings', isEnabled: true });
      expect(result.kidsSpots).toMatchObject({ id: 'kids_spots_settings', isEnabled: false });
      expect(result.christmasMarkets).toMatchObject({
        id: 'christmas_markets_settings',
        isEnabled: false,
      });
    });
  });

  describe('cache', () => {
    it('should serve from cache on hit without Firestore access', async () => {
      mockCache.get.mockResolvedValue({
        id: 'kids_spots_settings',
        isEnabled: true,
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      const result = await service.getFlag(FeatureFlag.KIDS_SPOTS);
      expect(result.isEnabled).toBe(true);
      expect(mockFirestore.collection).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should fill the cache on miss with a 15 minute TTL', async () => {
      mockCache.get.mockResolvedValue(undefined);
      docDataByDocumentId.set('community_settings', { isEnabled: false });
      await service.getFlag(FeatureFlag.COMMUNITY);
      expect(mockCache.set).toHaveBeenCalledWith(
        'feature-flags:community',
        expect.objectContaining({ id: 'community_settings' }),
        900000,
      );
    });

    it('should invalidate only the updated flag cache on update', async () => {
      docDataByDocumentId.set('community_settings', { isEnabled: true });
      await service.updateFlag(FeatureFlag.COMMUNITY, false, 'admin-1');
      expect(mockCache.del).toHaveBeenCalledTimes(1);
      expect(mockCache.del).toHaveBeenCalledWith('feature-flags:community');
    });
  });

  describe('updateFlag', () => {
    it('should persist the new value with updatedBy and timestamp', async () => {
      docDataByDocumentId.set('kids_spots_settings', {
        isEnabled: false,
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      const result = await service.updateFlag(FeatureFlag.KIDS_SPOTS, true, 'admin-1');
      expect(result.isEnabled).toBe(true);
      expect(result.updatedBy).toBe('admin-1');
      expect(result.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
      expect(docDataByDocumentId.get('kids_spots_settings')).toMatchObject({ isEnabled: true });
    });

    it('should keep the previous updatedBy when none is given', async () => {
      docDataByDocumentId.set('kids_spots_settings', {
        isEnabled: false,
        updatedBy: 'admin-old',
      });
      const result = await service.updateFlag(FeatureFlag.KIDS_SPOTS, true);
      expect(result.updatedBy).toBe('admin-old');
    });

    it('should create the document with the new value when missing', async () => {
      const result = await service.updateFlag(FeatureFlag.KIDS_SPOTS, true, 'admin-1');
      expect(result).toMatchObject({ id: 'kids_spots_settings', isEnabled: true });
    });

    it('should propagate Firestore errors', async () => {
      mockDoc.get.mockRejectedValue(new Error('firestore down'));
      await expect(service.updateFlag(FeatureFlag.COMMUNITY, false)).rejects.toThrow(
        'firestore down',
      );
    });
  });
});
