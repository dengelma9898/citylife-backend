import { Test, TestingModule } from '@nestjs/testing';
import { KeywordsController } from './keywords.controller';
import { KeywordsService } from './keywords.service';
import { Keyword } from './interfaces/keyword.interface';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';
import { NotFoundException } from '@nestjs/common';

describe('KeywordsController', () => {
  let controller: KeywordsController;
  let service: KeywordsService;

  const mockKeywordsService = {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };

  const mockKeyword: Keyword = {
    id: 'keyword1',
    name: 'Test Keyword',
    description: 'Test Description',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeywordsController],
      providers: [
        {
          provide: KeywordsService,
          useValue: mockKeywordsService
        }
      ],
    }).compile();

    controller = module.get<KeywordsController>(KeywordsController);
    service = module.get<KeywordsService>(KeywordsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all keywords', async () => {
      mockKeywordsService.getAll.mockResolvedValue([mockKeyword]);

      const result = await controller.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe(mockKeyword.name);
      expect(mockKeywordsService.getAll).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return a keyword by id', async () => {
      mockKeywordsService.getById.mockResolvedValue(mockKeyword);

      const result = await controller.getById('keyword1');

      expect(result).toBeDefined();
      expect(result.name).toBe(mockKeyword.name);
      expect(mockKeywordsService.getById).toHaveBeenCalledWith('keyword1');
    });

    it('should throw NotFoundException if keyword not found', async () => {
      mockKeywordsService.getById.mockResolvedValue(null);

      await expect(controller.getById('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new keyword', async () => {
      const createDto: CreateKeywordDto = {
        name: 'New Keyword',
        description: 'New Description'
      };

      mockKeywordsService.create.mockResolvedValue({
        ...mockKeyword,
        ...createDto
      });

      const result = await controller.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.description).toBe(createDto.description);
      expect(mockKeywordsService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('should update a keyword', async () => {
      const updateDto: UpdateKeywordDto = {
        name: 'Updated Keyword',
        description: 'Updated Description'
      };

      mockKeywordsService.update.mockResolvedValue({
        ...mockKeyword,
        ...updateDto
      });

      const result = await controller.update('keyword1', updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(mockKeywordsService.update).toHaveBeenCalledWith('keyword1', updateDto);
    });

    it('should throw NotFoundException if keyword not found', async () => {
      mockKeywordsService.update.mockRejectedValue(new NotFoundException('Keyword not found'));

      await expect(controller.update('nonexistent', { name: 'Updated' }))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a keyword', async () => {
      mockKeywordsService.delete.mockResolvedValue(undefined);

      await controller.delete('keyword1');

      expect(mockKeywordsService.delete).toHaveBeenCalledWith('keyword1');
    });

    it('should throw NotFoundException if keyword not found', async () => {
      mockKeywordsService.delete.mockRejectedValue(new NotFoundException('Keyword not found'));

      await expect(controller.delete('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });
}); 