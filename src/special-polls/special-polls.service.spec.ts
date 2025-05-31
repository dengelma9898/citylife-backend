import { Test, TestingModule } from '@nestjs/testing';
import { SpecialPollsService } from './special-polls.service';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import {
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  SpecialPoll,
  SpecialPollStatus,
  SpecialPollResponse,
} from './interfaces/special-poll.interface';
import { CreateSpecialPollDto } from './dto/create-special-poll.dto';
import { UpdateSpecialPollStatusDto } from './dto/update-special-poll-status.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
}));

describe('SpecialPollsService', () => {
  let service: SpecialPollsService;
  let firebaseService: FirebaseService;
  let usersService: UsersService;

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
      orderBy: jest.fn().mockReturnThis(),
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

  const mockUsersService = {
    getById: jest.fn(),
  };

  const mockSpecialPoll: SpecialPoll = {
    id: 'poll1',
    title: 'Test Poll',
    responses: [],
    status: SpecialPollStatus.PENDING,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialPollsService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<SpecialPollsService>(SpecialPollsService);
    firebaseService = module.get<FirebaseService>(FirebaseService);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of special polls', async () => {
      const mockFirestore = createFirestoreMock(mockSpecialPoll);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('poll1');
      expect(result[0].title).toBe('Test Poll');
    });
  });

  describe('findOne', () => {
    it('should return a special poll by id', async () => {
      const mockFirestore = createFirestoreMock(mockSpecialPoll);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findOne('poll1');

      expect(result).toBeDefined();
      expect(result.id).toBe('poll1');
      expect(result.title).toBe('Test Poll');
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockFirestore = createFirestoreMock();
      const mockDoc = {
        exists: false,
        data: () => null,
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        new Error('Special poll not found'),
      );
    });
  });

  describe('create', () => {
    it('should create a new special poll', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const createDto: CreateSpecialPollDto = {
        title: 'New Poll',
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(createDto.title);
      expect(result.status).toBe(SpecialPollStatus.PENDING);
      expect(mockFirestore.collection().add).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update the status of a special poll', async () => {
      const mockFirestore = createFirestoreMock(mockSpecialPoll);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const updateStatusDto: UpdateSpecialPollStatusDto = {
        status: SpecialPollStatus.ACTIVE,
      };

      const result = await service.updateStatus('poll1', updateStatusDto);

      expect(result).toBeDefined();
      expect(mockFirestore.collection().doc().update).toHaveBeenCalledWith({
        status: updateStatusDto.status,
        updatedAt: expect.any(String),
      });
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockFirestore = createFirestoreMock();
      const mockDoc = {
        exists: false,
        data: () => null,
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const updateStatusDto: UpdateSpecialPollStatusDto = {
        status: SpecialPollStatus.ACTIVE,
      };

      await expect(service.updateStatus('nonexistent', updateStatusDto)).rejects.toThrow(
        new Error('Special poll not found'),
      );
    });
  });

  describe('addResponse', () => {
    it('should add a response to a special poll', async () => {
      const mockFirestore = createFirestoreMock({
        ...mockSpecialPoll,
        status: SpecialPollStatus.ACTIVE,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        name: 'Test User',
      });

      const result = await service.addResponse('poll1', 'user1', 'Test Response');

      expect(result).toBeDefined();
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if poll is not active', async () => {
      const mockFirestore = createFirestoreMock({
        ...mockSpecialPoll,
        status: SpecialPollStatus.CLOSED,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.addResponse('poll1', 'user1', 'Test Response')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      const mockFirestore = createFirestoreMock({
        ...mockSpecialPoll,
        status: SpecialPollStatus.ACTIVE,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getById.mockResolvedValue(null);

      await expect(service.addResponse('poll1', 'user1', 'Test Response')).rejects.toThrow(
        new Error('User not found'),
      );
    });
  });

  describe('updateResponses', () => {
    it('should update responses of a special poll', async () => {
      const mockFirestore = createFirestoreMock(mockSpecialPoll);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const responses: SpecialPollResponse[] = [
        {
          userId: 'user1',
          userName: 'Test User',
          response: 'Test Response',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      const result = await service.updateResponses('poll1', responses);

      expect(result).toBeDefined();
      expect(mockFirestore.collection().doc().update).toHaveBeenCalledWith({
        responses,
        updatedAt: expect.any(String),
      });
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockFirestore = createFirestoreMock();
      const mockDoc = {
        exists: false,
        data: () => null,
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.updateResponses('nonexistent', [])).rejects.toThrow(
        new Error('Special poll not found'),
      );
    });
  });

  describe('remove', () => {
    it('should remove a special poll', async () => {
      const mockFirestore = createFirestoreMock(mockSpecialPoll);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await service.remove('poll1');

      expect(mockFirestore.collection().doc().delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockFirestore = createFirestoreMock();
      const mockDoc = {
        exists: false,
        data: () => null,
      };
      mockFirestore.collection().doc().get.mockResolvedValue(mockDoc);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        new Error('Special poll not found'),
      );
    });
  });
});
