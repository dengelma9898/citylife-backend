import { Test, TestingModule } from '@nestjs/testing';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import {
  TextNewsItem,
  ImageNewsItem,
  PollNewsItem,
} from './interfaces/news-item.interface';
import { CreateTextNewsDto } from './dto/create-text-news.dto';
import { CreateImageNewsDto } from './dto/create-image-news.dto';
import { CreatePollNewsDto, PollInfoDto } from './dto/create-poll-news.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';

describe('NewsController', () => {
  let controller: NewsController;
  let newsService: NewsService;
  let storageService: FirebaseStorageService;

  const mockNewsService = {
    getAll: jest.fn(),
    getById: jest.fn(),
    createTextNews: jest.fn(),
    createImageNews: jest.fn(),
    createPollNews: jest.fn(),
    votePoll: jest.fn(),
    postReaction: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    incrementViewCount: jest.fn().mockResolvedValue(undefined),
  };

  const mockFirebaseStorageService = {
    uploadFile: jest.fn(),
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
      controllers: [NewsController],
      providers: [
        {
          provide: NewsService,
          useValue: mockNewsService,
        },
        {
          provide: FirebaseStorageService,
          useValue: mockFirebaseStorageService,
        },
      ],
    }).compile();

    controller = module.get<NewsController>(NewsController);
    newsService = module.get<NewsService>(NewsService);
    storageService = module.get<FirebaseStorageService>(FirebaseStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return an array of news items', async () => {
      const mockNewsItems = [mockTextNewsItem, mockImageNewsItem, mockPollNewsItem];
      mockNewsService.getAll.mockResolvedValue(mockNewsItems);

      const result = await controller.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
      expect(mockNewsService.getAll).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return a news item by id', async () => {
      mockNewsService.getById.mockResolvedValue(mockTextNewsItem);

      const result = await controller.getById('news1');

      expect(result).toBeDefined();
      expect(result.id).toBe(mockTextNewsItem.id);
      expect(mockNewsService.getById).toHaveBeenCalledWith('news1');
      expect(mockNewsService.incrementViewCount).toHaveBeenCalledWith('news1');
    });

    it('should throw NotFoundException if news item not found', async () => {
      mockNewsService.getById.mockResolvedValue(null);

      await expect(controller.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTextNews', () => {
    it('should create a new text news item', async () => {
      const createDto: CreateTextNewsDto = {
        content: 'New Text News',
        authorId: 'user1',
      };

      mockNewsService.createTextNews.mockResolvedValue(mockTextNewsItem);

      const result = await controller.createTextNews(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
      expect(mockNewsService.createTextNews).toHaveBeenCalledWith(createDto);
    });
  });

  describe('createImageNews', () => {
    it('should create a new image news item', async () => {
      const createDto: CreateImageNewsDto = {
        content: 'New Image News',
        imageUrls: ['https://example.com/image1.jpg'],
        authorId: 'user1',
      };

      mockNewsService.createImageNews.mockResolvedValue(mockImageNewsItem);

      const result = await controller.createImageNews(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe('image');
      expect(mockNewsService.createImageNews).toHaveBeenCalledWith(createDto);
    });
  });

  describe('createPollNews', () => {
    it('should create a new poll news item', async () => {
      const pollInfo: PollInfoDto = {
        options: [
          { id: 'opt1', text: 'Option 1' },
          { id: 'opt2', text: 'Option 2' },
        ],
        allowMultipleChoices: false,
      };

      const createDto: CreatePollNewsDto = {
        content: 'New Poll Question?',
        authorId: 'user1',
        pollInfo,
      };

      mockNewsService.createPollNews.mockResolvedValue(mockPollNewsItem);

      const result = await controller.createPollNews(createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe('poll');
      expect(mockNewsService.createPollNews).toHaveBeenCalledWith(createDto);
    });
  });

  describe('votePoll', () => {
    it('should vote on a poll', async () => {
      const voteDto: VotePollDto = {
        optionId: 'opt1',
        userId: 'user1',
      };

      const updatedPoll = {
        ...mockPollNewsItem,
        options: [
          { ...mockPollNewsItem.options[0], voters: ['user1'] },
          mockPollNewsItem.options[1],
        ],
        votes: 1,
      };

      mockNewsService.votePoll.mockResolvedValue(updatedPoll);

      const result = await controller.votePoll('news3', voteDto);

      expect(result).toBeDefined();
      expect(result.votes).toBe(1);
      expect(mockNewsService.votePoll).toHaveBeenCalledWith('news3', voteDto);
    });
  });

  describe('postReaction', () => {
    it('should add a reaction to a news item', async () => {
      const reactionDto: CreateReactionDto = {
        userId: 'user1',
        reactionType: 'like',
      };

      const updatedNews = {
        ...mockTextNewsItem,
        reactions: [{ userId: 'user1', type: 'like' }],
      };

      mockNewsService.postReaction.mockResolvedValue(updatedNews);

      const result = await controller.postReaction('news1', reactionDto);

      expect(result).toBeDefined();
      expect(result.reactions).toHaveLength(1);
      expect(mockNewsService.postReaction).toHaveBeenCalledWith('news1', reactionDto);
    });
  });

  describe('delete', () => {
    it('should delete a news item', async () => {
      mockNewsService.delete.mockResolvedValue(undefined);

      await controller.delete('news1');

      expect(mockNewsService.delete).toHaveBeenCalledWith('news1');
    });
  });

  describe('update', () => {
    it('should update a text news item', async () => {
      const updateData = {
        content: 'Updated Content',
      };

      const updatedNews = {
        ...mockTextNewsItem,
        content: 'Updated Content',
      };

      mockNewsService.update.mockResolvedValue(updatedNews);

      const result = await controller.update('news1', updateData);

      expect(result).toBeDefined();
      expect((result as TextNewsItem).content).toBe('Updated Content');
      expect(mockNewsService.update).toHaveBeenCalledWith('news1', updateData);
    });

    it('should not allow changing the type', async () => {
      const updateData = {
        type: 'image' as const,
        content: 'Updated Content',
      };

      const updatedNews = {
        ...mockTextNewsItem,
        content: 'Updated Content',
      };

      mockNewsService.update.mockResolvedValue(updatedNews);

      const result = await controller.update('news1', updateData);

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
      expect(mockNewsService.update).toHaveBeenCalledWith('news1', { content: 'Updated Content' });
    });
  });

  describe('updateNewsImages', () => {
    const createMockFile = () => ({
      fieldname: 'images',
      originalname: 'image1.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 1024,
      destination: '',
      filename: '',
      path: '',
      stream: new Readable(),
    });

    it('should update images for an image news item', async () => {
      const mockFiles = [createMockFile()];

      mockNewsService.getById.mockResolvedValue(mockImageNewsItem);
      mockFirebaseStorageService.uploadFile.mockResolvedValue('https://example.com/new-image.jpg');

      const updatedNews = {
        ...mockImageNewsItem,
        imageUrls: [...mockImageNewsItem.imageUrls, 'https://example.com/new-image.jpg'],
      };

      mockNewsService.update.mockResolvedValue(updatedNews);

      const result = await controller.updateNewsImages('news2', mockFiles);

      expect(result).toBeDefined();
      expect(result.imageUrls).toHaveLength(2);
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalled();
      expect(mockNewsService.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no files are uploaded', async () => {
      await expect(controller.updateNewsImages('news2', [])).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if news item not found', async () => {
      const mockFiles = [createMockFile()];

      mockNewsService.getById.mockResolvedValue(null);

      await expect(controller.updateNewsImages('nonexistent', mockFiles)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if news item is not an image type', async () => {
      const mockFiles = [createMockFile()];

      mockNewsService.getById.mockResolvedValue(mockTextNewsItem);

      await expect(controller.updateNewsImages('news1', mockFiles)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
