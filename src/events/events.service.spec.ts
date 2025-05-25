import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { FirebaseService } from '../firebase/firebase.service';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { NotFoundException } from '@nestjs/common';
import { Event, DailyTimeSlot } from './interfaces/event.interface';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  runTransaction: jest.fn()
}));

describe('EventsService', () => {
  let service: EventsService;
  let firebaseService: FirebaseService;

  const mockFirebaseService = {
    getClientFirestore: jest.fn()
  };

  const mockFirestore = {
    collection: jest.fn(),
    doc: jest.fn()
  };

  const mockEvent: Event = {
    id: 'event1',
    title: 'Test Event',
    description: 'Test Description',
    location: {
      address: 'Test Address',
      latitude: 52.520008,
      longitude: 13.404954
    },
    imageUrls: [],
    titleImageUrl: '',
    ticketsNeeded: false,
    price: 0,
    categoryId: 'category1',
    contactEmail: 'test@example.com',
    contactPhone: '',
    website: '',
    socialMedia: {
      instagram: '',
      facebook: '',
      tiktok: ''
    },
    isPromoted: false,
    dailyTimeSlots: [
      {
        date: '2024-03-20',
        from: '10:00',
        to: '18:00'
      }
    ],
    createdAt: '2024-03-20T10:00:00.000Z',
    updatedAt: '2024-03-20T10:00:00.000Z'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService
        }
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    firebaseService = module.get<FirebaseService>(FirebaseService);

    mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all events', async () => {
      const mockSnapshot = {
        docs: [{
          id: mockEvent.id,
          data: () => ({
            ...mockEvent,
          })
        }]
      };

      (collection as jest.Mock).mockReturnValue('mockCollection');
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await service.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockEvent.id);
      expect(result[0].title).toBe(mockEvent.title);
      expect(collection).toHaveBeenCalledWith(mockFirestore, 'events');
      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return an event by id', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: mockEvent.id,
        data: () => ({
          ...mockEvent,
        })
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const result = await service.getById('event1');

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.id).toBe(mockEvent.id);
        expect(result.title).toBe(mockEvent.title);
      }
      expect(doc).toHaveBeenCalledWith(mockFirestore, 'events', 'event1');
      expect(getDoc).toHaveBeenCalled();
    });

    it('should return null if event not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new event', async () => {
      const createDto = {
        title: 'New Event',
        description: 'New Description',
        address: 'New Address',
        latitude: 52.520008,
        longitude: 13.404954,
        categoryId: 'category1',
        dailyTimeSlots: [
          {
            date: '2024-03-20',
            from: '10:00',
            to: '18:00'
          }
        ]
      };

      const mockDocRef = {
        id: 'newEventId'
      };

      (collection as jest.Mock).mockReturnValue('mockCollection');
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('newEventId');
      expect(result.title).toBe(createDto.title);
      expect(result.description).toBe(createDto.description);
      expect(collection).toHaveBeenCalledWith(mockFirestore, 'events');
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an event', async () => {
      const updateDto = {
        title: 'Updated Event',
        description: 'Updated Description'
      };

      const mockDocSnap = {
        exists: () => true,
        id: mockEvent.id,
        data: () => ({
          ...mockEvent,
        })
      };

      const mockUpdatedDocSnap = {
        exists: () => true,
        id: mockEvent.id,
        data: () => ({
          ...mockEvent,
          ...updateDto,
        })
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock)
        .mockResolvedValueOnce(mockDocSnap)
        .mockResolvedValueOnce(mockUpdatedDocSnap);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await service.update('event1', updateDto);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.id).toBe(mockEvent.id);
        expect(result.title).toBe(updateDto.title);
        expect(result.description).toBe(updateDto.description);
      }
      expect(doc).toHaveBeenCalledWith(mockFirestore, 'events', 'event1');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if event not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      await expect(service.update('nonexistent', { title: 'Updated' }))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an event', async () => {
      const mockDocSnap = {
        exists: () => true
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await service.delete('event1');

      expect(doc).toHaveBeenCalledWith(mockFirestore, 'events', 'event1');
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if event not found', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      await expect(service.delete('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('updateFavoriteCount', () => {
    it('should increment favorite count', async () => {
      const mockEventDoc = {
        exists: () => true,
        data: () => ({
          favoriteCount: 5
        })
      };

      const mockTransaction = {
        get: jest.fn().mockResolvedValue(mockEventDoc),
        update: jest.fn()
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (runTransaction as jest.Mock).mockImplementation(async (firestore, callback) => {
        await callback(mockTransaction);
      });

      await service.updateFavoriteCount('event1', true);

      expect(doc).toHaveBeenCalledWith(mockFirestore, 'events', 'event1');
      expect(runTransaction).toHaveBeenCalled();
      expect(mockTransaction.update).toHaveBeenCalled();
    });

    it('should decrement favorite count', async () => {
      const mockEventDoc = {
        exists: () => true,
        data: () => ({
          favoriteCount: 5
        })
      };

      const mockTransaction = {
        get: jest.fn().mockResolvedValue(mockEventDoc),
        update: jest.fn()
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (runTransaction as jest.Mock).mockImplementation(async (firestore, callback) => {
        await callback(mockTransaction);
      });

      await service.updateFavoriteCount('event1', false);

      expect(doc).toHaveBeenCalledWith(mockFirestore, 'events', 'event1');
      expect(runTransaction).toHaveBeenCalled();
      expect(mockTransaction.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if event not found', async () => {
      const mockEventDoc = {
        exists: () => false
      };

      const mockTransaction = {
        get: jest.fn().mockResolvedValue(mockEventDoc),
        update: jest.fn()
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (runTransaction as jest.Mock).mockImplementation(async (firestore, callback) => {
        await callback(mockTransaction);
      });

      await expect(service.updateFavoriteCount('nonexistent', true))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('getByIds', () => {
    it('should return events by ids', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: mockEvent.id,
        data: () => ({
          ...mockEvent,
        })
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const result = await service.getByIds(['event1']);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockEvent.id);
      expect(result[0].title).toBe(mockEvent.title);
    });

    it('should return empty array if no ids provided', async () => {
      const result = await service.getByIds([]);

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });

    it('should filter out non-existent events', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (doc as jest.Mock).mockReturnValue('mockDoc');
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const result = await service.getByIds(['nonexistent']);

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
    });
  });
}); 