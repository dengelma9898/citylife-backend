import { Test, TestingModule } from '@nestjs/testing';
import { KeywordsService } from './keywords.service';
import { FirebaseService } from '../firebase/firebase.service';
import { Keyword } from './interfaces/keyword.interface';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';
import { NotFoundException } from '@nestjs/common';
import { getFirestore, getDocs, getDoc, addDoc, updateDoc, deleteDoc, collection, doc } from 'firebase/firestore';

jest.mock('firebase/firestore');

describe('KeywordsService', () => {
  let service: KeywordsService;
  let firebaseService: FirebaseService;

  const mockFirebaseService = {
    getClientFirestore: jest.fn()
  };

  const mockKeyword: Keyword = {
    id: 'keyword1',
    name: 'Test Keyword',
    description: 'Test Description',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  const mockCollection = jest.fn();
  const mockDoc = jest.fn();
  const mockGetDocs = jest.fn();
  const mockGetDoc = jest.fn();
  const mockAddDoc = jest.fn();
  const mockUpdateDoc = jest.fn();
  const mockDeleteDoc = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeywordsService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService
        }
      ],
    }).compile();

    service = module.get<KeywordsService>(KeywordsService);
    firebaseService = module.get<FirebaseService>(FirebaseService);

    // Mock Firebase functions
    (getFirestore as jest.Mock).mockReturnValue({
      collection: mockCollection,
      doc: mockDoc
    });

    mockCollection.mockReturnValue({});
    mockDoc.mockReturnValue({});
    mockFirebaseService.getClientFirestore.mockReturnValue({
      collection: mockCollection,
      doc: mockDoc
    });

    // Mock Firestore functions
    (collection as jest.Mock).mockImplementation(mockCollection);
    (doc as jest.Mock).mockImplementation(mockDoc);
    (getDocs as jest.Mock).mockImplementation(mockGetDocs);
    (getDoc as jest.Mock).mockImplementation(mockGetDoc);
    (addDoc as jest.Mock).mockImplementation(mockAddDoc);
    (updateDoc as jest.Mock).mockImplementation(mockUpdateDoc);
    (deleteDoc as jest.Mock).mockImplementation(mockDeleteDoc);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all keywords', async () => {
      const mockSnapshot = {
        docs: [{
          id: mockKeyword.id,
          data: () => ({
            name: mockKeyword.name,
            description: mockKeyword.description,
            createdAt: mockKeyword.createdAt,
            updatedAt: mockKeyword.updatedAt
          })
        }]
      };

      mockGetDocs.mockResolvedValue(mockSnapshot);

      const result = await service.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockKeyword.id);
      expect(result[0].name).toBe(mockKeyword.name);
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'keywords');
      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return a keyword by id', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: mockKeyword.id,
        data: () => ({
          name: mockKeyword.name,
          description: mockKeyword.description,
          createdAt: mockKeyword.createdAt,
          updatedAt: mockKeyword.updatedAt
        })
      };

      mockGetDoc.mockResolvedValue(mockDocSnap);

      const result = await service.getById('keyword1');

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockKeyword.id);
      expect(result?.name).toBe(mockKeyword.name);
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'keywords', 'keyword1');
      expect(getDoc).toHaveBeenCalled();
    });

    it('should return null if keyword not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      mockGetDoc.mockResolvedValue(mockDocSnap);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new keyword', async () => {
      const createDto: CreateKeywordDto = {
        name: 'New Keyword',
        description: 'New Description'
      };

      const mockDocRef = {
        id: 'new-keyword-id'
      };

      mockAddDoc.mockResolvedValue(mockDocRef);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockDocRef.id);
      expect(result.name).toBe(createDto.name);
      expect(result.description).toBe(createDto.description);
      expect(collection).toHaveBeenCalledWith(expect.anything(), 'keywords');
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a keyword', async () => {
      const updateDto: UpdateKeywordDto = {
        name: 'Updated Keyword',
        description: 'Updated Description'
      };

      const mockDocSnap = {
        exists: () => true,
        id: mockKeyword.id,
        data: () => ({
          name: mockKeyword.name,
          description: mockKeyword.description,
          createdAt: mockKeyword.createdAt,
          updatedAt: mockKeyword.updatedAt
        })
      };

      const mockUpdatedDocSnap = {
        id: mockKeyword.id,
        data: () => ({
          name: updateDto.name,
          description: updateDto.description,
          createdAt: mockKeyword.createdAt,
          updatedAt: expect.any(String)
        })
      };

      mockGetDoc.mockResolvedValueOnce(mockDocSnap).mockResolvedValueOnce(mockUpdatedDocSnap);
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await service.update('keyword1', updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockKeyword.id);
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'keywords', 'keyword1');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if keyword not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      mockGetDoc.mockResolvedValue(mockDocSnap);

      await expect(service.update('nonexistent', { name: 'Updated' }))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a keyword', async () => {
      const mockDocSnap = {
        exists: () => true
      };

      mockGetDoc.mockResolvedValue(mockDocSnap);
      mockDeleteDoc.mockResolvedValue(undefined);

      await service.delete('keyword1');

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'keywords', 'keyword1');
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if keyword not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      mockGetDoc.mockResolvedValue(mockDocSnap);

      await expect(service.delete('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });
}); 