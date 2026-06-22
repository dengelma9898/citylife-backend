import { Test, TestingModule } from '@nestjs/testing';
import { SpotKeywordsService } from './spot-keywords.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { SpotKeyword } from '../../domain/entities/spot-keyword.entity';

describe('SpotKeywordsService', () => {
  let service: SpotKeywordsService;
  let findByNameLowerSpy: jest.SpyInstance;
  let suggestByNameLowerPrefixSpy: jest.SpyInstance;
  let createKeywordSpy: jest.SpyInstance;
  let mockDoc: { get: jest.Mock };
  let mockCollection: { doc: jest.Mock };
  let mockFirestore: { collection: jest.Mock };

  const existing = SpotKeyword.fromProps({
    id: 'kw-1',
    name: 'Biergarten',
    nameLower: 'biergarten',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  beforeEach(async () => {
    mockDoc = {
      get: jest.fn(),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
    };
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpotKeywordsService,
        { provide: FirebaseService, useValue: { getFirestore: jest.fn().mockReturnValue(mockFirestore) } },
      ],
    }).compile();
    service = module.get<SpotKeywordsService>(SpotKeywordsService);
    findByNameLowerSpy = jest.spyOn(service as any, 'findByNameLower');
    suggestByNameLowerPrefixSpy = jest.spyOn(service as any, 'suggestByNameLowerPrefix');
    createKeywordSpy = jest.spyOn(service as any, 'createKeyword');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('suggestByPrefix', () => {
    it('should clamp limit', async () => {
      suggestByNameLowerPrefixSpy.mockResolvedValue([]);
      await service.suggestByPrefix('a', 500);
      expect(suggestByNameLowerPrefixSpy).toHaveBeenCalledWith('a', 50);
    });
  });

  describe('findById', () => {
    it('should return keyword when document exists', async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'kw-1',
        data: () => existing.toJSON(),
      });
      const result = await service.findById('kw-1');
      expect(result?.id).toBe('kw-1');
      expect(mockCollection.doc).toHaveBeenCalledWith('kw-1');
    });

    it('should return null when not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      const result = await service.findById('none');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should return existing when nameLower already exists', async () => {
      findByNameLowerSpy.mockResolvedValue(existing);
      const result = await service.create({ name: 'Biergarten' });
      expect(result.id).toBe('kw-1');
      expect(createKeywordSpy).not.toHaveBeenCalled();
    });

    it('should create when new', async () => {
      findByNameLowerSpy.mockResolvedValue(null);
      createKeywordSpy.mockImplementation(k =>
        Promise.resolve(SpotKeyword.fromProps({ ...k.toJSON(), id: 'new-id' })),
      );
      const result = await service.create({ name: 'Neu' });
      expect(createKeywordSpy).toHaveBeenCalled();
      expect(result.id).toBe('new-id');
    });
  });

  describe('resolveNewKeywordNamesToIds', () => {
    it('should create missing and dedupe', async () => {
      findByNameLowerSpy.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
      createKeywordSpy.mockImplementation(k =>
        Promise.resolve(SpotKeyword.fromProps({ ...k.toJSON(), id: 'new-kw' })),
      );
      const ids = await service.resolveNewKeywordNamesToIds(['  Neu ', 'Biergarten']);
      expect(ids).toContain('new-kw');
      expect(ids).toContain('kw-1');
      expect(ids.length).toBe(2);
    });
  });
});
