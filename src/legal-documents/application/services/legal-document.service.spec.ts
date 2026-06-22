import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { LegalDocumentService } from './legal-document.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { LegalDocument, LegalDocumentType } from '../../domain/entities/legal-document.entity';

describe('LegalDocumentService', () => {
  let service: LegalDocumentService;
  let mockDoc: {
    id: string;
    exists: boolean;
    get: jest.Mock;
    set: jest.Mock;
  };
  let mockQuery: {
    where: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    get: jest.Mock;
  };
  let mockCollection: {
    doc: jest.Mock;
    where: jest.Mock;
    get: jest.Mock;
  };
  let mockFirestore: { collection: jest.Mock };

  const mockDocument: LegalDocument = LegalDocument.create({
    type: LegalDocumentType.IMPRESSUM,
    content: '# Impressum\n\nTest content',
    createdBy: 'user123',
  });

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const documentToFirestoreData = (document: LegalDocument): Record<string, unknown> => ({
    type: document.type,
    content: document.content,
    version: document.version,
    createdAt: document.createdAt,
    createdBy: document.createdBy,
    isActive: document.isActive,
  });

  beforeEach(async () => {
    mockDoc = {
      id: mockDocument.id,
      exists: true,
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: mockDocument.id,
        data: () => documentToFirestoreData(mockDocument),
      }),
      set: jest.fn().mockResolvedValue(undefined),
    };
    mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: jest.fn().mockReturnValue(mockQuery),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    mockCacheManager.get.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalDocumentService,
        { provide: FirebaseService, useValue: { getFirestore: jest.fn().mockReturnValue(mockFirestore) } },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();
    service = module.get<LegalDocumentService>(LegalDocumentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new legal document with version 1 when no existing document', async () => {
      const type = LegalDocumentType.IMPRESSUM;
      const content = '# Impressum\n\nTest content';
      const createdBy = 'user123';
      mockQuery.get.mockResolvedValueOnce({ empty: true, docs: [] });
      const result = await service.create(type, content, createdBy);
      expect(result).toBeDefined();
      expect(result.type).toBe(type);
      expect(result.content).toBe(content);
      expect(result.createdBy).toBe(createdBy);
      expect(result.version).toBe(1);
      expect(mockDoc.set).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalled();
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
      mockQuery.get.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: existingDocument.id,
            data: () => documentToFirestoreData(existingDocument),
          },
        ],
      });
      const result = await service.create(type, content, createdBy);
      expect(result).toBeDefined();
      expect(result.version).toBe(2);
      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe('getLatestByType', () => {
    it('should return the latest legal document of a type', async () => {
      mockQuery.get.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: mockDocument.id,
            data: () => documentToFirestoreData(mockDocument),
          },
        ],
      });
      const result = await service.getLatestByType(LegalDocumentType.IMPRESSUM);
      expect(result).toBeDefined();
      expect(result.type).toBe(LegalDocumentType.IMPRESSUM);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return cached document on cache hit', async () => {
      mockCacheManager.get.mockResolvedValue(mockDocument);
      const result = await service.getLatestByType(LegalDocumentType.IMPRESSUM);
      expect(result).toBe(mockDocument);
      expect(mockQuery.get).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if no document found', async () => {
      mockQuery.get.mockResolvedValueOnce({ empty: true, docs: [] });
      await expect(service.getLatestByType(LegalDocumentType.IMPRESSUM)).rejects.toThrow(
        NotFoundException,
      );
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
      mockQuery.get.mockResolvedValueOnce({
        docs: documents.map(doc => ({
          id: doc.id,
          data: () => documentToFirestoreData(doc),
        })),
      });
      const result = await service.getAllByType(LegalDocumentType.IMPRESSUM);
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(LegalDocumentType.IMPRESSUM);
    });

    it('should return empty array if no documents found', async () => {
      mockQuery.get.mockResolvedValueOnce({ docs: [] });
      const result = await service.getAllByType(LegalDocumentType.IMPRESSUM);
      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('should return a legal document by id', async () => {
      const result = await service.getById(mockDocument.id);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockDocument.id);
      expect(mockCollection.doc).toHaveBeenCalledWith(mockDocument.id);
    });

    it('should throw NotFoundException if document not found', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });
      await expect(service.getById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
