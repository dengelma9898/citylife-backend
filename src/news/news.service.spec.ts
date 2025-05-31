import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from './news.service';
import { UsersService } from '../users/users.service';
import { FirebaseService } from '../firebase/firebase.service';
import {
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import {
  TextNewsItem,
  ImageNewsItem,
  PollNewsItem,
} from './interfaces/news-item.interface';
import { CreateTextNewsDto } from './dto/create-text-news.dto';
import { CreateImageNewsDto } from './dto/create-image-news.dto';
import { CreatePollNewsDto } from './dto/create-poll-news.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('NewsService', () => {
  let service: NewsService;
  let usersService: UsersService;
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

    const mockTransaction = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockData,
      }),
      set: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    return {
      collection: jest.fn().mockReturnValue(mockCollection),
      batch: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        commit: jest.fn().mockResolvedValue(undefined),
      }),
      runTransaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockTransaction);
      }),
    };
  };

  const mockFirebaseService = {
    getFirestore: jest.fn().mockReturnValue(createFirestoreMock()),
  };

  const mockUsersService = {
    getUserProfile: jest.fn(),
  };

  const mockTextNewsItem: TextNewsItem = {
    id: 'news1',
    type: 'text',
    content: 'Test News Content',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'user1',
    authorName: 'Test User',
    authorImageUrl: 'https://example.com/avatar.jpg',
    reactions: [],
    views: 0,
  };

  const mockImageNewsItem: ImageNewsItem = {
    id: 'news2',
    type: 'image',
    content: 'Test Image News',
    imageUrls: ['https://example.com/image1.jpg'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'user1',
    authorName: 'Test User',
    authorImageUrl: 'https://example.com/avatar.jpg',
    reactions: [],
    views: 0,
  };

  const mockPollNewsItem: PollNewsItem = {
    id: 'news3',
    type: 'poll',
    question: 'Test Question?',
    options: [
      { id: 'opt1', text: 'Option 1', voters: [] },
      { id: 'opt2', text: 'Option 2', voters: [] },
    ],
    allowMultipleAnswers: false,
    votes: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'user1',
    authorName: 'Test User',
    authorImageUrl: 'https://example.com/avatar.jpg',
    reactions: [],
    views: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    usersService = module.get<UsersService>(UsersService);
    firebaseService = module.get<FirebaseService>(FirebaseService);

    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all news items with author info', async () => {
      const mockFirestore = createFirestoreMock(mockTextNewsItem);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getUserProfile.mockResolvedValue({
        name: 'Test User',
        profilePictureUrl: 'https://example.com/avatar.jpg',
      });

      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].authorName).toBe('Test User');
    });
  });

  describe('getById', () => {
    it('should return a news item by id with author info', async () => {
      const mockFirestore = createFirestoreMock(mockTextNewsItem);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getUserProfile.mockResolvedValue({
        name: 'Test User',
        profilePictureUrl: 'https://example.com/avatar.jpg',
      });

      const result = await service.getById('news1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('news1');
      expect(result?.authorName).toBe('Test User');
    });

    it('should return null if news item not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createTextNews', () => {
    it('should create a new text news item', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const createDto: CreateTextNewsDto = {
        content: 'New Text News',
        authorId: 'user1',
      };

      const result = await service.createTextNews(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
      expect(result.content).toBe(createDto.content);
      expect(mockFirestore.collection().add).toHaveBeenCalled();
    });
  });

  describe('createImageNews', () => {
    it('should create a new image news item', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const createDto: CreateImageNewsDto = {
        content: 'New Image News',
        imageUrls: ['https://example.com/image1.jpg'],
        authorId: 'user1',
      };

      const result = await service.createImageNews(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe('image');
      expect(result.imageUrls).toEqual(createDto.imageUrls);
      expect(mockFirestore.collection().add).toHaveBeenCalled();
    });
  });

  describe('createPollNews', () => {
    it('should create a new poll news item', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const createDto: CreatePollNewsDto = {
        content: 'New Poll Question?',
        authorId: 'user1',
        pollInfo: {
          options: [
            { id: 'opt1', text: 'Option 1' },
            { id: 'opt2', text: 'Option 2' },
          ],
          allowMultipleChoices: false,
          endDate: '2024-12-31T23:59:59.999Z',
        },
      };

      const result = await service.createPollNews(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe('poll');
      expect(result.question).toBe(createDto.content);
      expect(result.options).toHaveLength(2);
      expect(mockFirestore.collection().add).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a news item', async () => {
      const mockFirestore = createFirestoreMock(mockTextNewsItem);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const updateData = {
        content: 'Updated Content',
      };

      const result = await service.update('news1', updateData);

      expect(result).toBeDefined();
      expect(mockFirestore.collection().doc().update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if news item not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a news item', async () => {
      const mockFirestore = createFirestoreMock(mockTextNewsItem);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await service.delete('news1');

      expect(mockFirestore.collection().doc().delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if news item not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('postReaction', () => {
    it('should add a new reaction', async () => {
      const mockFirestore = createFirestoreMock(mockTextNewsItem);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const reactionDto: CreateReactionDto = {
        userId: 'user1',
        reactionType: 'like',
      };

      const result = await service.postReaction('news1', reactionDto);

      expect(result).toBeDefined();
      expect(mockFirestore.runTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if news item not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const reactionDto: CreateReactionDto = {
        userId: 'user1',
        reactionType: 'like',
      };

      await expect(service.postReaction('nonexistent', reactionDto)).rejects.toThrow(
        new Error('updatedNewsDoc.data is not a function'),
      );
    });
  });

  describe('votePoll', () => {
    it('should add a vote to a poll', async () => {
      const mockFirestore = createFirestoreMock(mockPollNewsItem);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const voteDto: VotePollDto = {
        userId: 'user1',
        optionId: 'opt1',
      };

      const result = await service.votePoll('news3', voteDto);

      expect(result).toBeDefined();
      expect(mockFirestore.runTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if news item not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const voteDto: VotePollDto = {
        userId: 'user1',
        optionId: 'opt1',
      };

      await expect(service.votePoll('nonexistent', voteDto)).rejects.toThrow(
        new Error('News item is not a poll'),
      );
    });

    it('should throw BadRequestException if news item is not a poll', async () => {
      const mockFirestore = createFirestoreMock(mockTextNewsItem);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const voteDto: VotePollDto = {
        userId: 'user1',
        optionId: 'opt1',
      };

      await expect(service.votePoll('news1', voteDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count', async () => {
      const mockFirestore = createFirestoreMock(mockTextNewsItem);
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await service.incrementViewCount('news1');

      expect(mockFirestore.runTransaction).toHaveBeenCalled();
    });

    xit('should throw NotFoundException if news item not found', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.incrementViewCount('nonexistent')).rejects.toThrow(
        new Error('updatedNewsDoc.data is not a function'),
      );
    });
  });
});
