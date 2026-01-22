import { Test, TestingModule } from '@nestjs/testing';
import { DirectMessagesService } from './direct-messages.service';
import { DirectMessageRepository } from '../../domain/repositories/direct-message.repository';
import { DirectMessage } from '../../domain/entities/direct-message.entity';
import { DirectChat } from '../../domain/entities/direct-chat.entity';
import { DirectChatsService } from './direct-chats.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { UsersService } from '../../../users/users.service';

describe('DirectMessagesService', () => {
  let service: DirectMessagesService;
  let directMessageRepository: jest.Mocked<DirectMessageRepository>;
  let directChatsService: jest.Mocked<DirectChatsService>;

  const mockDirectMessageRepository = {
    findById: jest.fn(),
    findByChatId: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteAllByChatId: jest.fn(),
  };

  const mockDirectChatsService = {
    validateChatAccess: jest.fn(),
    updateLastMessage: jest.fn(),
  };

  const mockNotificationService = {
    sendToUser: jest.fn(),
    sendToUsers: jest.fn(),
  };

  const mockUsersService = {
    getById: jest.fn(),
    getUserProfile: jest.fn(),
  };

  const mockActiveChat = DirectChat.fromProps({
    id: 'chat-1',
    creatorId: 'user-1',
    invitedUserId: 'user-2',
    creatorConfirmed: true,
    invitedConfirmed: true,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const mockPendingChat = DirectChat.fromProps({
    id: 'chat-2',
    creatorId: 'user-1',
    invitedUserId: 'user-2',
    creatorConfirmed: true,
    invitedConfirmed: false,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const mockMessage = DirectMessage.fromProps({
    id: 'message-1',
    chatId: 'chat-1',
    senderId: 'user-1',
    senderName: 'Test User',
    content: 'Hello!',
    isEditable: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectMessagesService,
        {
          provide: DirectMessageRepository,
          useValue: mockDirectMessageRepository,
        },
        {
          provide: DirectChatsService,
          useValue: mockDirectChatsService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<DirectMessagesService>(DirectMessagesService);
    directMessageRepository = module.get(DirectMessageRepository);
    directChatsService = module.get(DirectChatsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMessage', () => {
    it('should create a new message in active chat', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectMessageRepository.save.mockImplementation(msg => Promise.resolve(msg));
      mockDirectChatsService.updateLastMessage.mockResolvedValue(undefined);

      const result = await service.createMessage('user-1', 'Test User', 'chat-1', {
        content: 'Hello!',
      });

      expect(result).toBeDefined();
      expect(result.senderId).toBe('user-1');
      expect(result.senderName).toBe('Test User');
      expect(result.content).toBe('Hello!');
      expect(mockDirectMessageRepository.save).toHaveBeenCalled();
      expect(mockDirectChatsService.updateLastMessage).toHaveBeenCalled();
    });

    it('should throw BadRequestException when chat is pending', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockPendingChat);

      await expect(
        service.createMessage('user-1', 'Test User', 'chat-2', { content: 'Hello!' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMessages', () => {
    it('should return all messages for a chat with isEditable flag', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectMessageRepository.findByChatId.mockResolvedValue([mockMessage]);

      const result = await service.getMessages('user-1', 'chat-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('message-1');
      expect(result[0].isEditable).toBe(true);
    });

    it('should set isEditable to false for other users messages', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectMessageRepository.findByChatId.mockResolvedValue([mockMessage]);

      const result = await service.getMessages('user-2', 'chat-1');

      expect(result[0].isEditable).toBe(false);
    });
  });

  describe('updateMessage', () => {
    it('should update own message', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectMessageRepository.findById.mockResolvedValue(mockMessage);
      mockDirectMessageRepository.update.mockImplementation(msg => Promise.resolve(msg));

      const result = await service.updateMessage('user-1', 'chat-1', 'message-1', {
        content: 'Updated content',
      });

      expect(result).toBeDefined();
      expect(result.content).toBe('Updated content');
      expect(result.editedAt).toBeDefined();
    });

    it('should throw NotFoundException when message not found', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectMessageRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateMessage('user-1', 'chat-1', 'nonexistent', { content: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when trying to edit others message', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectMessageRepository.findById.mockResolvedValue(mockMessage);

      await expect(
        service.updateMessage('user-2', 'chat-1', 'message-1', { content: 'Updated' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteMessage', () => {
    it('should delete own message', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectMessageRepository.findById.mockResolvedValue(mockMessage);
      mockDirectMessageRepository.delete.mockResolvedValue(undefined);

      await service.deleteMessage('user-1', 'chat-1', 'message-1');

      expect(mockDirectMessageRepository.delete).toHaveBeenCalledWith('chat-1', 'message-1');
    });

    it('should throw ForbiddenException when trying to delete others message', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectMessageRepository.findById.mockResolvedValue(mockMessage);

      await expect(
        service.deleteMessage('user-2', 'chat-1', 'message-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateReaction', () => {
    it('should add a reaction to a message', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectMessageRepository.findById.mockResolvedValue(mockMessage);
      mockDirectMessageRepository.update.mockImplementation(msg => Promise.resolve(msg));

      const result = await service.updateReaction('user-2', 'chat-1', 'message-1', {
        type: '👍',
      });

      expect(result).toBeDefined();
      expect(result.reactions).toContainEqual({ userId: 'user-2', type: '👍' });
    });

    it('should remove existing reaction when same reaction is sent', async () => {
      const messageWithReaction = DirectMessage.fromProps({
        ...mockMessage.toJSON(),
        reactions: [{ userId: 'user-2', type: '👍' }],
      });
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectMessageRepository.findById.mockResolvedValue(messageWithReaction);
      mockDirectMessageRepository.update.mockImplementation(msg => Promise.resolve(msg));

      const result = await service.updateReaction('user-2', 'chat-1', 'message-1', {
        type: '👍',
      });

      expect(result.reactions).toHaveLength(0);
    });

    it('should replace existing reaction with new one', async () => {
      const messageWithReaction = DirectMessage.fromProps({
        ...mockMessage.toJSON(),
        reactions: [{ userId: 'user-2', type: '👍' }],
      });
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectMessageRepository.findById.mockResolvedValue(messageWithReaction);
      mockDirectMessageRepository.update.mockImplementation(msg => Promise.resolve(msg));

      const result = await service.updateReaction('user-2', 'chat-1', 'message-1', {
        type: '❤️',
      });

      expect(result.reactions).toHaveLength(1);
      expect(result.reactions).toContainEqual({ userId: 'user-2', type: '❤️' });
    });
  });
});

