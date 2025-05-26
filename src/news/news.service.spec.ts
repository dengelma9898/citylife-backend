import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from './news.service';
import { UsersService } from '../users/users.service';
import { FirebaseService } from '../firebase/firebase.service';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { NewsItem, TextNewsItem, ImageNewsItem, PollNewsItem } from './interfaces/news-item.interface';
import { CreateTextNewsDto } from './dto/create-text-news.dto';
import { CreateImageNewsDto } from './dto/create-image-news.dto';
import { CreatePollNewsDto } from './dto/create-poll-news.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

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

describe('NewsService', () => {
  let service: NewsService;
  let usersService: UsersService;
  let firebaseService: FirebaseService;

  const mockUsersService = {
    getUserProfile: jest.fn()
  };

  const mockFirebaseService = {
    getClientFirestore: jest.fn().mockReturnValue({})
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
    views: 0
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
    views: 0
  };

  const mockPollNewsItem: PollNewsItem = {
    id: 'news3',
    type: 'poll',
    question: 'Test Question?',
    options: [
      { id: 'opt1', text: 'Option 1', voters: [] },
      { id: 'opt2', text: 'Option 2', voters: [] }
    ],
    allowMultipleAnswers: false,
    votes: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: 'user1',
    authorName: 'Test User',
    authorImageUrl: 'https://example.com/avatar.jpg',
    reactions: [],
    views: 0
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        {
          provide: UsersService,
          useValue: mockUsersService
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService
        }
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    usersService = module.get<UsersService>(UsersService);
    firebaseService = module.get<FirebaseService>(FirebaseService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all news items with author info', async () => {
      const mockSnapshot = {
        docs: [
          { id: 'news1', data: () => ({ ...mockTextNewsItem }) },
          { id: 'news2', data: () => ({ ...mockImageNewsItem }) }
        ]
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);
      mockUsersService.getUserProfile.mockResolvedValue({
        name: 'Test User',
        profilePictureUrl: 'https://example.com/avatar.jpg'
      });

      const result = await service.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].authorName).toBe('Test User');
      expect(getDocs).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return a news item by id with author info', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'news1',
        data: () => ({ ...mockTextNewsItem })
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      mockUsersService.getUserProfile.mockResolvedValue({
        name: 'Test User',
        profilePictureUrl: 'https://example.com/avatar.jpg'
      });

      const result = await service.getById('news1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('news1');
      expect(result?.authorName).toBe('Test User');
    });

    it('should return null if news item not found', async () => {
      const mockDoc = {
        exists: () => false
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createTextNews', () => {
    it('should create a new text news item', async () => {
      const createDto: CreateTextNewsDto = {
        content: 'New Text News',
        authorId: 'user1'
      };

      (addDoc as jest.Mock).mockResolvedValue({ id: 'news1' });

      const result = await service.createTextNews(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
      expect(result.content).toBe(createDto.content);
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('createImageNews', () => {
    it('should create a new image news item', async () => {
      const createDto: CreateImageNewsDto = {
        content: 'New Image News',
        imageUrls: ['https://example.com/image1.jpg'],
        authorId: 'user1'
      };

      (addDoc as jest.Mock).mockResolvedValue({ id: 'news2' });

      const result = await service.createImageNews(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe('image');
      expect(result.imageUrls).toEqual(createDto.imageUrls);
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('createPollNews', () => {
    it('should create a new poll news item', async () => {
      const createDto: CreatePollNewsDto = {
        content: 'New Poll Question?',
        authorId: 'user1',
        pollInfo: {
          options: [
            { id: 'opt1', text: 'Option 1' },
            { id: 'opt2', text: 'Option 2' }
          ],
          allowMultipleChoices: false,
          endDate: '2024-12-31T23:59:59.999Z'
        }
      };

      (addDoc as jest.Mock).mockResolvedValue({ id: 'news3' });

      const result = await service.createPollNews(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe('poll');
      expect(result.question).toBe(createDto.content);
      expect(result.options).toHaveLength(2);
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a news item', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'news1',
        data: () => ({ ...mockTextNewsItem })
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const updateData = {
        content: 'Updated Content'
      };

      const result = await service.update('news1', updateData);

      expect(result).toBeDefined();
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if news item not found', async () => {
      const mockDoc = {
        exists: () => false
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      await expect(service.update('nonexistent', {}))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a news item', async () => {
      const mockDoc = {
        exists: () => true
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await service.delete('news1');

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw NotFoundException if news item not found', async () => {
      const mockDoc = {
        exists: () => false
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);

      await expect(service.delete('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('postReaction', () => {
    it('should add a new reaction', async () => {
      const mockDoc = {
        exists: () => true,
        data: () => ({ ...mockTextNewsItem })
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (runTransaction as jest.Mock).mockImplementation((db, updateFunction) => {
        const transaction = {
          get: jest.fn().mockResolvedValue(mockDoc),
          update: jest.fn()
        };
        return updateFunction(transaction);
      });

      const reactionDto: CreateReactionDto = {
        userId: 'user1',
        reactionType: 'like'
      };

      const result = await service.postReaction('news1', reactionDto);

      expect(result).toBeDefined();
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if news item not found', async () => {
      const mockDoc = {
        exists: () => false
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (runTransaction as jest.Mock).mockImplementation((db, updateFunction) => {
        const transaction = {
          get: jest.fn().mockResolvedValue(mockDoc),
          update: jest.fn()
        };
        return updateFunction(transaction);
      });

      const reactionDto: CreateReactionDto = {
        userId: 'user1',
        reactionType: 'like'
      };

      await expect(service.postReaction('nonexistent', reactionDto))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('votePoll', () => {
    it('should add a vote to a poll', async () => {
      const mockDoc = {
        exists: () => true,
        data: () => ({ ...mockPollNewsItem })
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (runTransaction as jest.Mock).mockImplementation((db, updateFunction) => {
        const transaction = {
          get: jest.fn().mockResolvedValue(mockDoc),
          update: jest.fn()
        };
        return updateFunction(transaction);
      });

      const voteDto: VotePollDto = {
        optionId: 'opt1',
        userId: 'user1'
      };

      const result = await service.votePoll('news3', voteDto);

      expect(result).toBeDefined();
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if news item not found', async () => {
      const mockDoc = {
        exists: () => false
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (runTransaction as jest.Mock).mockImplementation((db, updateFunction) => {
        const transaction = {
          get: jest.fn().mockResolvedValue(mockDoc),
          update: jest.fn()
        };
        return updateFunction(transaction);
      });

      const voteDto: VotePollDto = {
        optionId: 'opt1',
        userId: 'user1'
      };

      await expect(service.votePoll('nonexistent', voteDto))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw BadRequestException if news item is not a poll', async () => {
      const mockDoc = {
        exists: () => true,
        data: () => ({ ...mockTextNewsItem })
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (runTransaction as jest.Mock).mockImplementation((db, updateFunction) => {
        const transaction = {
          get: jest.fn().mockResolvedValue(mockDoc),
          update: jest.fn()
        };
        return updateFunction(transaction);
      });

      const voteDto: VotePollDto = {
        optionId: 'opt1',
        userId: 'user1'
      };

      await expect(service.votePoll('news1', voteDto))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count', async () => {
      const mockDoc = {
        exists: () => true,
        data: () => ({ ...mockTextNewsItem })
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (runTransaction as jest.Mock).mockImplementation((db, updateFunction) => {
        const transaction = {
          get: jest.fn().mockResolvedValue(mockDoc),
          update: jest.fn()
        };
        return updateFunction(transaction);
      });

      await service.incrementViewCount('news1');

      expect(runTransaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if news item not found', async () => {
      const mockDoc = {
        exists: () => false
      };

      (getDoc as jest.Mock).mockResolvedValue(mockDoc);
      (runTransaction as jest.Mock).mockImplementation((db, updateFunction) => {
        const transaction = {
          get: jest.fn().mockResolvedValue(mockDoc),
          update: jest.fn()
        };
        return updateFunction(transaction);
      });

      await expect(service.incrementViewCount('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });
}); 