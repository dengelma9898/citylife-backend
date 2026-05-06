import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SpotKeywordsController } from './spot-keywords.controller';
import { SpotKeywordsService } from '../services/spot-keywords.service';
import { SpotKeyword } from '../../domain/entities/spot-keyword.entity';
import { RolesGuard } from '../../../core/guards/roles.guard';

describe('SpotKeywordsController', () => {
  let controller: SpotKeywordsController;
  let mockSpotKeywordsService: Record<string, jest.Mock>;

  const mockKeyword = SpotKeyword.fromProps({
    id: 'kw-1',
    name: 'Biergarten',
    nameLower: 'biergarten',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  beforeEach(async () => {
    mockSpotKeywordsService = {
      suggestByPrefix: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      resolveNewKeywordNamesToIds: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpotKeywordsController],
      providers: [{ provide: SpotKeywordsService, useValue: mockSpotKeywordsService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<SpotKeywordsController>(SpotKeywordsController);
  });

  describe('suggest', () => {
    it('should return suggestions', async () => {
      mockSpotKeywordsService.suggestByPrefix.mockResolvedValue([mockKeyword]);
      const result = await controller.suggest('bier', '10');
      expect(result).toHaveLength(1);
      expect(mockSpotKeywordsService.suggestByPrefix).toHaveBeenCalledWith('bier', 10);
    });

    it('should throw BadRequestException when q is missing', async () => {
      await expect(controller.suggest('', undefined)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when limit is not a number', async () => {
      await expect(controller.suggest('a', 'x')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getById', () => {
    it('should return keyword when found', async () => {
      mockSpotKeywordsService.findById.mockResolvedValue(mockKeyword);
      const result = await controller.getById('kw-1');
      expect(result).toEqual(mockKeyword);
      expect(mockSpotKeywordsService.findById).toHaveBeenCalledWith('kw-1');
    });

    it('should throw NotFoundException when missing', async () => {
      mockSpotKeywordsService.findById.mockResolvedValue(null);
      await expect(controller.getById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create keyword', async () => {
      mockSpotKeywordsService.create.mockResolvedValue(mockKeyword);
      const result = await controller.create({ name: 'Biergarten' });
      expect(result.id).toBe('kw-1');
    });
  });
});
