import { Test, TestingModule } from '@nestjs/testing';
import { LegalDocumentsController } from './legal-documents.controller';
import { LegalDocumentService } from './application/services/legal-document.service';
import { LegalDocument, LegalDocumentType } from './domain/entities/legal-document.entity';
import { CreateLegalDocumentDto } from './application/dto/create-legal-document.dto';
import { NotFoundException } from '@nestjs/common';
import { RolesGuard } from '../core/guards/roles.guard';

describe('LegalDocumentsController', () => {
  let controller: LegalDocumentsController;
  let service: LegalDocumentService;

  const mockLegalDocumentService = {
    create: jest.fn(),
    getLatestByType: jest.fn(),
    getAllByType: jest.fn(),
    getById: jest.fn(),
  };

  const mockDocument: LegalDocument = LegalDocument.create({
    type: LegalDocumentType.IMPRESSUM,
    content: '# Impressum\n\nTest content',
    createdBy: 'user123',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalDocumentsController],
      providers: [
        {
          provide: LegalDocumentService,
          useValue: mockLegalDocumentService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<LegalDocumentsController>(LegalDocumentsController);
    service = module.get<LegalDocumentService>(LegalDocumentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new legal document', async () => {
      const createDto: CreateLegalDocumentDto = {
        type: LegalDocumentType.IMPRESSUM,
        content: '# Impressum\n\nTest content',
      };
      const userId = 'user123';

      mockLegalDocumentService.create.mockResolvedValue(mockDocument);

      const result = await controller.create(createDto, userId);

      expect(result).toBeDefined();
      expect(result.type).toBe(LegalDocumentType.IMPRESSUM);
      expect(result.content).toBe(createDto.content);
      expect(mockLegalDocumentService.create).toHaveBeenCalledWith(
        createDto.type,
        createDto.content,
        userId,
      );
    });
  });

  describe('getLatestByType', () => {
    it('should return the latest legal document of a type', async () => {
      mockLegalDocumentService.getLatestByType.mockResolvedValue(mockDocument);

      const result = await controller.getLatestByType(LegalDocumentType.IMPRESSUM);

      expect(result).toBeDefined();
      expect(result.type).toBe(LegalDocumentType.IMPRESSUM);
      expect(mockLegalDocumentService.getLatestByType).toHaveBeenCalledWith(LegalDocumentType.IMPRESSUM);
    });

    it('should throw NotFoundException if no document found', async () => {
      mockLegalDocumentService.getLatestByType.mockRejectedValue(
        new NotFoundException('No legal document found for type impressum'),
      );

      await expect(controller.getLatestByType(LegalDocumentType.IMPRESSUM)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockLegalDocumentService.getLatestByType).toHaveBeenCalledWith(LegalDocumentType.IMPRESSUM);
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

      mockLegalDocumentService.getAllByType.mockResolvedValue(documents);

      const result = await controller.getAllByType(LegalDocumentType.IMPRESSUM);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(LegalDocumentType.IMPRESSUM);
      expect(mockLegalDocumentService.getAllByType).toHaveBeenCalledWith(LegalDocumentType.IMPRESSUM);
    });
  });

  describe('getById', () => {
    it('should return a legal document by id', async () => {
      mockLegalDocumentService.getById.mockResolvedValue(mockDocument);

      const result = await controller.getById(mockDocument.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockDocument.id);
      expect(mockLegalDocumentService.getById).toHaveBeenCalledWith(mockDocument.id);
    });

    it('should throw NotFoundException if document not found', async () => {
      const nonExistentId = 'non-existent-id';
      mockLegalDocumentService.getById.mockRejectedValue(
        new NotFoundException(`Legal document with id ${nonExistentId} not found`),
      );

      await expect(controller.getById(nonExistentId)).rejects.toThrow(NotFoundException);
      expect(mockLegalDocumentService.getById).toHaveBeenCalledWith(nonExistentId);
    });
  });
});

