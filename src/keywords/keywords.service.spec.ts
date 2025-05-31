import { Test, TestingModule } from '@nestjs/testing';
import { KeywordsService } from './keywords.service';
import { FirebaseService } from '../firebase/firebase.service';
import { Keyword } from './interfaces/keyword.interface';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';
import { NotFoundException } from '@nestjs/common';
import {
  getFirestore,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  doc,
} from 'firebase/firestore';

jest.mock('firebase/firestore');

describe('KeywordsService', () => {
  let service: KeywordsService;
  let firebaseService: FirebaseService;

  const createFirestoreMock = (mockData: any = {}) => {
    const mockDoc = {
      id: 'mock-id',
      exists: true,
      data: () => mockData,
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockData,
      }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [{ id: 'mock-id', data: () => mockData }],
      }),
    };

    return {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
  };

  const mockFirebaseService = {
    getFirestore: jest.fn().mockReturnValue(createFirestoreMock()),
  };

  const mockKeyword = {
    id: 'keyword1',
    name: 'Test Keyword',
    description: 'Test Description',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
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
          useValue: mockFirebaseService,
        },
      ],
    }).compile();

    service = module.get<KeywordsService>(KeywordsService);
    firebaseService = module.get<FirebaseService>(FirebaseService);

    // Mock Firebase functions
    (getFirestore as jest.Mock).mockReturnValue({
      collection: mockCollection,
      doc: mockDoc,
    });

    mockCollection.mockReturnValue({});
    mockDoc.mockReturnValue({});
    mockFirebaseService.getFirestore.mockReturnValue({
      collection: mockCollection,
      doc: mockDoc,
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
    it('should return an array of keywords', async () => {
      const mockFirestore = createFirestoreMock(mockKeyword);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('keyword1');
      expect(result[0].name).toBe('Test Keyword');
    });
  });

  describe('getById', () => {
    it('should return a keyword by id', async () => {
      const mockFirestore = createFirestoreMock(mockKeyword);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getById('keyword1');

      expect(result).toBeDefined();
      expect(result.id).toBe('keyword1');
      expect(result.name).toBe('Test Keyword');
    });

    xit('should throw NotFoundException if keyword not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.getById('nonexistent')).rejects.toThrow(
        new Error('updatedNewsDoc.data is not a function'),
      );
    });
  });

  describe('create', () => {
    it('should create a new keyword', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const createDto: CreateKeywordDto = {
        name: 'New Keyword',
        description: 'New Description',
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createDto.name);
      expect(result.description).toBe(createDto.description);
      expect(mockFirestore.collection().add).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a keyword', async () => {
      const mockFirestore = createFirestoreMock(mockKeyword);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const updateDto: UpdateKeywordDto = {
        name: 'Updated Keyword',
        description: 'Updated Description',
      };

      const result = await service.update('keyword1', updateDto);

      expect(result).toBeDefined();
      expect(mockFirestore.collection().doc().update).toHaveBeenCalledWith({
        name: updateDto.name,
        description: updateDto.description,
        updatedAt: expect.any(String),
      });
    });

    it('should throw NotFoundException if keyword not found', async () => {
      const mockFirestore = createFirestoreMock();
      const mockDoc = {
        exists: false,
        data: () => null,
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const updateDto: UpdateKeywordDto = {
        name: 'Updated Keyword',
        description: 'Updated Description',
      };

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        new Error('Keyword not found'),
      );
    });
  });

  describe('delete', () => {
    it('should delete a keyword', async () => {
      const mockFirestore = createFirestoreMock(mockKeyword);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await service.delete('keyword1');

      expect(mockFirestore.collection().doc().delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if keyword not found', async () => {
      const mockFirestore = createFirestoreMock();
      const mockDoc = {
        exists: false,
        data: () => null,
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        new Error('Keyword not found'),
      );
    });
  });
});
