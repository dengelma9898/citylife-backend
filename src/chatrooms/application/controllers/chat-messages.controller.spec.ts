import { Test, TestingModule } from '@nestjs/testing';
import { ChatMessagesController } from './chat-messages.controller';
import { ChatMessagesService } from '../services/chat-messages.service';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { UpdateMessageDto } from '../dtos/update-message.dto';
import { ReactionType, UpdateMessageReactionDto } from '../dtos/update-message-reaction.dto';

describe('ChatMessagesController', () => {
  let controller: ChatMessagesController;
  let service: ChatMessagesService;

  const mockChatMessagesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addReaction: jest.fn(),
    removeReaction: jest.fn(),
    adminUpdate: jest.fn(),
    adminRemove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatMessagesController],
      providers: [
        {
          provide: ChatMessagesService,
          useValue: mockChatMessagesService,
        },
      ],
    }).compile();

    controller = module.get<ChatMessagesController>(ChatMessagesController);
    service = module.get<ChatMessagesService>(ChatMessagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateMessageDto = {
      content: 'Test Message',
    };

    it('should create a new message', async () => {
      const mockMessage = {
        id: 'message1',
        content: createDto.content,
        senderId: 'user1',
        senderName: 'User 1',
        reactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockChatMessagesService.create.mockResolvedValue(mockMessage);

      const result = await controller.create('chatroom1', 'user1', createDto);

      expect(result).toBeDefined();
      expect(result.content).toBe(createDto.content);
      expect(mockChatMessagesService.create).toHaveBeenCalledWith('chatroom1', 'user1', createDto);
    });
  });

  describe('findAll', () => {
    it('should return all messages for a chatroom', async () => {
      const mockMessages = [
        {
          id: 'message1',
          content: 'Test Message 1',
          senderId: 'user1',
          senderName: 'User 1',
          reactions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockChatMessagesService.findAll.mockResolvedValue(mockMessages);

      const result = await controller.findAll('chatroom1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(mockChatMessagesService.findAll).toHaveBeenCalledWith('chatroom1', undefined, undefined);
    });

    it('should return limited messages when limit is provided', async () => {
      const mockMessages = [
        {
          id: 'message1',
          content: 'Test Message 1',
          senderId: 'user1',
          senderName: 'User 1',
          reactions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockChatMessagesService.findAll.mockResolvedValue(mockMessages);

      const result = await controller.findAll('chatroom1', 1);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(mockChatMessagesService.findAll).toHaveBeenCalledWith('chatroom1', 1, undefined);
    });
  });

  describe('findOne', () => {
    it('should return a message by id', async () => {
      const mockMessage = {
        id: 'message1',
        content: 'Test Message 1',
        senderId: 'user1',
        senderName: 'User 1',
        reactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockChatMessagesService.findOne.mockResolvedValue(mockMessage);

      const result = await controller.findOne('chatroom1', 'message1');

      expect(result).toBeDefined();
      expect(result.id).toBe('message1');
      expect(mockChatMessagesService.findOne).toHaveBeenCalledWith('chatroom1', 'message1', undefined);
    });
  });

  describe('update', () => {
    const updateDto: UpdateMessageDto = {
      content: 'Updated Message',
    };

    it('should update a message', async () => {
      const mockMessage = {
        id: 'message1',
        content: updateDto.content,
        senderId: 'user1',
        senderName: 'User 1',
        reactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockChatMessagesService.update.mockResolvedValue(mockMessage);

      const result = await controller.update('chatroom1', 'message1', 'user1', updateDto);

      expect(result).toBeDefined();
      expect(result.content).toBe(updateDto.content);
      expect(mockChatMessagesService.update).toHaveBeenCalledWith(
        'chatroom1',
        'message1',
        updateDto,
        'user1',
      );
    });
  });

  describe('remove', () => {
    it('should remove a message', async () => {
      mockChatMessagesService.remove.mockResolvedValue(undefined);

      await controller.remove('chatroom1', 'message1', 'user1');

      expect(mockChatMessagesService.remove).toHaveBeenCalledWith('chatroom1', 'message1', 'user1');
    });
  });

  describe('addReaction', () => {
    const reactionDto: UpdateMessageReactionDto = {
      type: ReactionType.LIKE,
    };

    it('should add a reaction to a message', async () => {
      const mockMessage = {
        id: 'message1',
        content: 'Test Message 1',
        senderId: 'user1',
        senderName: 'User 1',
        reactions: [{ userId: 'user1', type: ReactionType.LIKE }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockChatMessagesService.addReaction.mockResolvedValue(mockMessage);

      const result = await controller.addReaction('chatroom1', 'message1', 'user1', reactionDto);

      expect(result).toBeDefined();
      expect(result.reactions).toHaveLength(1);
      expect(mockChatMessagesService.addReaction).toHaveBeenCalledWith(
        'chatroom1',
        'message1',
        'user1',
        reactionDto,
      );
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction from a message', async () => {
      const mockMessage = {
        id: 'message1',
        content: 'Test Message 1',
        senderId: 'user1',
        senderName: 'User 1',
        reactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockChatMessagesService.removeReaction.mockResolvedValue(mockMessage);

      const result = await controller.removeReaction('chatroom1', 'message1', 'user1');

      expect(result).toBeDefined();
      expect(result.reactions).toHaveLength(0);
      expect(mockChatMessagesService.removeReaction).toHaveBeenCalledWith(
        'chatroom1',
        'message1',
        'user1',
      );
    });
  });

  describe('adminUpdate', () => {
    const updateDto: UpdateMessageDto = {
      content: 'Admin Updated Message',
    };

    it('should update a message as admin', async () => {
      const mockMessage = {
        id: 'message1',
        content: updateDto.content,
        senderId: 'user1',
        senderName: 'User 1',
        reactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        editedAt: new Date().toISOString(),
        editedByAdmin: true,
      };

      mockChatMessagesService.adminUpdate.mockResolvedValue(mockMessage);

      const result = await controller.adminUpdate('chatroom1', 'message1', updateDto);

      expect(result).toBeDefined();
      expect(result.content).toBe(updateDto.content);
      expect(result.editedByAdmin).toBe(true);
      expect(mockChatMessagesService.adminUpdate).toHaveBeenCalledWith(
        'chatroom1',
        'message1',
        updateDto,
      );
    });
  });

  describe('adminRemove', () => {
    it('should remove a message as admin', async () => {
      mockChatMessagesService.adminRemove.mockResolvedValue(undefined);

      await controller.adminRemove('chatroom1', 'message1');

      expect(mockChatMessagesService.adminRemove).toHaveBeenCalledWith('chatroom1', 'message1');
    });
  });
});
