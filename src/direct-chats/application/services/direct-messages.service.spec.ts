import { Test, TestingModule } from '@nestjs/testing';
import { DirectMessagesService } from './direct-messages.service';
import { DirectMessage } from '../../domain/entities/direct-message.entity';
import { DirectChat } from '../../domain/entities/direct-chat.entity';
import { DirectChatsService } from './direct-chats.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { UsersService } from '../../../users/users.service';
import { FirebaseService } from '../../../firebase/firebase.service';

describe('DirectMessagesService', () => {
  let service: DirectMessagesService;
  let mockMessageDoc: {
    get: jest.Mock;
    set: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockMessagesQuery: {
    orderBy: jest.Mock;
    get: jest.Mock;
  };
  let mockMessagesCollection: {
    doc: jest.Mock;
    orderBy: jest.Mock;
    get: jest.Mock;
  };
  let mockChatDoc: {
    collection: jest.Mock;
  };
  let mockChatCollection: {
    doc: jest.Mock;
  };
  let mockFirestore: {
    collection: jest.Mock;
    batch: jest.Mock;
  };
  let mockFirebaseService: { getFirestore: jest.Mock };
  let directChatsService: jest.Mocked<DirectChatsService>;

  const mockDirectChatsService = {
    validateChatAccess: jest.fn(),
    updateLastMessage: jest.fn(),
  };

  const mockNotificationService = {
    sendToUser: jest.fn(),
    sendToUsers: jest.fn(),
  };

  const mockUsersService = {
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

  const messageToFirestoreData = (message: DirectMessage): Record<string, unknown> => {
    const { id, ...data } = message.toJSON();
    return data;
  };

  const configureFindMessageById = (message: DirectMessage | null): void => {
    mockMessageDoc.get.mockResolvedValue({
      exists: message !== null,
      id: message?.id ?? 'unknown',
      data: () => (message ? messageToFirestoreData(message) : undefined),
    });
  };

  const configureFindByChatId = (messages: DirectMessage[]): void => {
    mockMessagesQuery.get.mockResolvedValue({
      docs: messages.map(message => ({
        id: message.id,
        data: () => messageToFirestoreData(message),
      })),
    });
  };

  beforeEach(async () => {
    mockMessageDoc = {
      get: jest.fn().mockResolvedValue({ exists: false, id: 'unknown', data: () => undefined }),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockMessagesQuery = {
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    mockMessagesCollection = {
      doc: jest.fn().mockReturnValue(mockMessageDoc),
      orderBy: jest.fn().mockReturnValue(mockMessagesQuery),
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    };
    mockChatDoc = {
      collection: jest.fn().mockReturnValue(mockMessagesCollection),
    };
    mockChatCollection = {
      doc: jest.fn().mockReturnValue(mockChatDoc),
    };
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockChatCollection),
      batch: jest.fn().mockReturnValue({
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      }),
    };
    mockFirebaseService = {
      getFirestore: jest.fn().mockReturnValue(mockFirestore),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectMessagesService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: DirectChatsService, useValue: mockDirectChatsService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();
    service = await module.resolve(DirectMessagesService);
    directChatsService = module.get(DirectChatsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMessage', () => {
    it('should create a new message in active chat', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      mockDirectChatsService.updateLastMessage.mockResolvedValue(undefined);

      const result = await service.createMessage('user-1', 'Test User', 'chat-1', {
        content: 'Hello!',
      });

      expect(result).toBeDefined();
      expect(result.senderId).toBe('user-1');
      expect(result.senderName).toBe('Test User');
      expect(result.content).toBe('Hello!');
      expect(mockMessageDoc.set).toHaveBeenCalled();
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
      configureFindByChatId([mockMessage]);

      const result = await service.getMessages('user-1', 'chat-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('message-1');
      expect(result[0].isEditable).toBe(true);
    });

    it('should set isEditable to false for other users messages', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      configureFindByChatId([mockMessage]);

      const result = await service.getMessages('user-2', 'chat-1');

      expect(result[0].isEditable).toBe(false);
    });
  });

  describe('updateMessage', () => {
    it('should update own message', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      configureFindMessageById(mockMessage);

      const result = await service.updateMessage('user-1', 'chat-1', 'message-1', {
        content: 'Updated content',
      });

      expect(result).toBeDefined();
      expect(result.content).toBe('Updated content');
      expect(result.editedAt).toBeDefined();
      expect(mockMessageDoc.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when message not found', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      configureFindMessageById(null);

      await expect(
        service.updateMessage('user-1', 'chat-1', 'nonexistent', { content: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when trying to edit others message', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      configureFindMessageById(mockMessage);

      await expect(
        service.updateMessage('user-2', 'chat-1', 'message-1', { content: 'Updated' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteMessage', () => {
    it('should delete own message', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      configureFindMessageById(mockMessage);

      await service.deleteMessage('user-1', 'chat-1', 'message-1');

      expect(mockMessageDoc.delete).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when trying to delete others message', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      configureFindMessageById(mockMessage);

      await expect(
        service.deleteMessage('user-2', 'chat-1', 'message-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateReaction', () => {
    it('should add a reaction to a message', async () => {
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      configureFindMessageById(mockMessage);

      const result = await service.updateReaction('user-2', 'chat-1', 'message-1', {
        type: '👍',
      });

      expect(result).toBeDefined();
      expect(result.reactions).toContainEqual({ userId: 'user-2', type: '👍' });
      expect(mockMessageDoc.update).toHaveBeenCalled();
    });

    it('should remove existing reaction when same reaction is sent', async () => {
      const messageWithReaction = DirectMessage.fromProps({
        ...mockMessage.toJSON(),
        reactions: [{ userId: 'user-2', type: '👍' }],
      });
      mockDirectChatsService.validateChatAccess.mockResolvedValue(mockActiveChat);
      configureFindMessageById(messageWithReaction);

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
      configureFindMessageById(messageWithReaction);

      const result = await service.updateReaction('user-2', 'chat-1', 'message-1', {
        type: '❤️',
      });

      expect(result.reactions).toHaveLength(1);
      expect(result.reactions).toContainEqual({ userId: 'user-2', type: '❤️' });
    });
  });
});
