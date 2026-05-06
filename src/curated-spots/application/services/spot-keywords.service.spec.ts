import { Test, TestingModule } from '@nestjs/testing';
import { SpotKeywordsService } from './spot-keywords.service';
import { SPOT_KEYWORD_REPOSITORY } from '../../domain/repositories/spot-keyword.repository';
import { SpotKeyword } from '../../domain/entities/spot-keyword.entity';

describe('SpotKeywordsService', () => {
  let service: SpotKeywordsService;
  let mockRepository: Record<string, jest.Mock>;

  const existing = SpotKeyword.fromProps({
    id: 'kw-1',
    name: 'Biergarten',
    nameLower: 'biergarten',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findByNameLower: jest.fn(),
      suggestByNameLowerPrefix: jest.fn(),
      create: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpotKeywordsService,
        { provide: SPOT_KEYWORD_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();
    service = module.get<SpotKeywordsService>(SpotKeywordsService);
  });

  describe('suggestByPrefix', () => {
    it('should clamp limit', async () => {
      mockRepository.suggestByNameLowerPrefix.mockResolvedValue([]);
      await service.suggestByPrefix('a', 500);
      expect(mockRepository.suggestByNameLowerPrefix).toHaveBeenCalledWith('a', 50);
    });
  });

  describe('findById', () => {
    it('should delegate to repository', async () => {
      mockRepository.findById.mockResolvedValue(existing);
      const result = await service.findById('kw-1');
      expect(result).toEqual(existing);
      expect(mockRepository.findById).toHaveBeenCalledWith('kw-1');
    });

    it('should return null when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      const result = await service.findById('none');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should return existing when nameLower already exists', async () => {
      mockRepository.findByNameLower.mockResolvedValue(existing);
      const result = await service.create({ name: 'Biergarten' });
      expect(result.id).toBe('kw-1');
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should create when new', async () => {
      mockRepository.findByNameLower.mockResolvedValue(null);
      mockRepository.create.mockImplementation(k => Promise.resolve(SpotKeyword.fromProps({ ...k.toJSON(), id: 'new-id' })));
      const result = await service.create({ name: 'Neu' });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('new-id');
    });
  });

  describe('resolveNewKeywordNamesToIds', () => {
    it('should create missing and dedupe', async () => {
      mockRepository.findByNameLower
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing);
      mockRepository.create.mockImplementation(k =>
        Promise.resolve(SpotKeyword.fromProps({ ...k.toJSON(), id: 'new-kw' })),
      );
      const ids = await service.resolveNewKeywordNamesToIds(['  Neu ', 'Biergarten']);
      expect(ids).toContain('new-kw');
      expect(ids).toContain('kw-1');
      expect(ids.length).toBe(2);
    });
  });
});
