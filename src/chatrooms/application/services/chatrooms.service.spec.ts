import { Test, TestingModule } from '@nestjs/testing';
import { ChatroomsService } from './chatrooms.service';
import { CHATROOM_REPOSITORY } from '../../domain/repositories/chatroom.repository';
import { Chatroom } from '../../domain/entities/chatroom.entity';
import { NotFoundException } from '@nestjs/common';

describe('ChatroomsService', () => {
  let service: ChatroomsService;
  let chatroomRepository: any;

  const mockChatroomRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByParticipant: jest.fn(),
  };

  const mockChatrooms = [
    Chatroom.fromProps({
      id: 'chatroom1',
      title: 'Test Chatroom 1',
      description: 'Description 1',
      imageUrl: 'image1.jpg',
      createdBy: 'user1',
      participants: ['user1', 'user2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    Chatroom.fromProps({
      id: 'chatroom2',
      title: 'Test Chatroom 2',
      description: 'Description 2',
      imageUrl: 'image2.jpg',
      createdBy: 'user2',
      participants: ['user2', 'user3'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatroomsService,
        {
          provide: CHATROOM_REPOSITORY,
          useValue: mockChatroomRepository,
        },
      ],
    }).compile();

    service = module.get<ChatroomsService>(ChatroomsService);
    chatroomRepository = module.get(CHATROOM_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all chatrooms with participantCount', async () => {
      mockChatroomRepository.findAll.mockResolvedValue(mockChatrooms);

      const result = await service.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Chatroom 1');
      expect(result[0].participantCount).toBe(2);
      expect(result[1].title).toBe('Test Chatroom 2');
      expect(result[1].participantCount).toBe(2);
      expect(mockChatroomRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return a chatroom by id with participantCount', async () => {
      mockChatroomRepository.findById.mockResolvedValue(mockChatrooms[0]);

      const result = await service.getById('chatroom1');

      expect(result).toBeDefined();
      expect(result.id).toBe('chatroom1');
      expect(result.title).toBe('Test Chatroom 1');
      expect(result.participantCount).toBe(2);
      expect(mockChatroomRepository.findById).toHaveBeenCalledWith('chatroom1');
    });

    it('should throw NotFoundException if chatroom not found', async () => {
      mockChatroomRepository.findById.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockChatroomRepository.findById).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('create', () => {
    const createDto = {
      title: 'New Chatroom',
      description: 'New Description',
      image: 'new-image.jpg',
    };

    it('should create a new chatroom', async () => {
      const mockCreatedChatroom = Chatroom.create({
        ...createDto,
        imageUrl: createDto.image,
        createdBy: 'user1',
        participants: ['user1'],
      });

      mockChatroomRepository.create.mockResolvedValue(mockCreatedChatroom);

      const result = await service.create(createDto, 'user1');

      expect(result).toBeDefined();
      expect(result.title).toBe(createDto.title);
      expect(result.description).toBe(createDto.description);
      expect(result.imageUrl).toBe(createDto.image);
      expect(result.createdBy).toBe('user1');
      expect(result.participants).toContain('user1');
      expect(result.participantCount).toBe(1);
      expect(mockChatroomRepository.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = {
      title: 'Updated Chatroom',
      description: 'Updated Description',
    };

    it('should update an existing chatroom', async () => {
      const updatedChatroom = Chatroom.fromProps({
        ...mockChatrooms[0],
        ...updateDto,
        updatedAt: new Date().toISOString(),
      });

      mockChatroomRepository.update.mockResolvedValue(updatedChatroom);

      const result = await service.update('chatroom1', updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('chatroom1');
      expect(result.title).toBe(updateDto.title);
      expect(result.description).toBe(updateDto.description);
      expect(result.participantCount).toBe(2);
      expect(mockChatroomRepository.update).toHaveBeenCalledWith('chatroom1', updateDto);
    });

    it('should throw NotFoundException if chatroom not found', async () => {
      mockChatroomRepository.update.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(NotFoundException);
      expect(mockChatroomRepository.update).toHaveBeenCalledWith('nonexistent', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a chatroom', async () => {
      mockChatroomRepository.delete.mockResolvedValue(undefined);

      await service.remove('chatroom1');

      expect(mockChatroomRepository.delete).toHaveBeenCalledWith('chatroom1');
    });
  });

  describe('findByParticipant', () => {
    it('should return chatrooms for a participant with participantCount', async () => {
      mockChatroomRepository.findByParticipant.mockResolvedValue([mockChatrooms[0]]);

      const result = await service.findByParticipant('user1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].participants).toContain('user1');
      expect(result[0].participantCount).toBe(2);
      expect(mockChatroomRepository.findByParticipant).toHaveBeenCalledWith('user1');
    });
  });

  describe('updateImage', () => {
    it('should update chatroom image', async () => {
      const updatedChatroom = Chatroom.fromProps({
        ...mockChatrooms[0],
        imageUrl: 'new-image.jpg',
        updatedAt: new Date().toISOString(),
      });

      mockChatroomRepository.update.mockResolvedValue(updatedChatroom);

      const result = await service.updateImage('chatroom1', 'new-image.jpg');

      expect(result).toBeDefined();
      expect(result.id).toBe('chatroom1');
      expect(result.imageUrl).toBe('new-image.jpg');
      expect(result.participantCount).toBe(2);
      expect(mockChatroomRepository.update).toHaveBeenCalledWith('chatroom1', {
        imageUrl: 'new-image.jpg',
      });
    });

    it('should throw NotFoundException if chatroom not found', async () => {
      mockChatroomRepository.update.mockResolvedValue(null);

      await expect(service.updateImage('nonexistent', 'new-image.jpg')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockChatroomRepository.update).toHaveBeenCalledWith('nonexistent', {
        imageUrl: 'new-image.jpg',
      });
    });
  });
});
