import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LegalDocumentService } from './legal-document.service';
import { LegalDocumentRepository, LEGAL_DOCUMENT_REPOSITORY } from '../../domain/repositories/legal-document.repository';
import { LegalDocument, LegalDocumentType } from '../../domain/entities/legal-document.entity';

describe('LegalDocumentService', () => {
  let service: LegalDocumentService;
  let repository: LegalDocumentRepository;

  const mockRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findByType: jest.fn(),
    findLatestByType: jest.fn(),
    update: jest.fn(),
  };

  const mockDocument: LegalDocument = LegalDocument.create({
    type: LegalDocumentType.IMPRESSUM,
    content: '# Impressum\n\nTest content',
    createdBy: 'user123',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalDocumentService,
        {
          provide: LEGAL_DOCUMENT_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<LegalDocumentService>(LegalDocumentService);
    repository = module.get<LegalDocumentRepository>(LEGAL_DOCUMENT_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new legal document with version 1 when no existing document', async () => {
      const type = LegalDocumentType.IMPRESSUM;
      const content = '# Impressum\n\nTest content';
      const createdBy = 'user123';

      mockRepository.findLatestByType.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(mockDocument);

      const result = await service.create(type, content, createdBy);

      expect(result).toBeDefined();
      expect(result.type).toBe(type);
      expect(result.content).toBe(content);
      expect(result.createdBy).toBe(createdBy);
      expect(mockRepository.findLatestByType).toHaveBeenCalledWith(type);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should create a new legal document with incremented version when existing document exists', async () => {
      const type = LegalDocumentType.IMPRESSUM;
      const content = '# Impressum\n\nUpdated content';
      const createdBy = 'user456';
      const existingDocument = LegalDocument.create({
        type,
        content: '# Impressum\n\nOld content',
        createdBy: 'user123',
      });

      mockRepository.findLatestByType.mockResolvedValue(existingDocument);
      const newDocument = LegalDocument.createWithVersion({
        type,
        content,
        createdBy,
        version: 2,
      });
      mockRepository.save.mockResolvedValue(newDocument);

      const result = await service.create(type, content, createdBy);

      expect(result).toBeDefined();
      expect(result.version).toBe(2);
      expect(mockRepository.findLatestByType).toHaveBeenCalledWith(type);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('getLatestByType', () => {
    it('should return the latest legal document of a type', async () => {
      mockRepository.findLatestByType.mockResolvedValue(mockDocument);

      const result = await service.getLatestByType(LegalDocumentType.IMPRESSUM);

      expect(result).toBeDefined();
      expect(result.type).toBe(LegalDocumentType.IMPRESSUM);
      expect(mockRepository.findLatestByType).toHaveBeenCalledWith(LegalDocumentType.IMPRESSUM);
    });

    it('should throw NotFoundException if no document found', async () => {
      mockRepository.findLatestByType.mockResolvedValue(null);

      await expect(service.getLatestByType(LegalDocumentType.IMPRESSUM)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepository.findLatestByType).toHaveBeenCalledWith(LegalDocumentType.IMPRESSUM);
    });
  });

  describe('getAllByType', () => {
    it('should return all legal documents of a type', async () => {
      const documents = [
        mockDocument,
        LegalDocument.create({
          type: LegalDocumentType.IMPRESSUM,
          content: '# Impressum\n\nUpdated content',
          createdBy: 'user456',
        }),
      ];

      mockRepository.findByType.mockResolvedValue(documents);

      const result = await service.getAllByType(LegalDocumentType.IMPRESSUM);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(LegalDocumentType.IMPRESSUM);
      expect(mockRepository.findByType).toHaveBeenCalledWith(LegalDocumentType.IMPRESSUM);
    });

    it('should return empty array if no documents found', async () => {
      mockRepository.findByType.mockResolvedValue([]);

      const result = await service.getAllByType(LegalDocumentType.IMPRESSUM);

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(mockRepository.findByType).toHaveBeenCalledWith(LegalDocumentType.IMPRESSUM);
    });
  });

  describe('getById', () => {
    it('should return a legal document by id', async () => {
      mockRepository.findById.mockResolvedValue(mockDocument);

      const result = await service.getById(mockDocument.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockDocument.id);
      expect(mockRepository.findById).toHaveBeenCalledWith(mockDocument.id);
    });

    it('should throw NotFoundException if document not found', async () => {
      const nonExistentId = 'non-existent-id';
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getById(nonExistentId)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findById).toHaveBeenCalledWith(nonExistentId);
    });
  });
});

