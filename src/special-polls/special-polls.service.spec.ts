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

  const mockFirebaseService = {
    getClientFirestore: jest.fn().mockReturnValue({}),
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
      const mockSnapshot = {
        docs: [{ id: 'poll1', data: () => ({ ...mockSpecialPoll }) }],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('poll1');
      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a special poll by id', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'poll1',
        data: () => ({ ...mockSpecialPoll }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const result = await service.findOne('poll1');

      expect(result).toBeDefined();
      expect(result.id).toBe('poll1');
      expect(getDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockDoc = {
        exists: () => false,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new special poll', async () => {
      const createDto: CreateSpecialPollDto = {
        title: 'New Poll',
      };

      (addDoc as jest.Mock).mockResolvedValue({ id: 'poll1' });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(createDto.title);
      expect(result.status).toBe(SpecialPollStatus.PENDING);
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update the status of a special poll', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'poll1',
        data: () => ({ ...mockSpecialPoll }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const updateStatusDto: UpdateSpecialPollStatusDto = {
        status: SpecialPollStatus.ACTIVE,
      };

      const result = await service.updateStatus('poll1', updateStatusDto);

      expect(result).toBeDefined();
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockDoc = {
        exists: () => false,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const updateStatusDto: UpdateSpecialPollStatusDto = {
        status: SpecialPollStatus.ACTIVE,
      };

      await expect(service.updateStatus('nonexistent', updateStatusDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addResponse', () => {
    it('should add a response to a special poll', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'poll1',
        data: () => ({ ...mockSpecialPoll, status: SpecialPollStatus.ACTIVE }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        name: 'Test User',
      });

      const result = await service.addResponse('poll1', 'user1', 'Test Response');

      expect(result).toBeDefined();
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw BadRequestException if poll is not active', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'poll1',
        data: () => ({ ...mockSpecialPoll, status: SpecialPollStatus.CLOSED }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      await expect(service.addResponse('poll1', 'user1', 'Test Response')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'poll1',
        data: () => ({ ...mockSpecialPoll, status: SpecialPollStatus.ACTIVE }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      mockUsersService.getById.mockResolvedValue(null);

      await expect(service.addResponse('poll1', 'user1', 'Test Response')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateResponses', () => {
    it('should update responses of a special poll', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'poll1',
        data: () => ({ ...mockSpecialPoll }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

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
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockDoc = {
        exists: () => false,
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      await expect(service.updateResponses('nonexistent', [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a special poll', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'poll1',
        data: () => ({ ...mockSpecialPoll }),
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await service.remove('poll1');

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockDoc = {
        exists: () => false,
        id: 'nonexistent',
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
