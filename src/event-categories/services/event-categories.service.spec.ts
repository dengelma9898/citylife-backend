import { Test, TestingModule } from '@nestjs/testing';
import { EventCategoriesService } from './event-categories.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { NotFoundException } from '@nestjs/common';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn()
}));

describe('EventCategoriesService', () => {
  let service: EventCategoriesService;
  let firebaseService: FirebaseService;

  const mockFirebaseService = {
    getClientFirestore: jest.fn()
  };

  const mockFirestore = {
    collection: jest.fn(),
    doc: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventCategoriesService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService
        }
      ],
    }).compile();

    service = module.get<EventCategoriesService>(EventCategoriesService);
    firebaseService = module.get<FirebaseService>(FirebaseService);

    mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all event categories', async () => {
      const mockCategories = [
        {
          id: 'category1',
          name: 'Test Category 1',
          description: 'Description 1',
          colorCode: '#FF0000',
          iconName: 'icon1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const mockSnapshot = {
        docs: mockCategories.map(cat => ({
          id: cat.id,
          data: () => ({
            name: cat.name,
            description: cat.description,
            colorCode: cat.colorCode,
            iconName: cat.iconName,
            createdAt: cat.createdAt,
            updatedAt: cat.updatedAt
          })
        }))
      };

      (collection as jest.Mock).mockReturnValue('mockCollection');
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('category1');
      expect(result[0].name).toBe('Test Category 1');
      expect(collection).toHaveBeenCalledWith(mockFirestore, 'event_categories');
      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an event category by id', async () => {
      const mockCategory = {
        id: 'category1',
        name: 'Test Category 1',
        description: 'Description 1',
        colorCode: '#FF0000',
        iconName: 'icon1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const mockDocSnap = {
        exists: () => true,
        id: mockCategory.id,
        data: () => ({
          name: mockCategory.name,
          description: mockCategory.description,
          colorCode: mockCategory.colorCode,
          iconName: mockCategory.iconName,
          createdAt: mockCategory.createdAt,
          updatedAt: mockCategory.updatedAt
        })
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const result = await service.findOne('category1');

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.id).toBe('category1');
        expect(result.name).toBe('Test Category 1');
      }
      expect(doc).toHaveBeenCalledWith(mockFirestore, 'event_categories', 'category1');
      expect(getDoc).toHaveBeenCalled();
    });

    it('should return null if category not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new event category', async () => {
      const createDto = {
        name: 'New Category',
        description: 'New Description',
        colorCode: '#00FF00',
        iconName: 'newIcon'
      };

      const mockDocRef = {
        id: 'newCategoryId'
      };

      (collection as jest.Mock).mockReturnValue('mockCollection');
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('newCategoryId');
      expect(result.name).toBe(createDto.name);
      expect(result.description).toBe(createDto.description);
      expect(collection).toHaveBeenCalledWith(mockFirestore, 'event_categories');
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an event category', async () => {
      const updateDto = {
        name: 'Updated Category',
        description: 'Updated Description'
      };

      const mockDocSnap = {
        exists: () => true,
        id: 'category1',
        data: () => ({
          name: 'Old Category',
          description: 'Old Description',
          colorCode: '#FF0000',
          iconName: 'icon1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      };

      const mockUpdatedDocSnap = {
        id: 'category1',
        data: () => ({
          ...mockDocSnap.data(),
          ...updateDto,
          updatedAt: new Date().toISOString()
        })
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock)
        .mockResolvedValueOnce(mockDocSnap)
        .mockResolvedValueOnce(mockUpdatedDocSnap);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.update('category1', updateDto);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.id).toBe('category1');
        expect(result.name).toBe(updateDto.name);
        expect(result.description).toBe(updateDto.description);
      }
      expect(doc).toHaveBeenCalledWith(mockFirestore, 'event_categories', 'category1');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      await expect(service.update('nonexistent', { name: 'Updated' }))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an event category', async () => {
      const mockDocSnap = {
        exists: () => true
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await service.remove('category1');

      expect(doc).toHaveBeenCalledWith(mockFirestore, 'event_categories', 'category1');
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      await expect(service.remove('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });
}); 