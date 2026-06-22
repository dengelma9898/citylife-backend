import { Test, TestingModule } from '@nestjs/testing';
import { ChatMessagesService } from './chat-messages.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { UsersService } from '../../../users/users.service';
import { ChatMessage } from '../../domain/entities/chat-message.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReactionType, UpdateChatMessageReactionDto } from '../dtos/update-message-reaction.dto';
import { UserType } from '../../../users/enums/user-type.enum';

describe('ChatMessagesService', () => {
  let service: ChatMessagesService;
  let mockChatroomDoc: { get: jest.Mock; collection: jest.Mock };
  let mockMessageDoc: {
    get: jest.Mock;
    set: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockMessagesCollection: {
    doc: jest.Mock;
    orderBy: jest.Mock;
    limit: jest.Mock;
    get: jest.Mock;
  };
  let mockChatroomsCollection: { doc: jest.Mock };
  let mockFirestore: { collection: jest.Mock };

  const messageToFirestoreData = (message: ChatMessage): Record<string, unknown> => {
    const { id, isEditable, ...data } = message.toJSON();
    return data;
  };

  const mockUsersService = {
    getById: jest.fn(),
  };

  const mockMessages = [
    ChatMessage.fromProps({
      id: 'message1',
      content: 'Test Message 1',
      senderId: 'user1',
      senderName: 'User 1',
      isEditable: false,
      reactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editedByAdmin: false,
    }),
    ChatMessage.fromProps({
      id: 'message2',
      content: 'Test Message 2',
      senderId: 'user2',
      senderName: 'User 2',
      isEditable: false,
      reactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editedByAdmin: false,
    }),
  ];

  const configureChatroomExists = (exists: boolean): void => {
    mockChatroomDoc.get.mockResolvedValue({ exists });
  };

  const configureFindAllMessages = (messages: ChatMessage[]): void => {
    configureChatroomExists(true);
    mockMessagesCollection.get.mockResolvedValue({
      docs: messages.map(message => ({
        id: message.id,
        data: () => messageToFirestoreData(message),
      })),
    });
  };

  const configureFindMessageById = (message: ChatMessage | null): void => {
    configureChatroomExists(true);
    if (message === null) {
      mockMessageDoc.get.mockResolvedValue({ exists: false });
      return;
    }
    mockMessageDoc.get.mockResolvedValue({
      exists: true,
      id: message.id,
      data: () => messageToFirestoreData(message),
    });
  };

  beforeEach(async () => {
    mockMessageDoc = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockMessagesCollection = {
      doc: jest.fn().mockReturnValue(mockMessageDoc),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ docs: [] }),
    };
    mockChatroomDoc = {
      get: jest.fn().mockResolvedValue({ exists: true }),
      collection: jest.fn().mockReturnValue(mockMessagesCollection),
    };
    mockChatroomsCollection = {
      doc: jest.fn().mockReturnValue(mockChatroomDoc),
    };
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockChatroomsCollection),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatMessagesService,
        { provide: FirebaseService, useValue: { getFirestore: jest.fn().mockReturnValue(mockFirestore) } },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();
    service = module.get<ChatMessagesService>(ChatMessagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all messages for a chatroom', async () => {
      configureFindAllMessages(mockMessages);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      const result = await service.findAll('chatroom1', 50, 'user1');
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Test Message 1');
      expect(result[1].content).toBe('Test Message 2');
      expect(mockMessagesCollection.limit).toHaveBeenCalledWith(50);
    });

    it('should set isEditable to true for own messages', async () => {
      const ownMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user1',
      });
      configureFindAllMessages([ownMessage]);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      const result = await service.findAll('chatroom1', 50, 'user1');
      expect(result).toBeDefined();
      expect(result[0].isEditable).toBe(true);
    });

    it('should set isEditable to false for other users messages', async () => {
      const otherMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user2',
      });
      configureFindAllMessages([otherMessage]);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      const result = await service.findAll('chatroom1', 50, 'user1');
      expect(result).toBeDefined();
      expect(result[0].isEditable).toBe(false);
    });

    it('should set isEditable to true for super admin on all messages', async () => {
      const otherMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user2',
      });
      configureFindAllMessages([otherMessage]);
      mockUsersService.getById.mockResolvedValue({
        id: 'superAdmin1',
        userType: UserType.SUPER_ADMIN,
      });
      const result = await service.findAll('chatroom1', 50, 'superAdmin1');
      expect(result).toBeDefined();
      expect(result[0].isEditable).toBe(true);
    });

    it('should return limited messages when limit is provided', async () => {
      configureFindAllMessages([mockMessages[0]]);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      const result = await service.findAll('chatroom1', 1, 'user1');
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(mockMessagesCollection.limit).toHaveBeenCalledWith(1);
    });
  });

  describe('findOne', () => {
    it('should return a message by id', async () => {
      configureFindMessageById(mockMessages[0]);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      const result = await service.findOne('chatroom1', 'message1', 'user1');
      expect(result).toBeDefined();
      expect(result.id).toBe('message1');
      expect(result.content).toBe('Test Message 1');
      expect(mockMessagesCollection.doc).toHaveBeenCalledWith('message1');
    });

    it('should set isEditable to true for own message', async () => {
      const ownMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user1',
      });
      configureFindMessageById(ownMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      const result = await service.findOne('chatroom1', 'message1', 'user1');
      expect(result.isEditable).toBe(true);
    });

    it('should set isEditable to true for super admin', async () => {
      const otherMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user2',
      });
      configureFindMessageById(otherMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'superAdmin1',
        userType: UserType.SUPER_ADMIN,
      });
      const result = await service.findOne('chatroom1', 'message1', 'superAdmin1');
      expect(result.isEditable).toBe(true);
    });

    it('should throw NotFoundException if message not found', async () => {
      configureFindMessageById(null);
      await expect(service.findOne('chatroom1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      content: 'New Message',
    };

    it('should create a new message', async () => {
      const mockUser = {
        id: 'user1',
        name: 'User 1',
        userType: UserType.USER,
      };
      configureChatroomExists(true);
      mockUsersService.getById.mockResolvedValue(mockUser);
      const result = await service.create('chatroom1', 'user1', createDto);
      expect(result).toBeDefined();
      expect(result.content).toBe(createDto.content);
      expect(result.senderId).toBe('user1');
      expect(result.senderName).toBe('User 1');
      expect(result.isEditable).toBe(true);
      expect(mockMessageDoc.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.getById.mockResolvedValue(null);
      await expect(service.create('chatroom1', 'user1', createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      content: 'Updated Message',
    };

    it('should update an existing message when user is owner', async () => {
      const existingMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user1',
      });
      configureFindMessageById(existingMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      const result = await service.update('chatroom1', 'message1', updateDto, 'user1');
      expect(result).toBeDefined();
      expect(result.id).toBe('message1');
      expect(result.content).toBe(updateDto.content);
      expect(mockMessageDoc.update).toHaveBeenCalled();
    });

    it('should update message when user is super admin', async () => {
      const existingMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user2',
      });
      configureFindMessageById(existingMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'superAdmin1',
        userType: UserType.SUPER_ADMIN,
      });
      const result = await service.update('chatroom1', 'message1', updateDto, 'superAdmin1');
      expect(result).toBeDefined();
      expect(result.content).toBe(updateDto.content);
      expect(mockMessageDoc.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user is not owner and not super admin', async () => {
      const existingMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user2',
      });
      configureFindMessageById(existingMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      await expect(
        service.update('chatroom1', 'message1', updateDto, 'user1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if message not found', async () => {
      configureFindMessageById(null);
      await expect(service.update('chatroom1', 'nonexistent', updateDto, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a message', async () => {
      configureChatroomExists(true);
      await service.delete('chatroom1', 'message1');
      expect(mockMessagesCollection.doc).toHaveBeenCalledWith('message1');
      expect(mockMessageDoc.delete).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a message if user is sender', async () => {
      const ownMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user1',
      });
      configureFindMessageById(ownMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      await service.remove('chatroom1', 'message1', 'user1');
      expect(mockMessagesCollection.doc).toHaveBeenCalledWith('message1');
      expect(mockMessageDoc.delete).toHaveBeenCalled();
    });

    it('should remove a message if user is super admin', async () => {
      const otherMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user2',
      });
      configureFindMessageById(otherMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'superAdmin1',
        userType: UserType.SUPER_ADMIN,
      });
      await service.remove('chatroom1', 'message1', 'superAdmin1');
      expect(mockMessagesCollection.doc).toHaveBeenCalledWith('message1');
      expect(mockMessageDoc.delete).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user is not sender and not super admin', async () => {
      const otherMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user2',
      });
      configureFindMessageById(otherMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      await expect(service.remove('chatroom1', 'message1', 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('addReaction', () => {
    const reactionDto: UpdateChatMessageReactionDto = {
      type: ReactionType.LIKE,
    };

    it('should add a reaction to a message', async () => {
      configureFindMessageById(mockMessages[0]);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      const result = await service.addReaction('chatroom1', 'message1', 'user1', reactionDto);
      expect(result).toBeDefined();
      expect(result.reactions).toHaveLength(1);
      expect(result.reactions![0].userId).toBe('user1');
      expect(result.reactions![0].type).toBe(ReactionType.LIKE);
      expect(mockMessageDoc.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if message not found', async () => {
      configureFindMessageById(null);
      await expect(
        service.addReaction('chatroom1', 'nonexistent', 'user1', reactionDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction from a message', async () => {
      const messageWithReaction = ChatMessage.fromProps({
        ...mockMessages[0],
        reactions: [{ userId: 'user1', type: ReactionType.LIKE }],
      });
      configureFindMessageById(messageWithReaction);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });
      const result = await service.removeReaction('chatroom1', 'message1', 'user1');
      expect(result).toBeDefined();
      expect(result.reactions).toHaveLength(0);
      expect(mockMessageDoc.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if message not found', async () => {
      configureFindMessageById(null);
      await expect(service.removeReaction('chatroom1', 'nonexistent', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('adminUpdate', () => {
    it('should update a message as admin', async () => {
      const updateDto = {
        content: 'Admin Updated Message',
      };
      configureFindMessageById(mockMessages[0]);
      const result = await service.adminUpdate('chatroom1', 'message1', updateDto);
      expect(result).toBeDefined();
      expect(result.content).toBe(updateDto.content);
      expect(result.editedByAdmin).toBe(true);
      expect(mockMessageDoc.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if message not found', async () => {
      configureChatroomExists(true);
      configureFindMessageById(null);
      await expect(
        service.adminUpdate('chatroom1', 'nonexistent', { content: 'New Content' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adminRemove', () => {
    it('should remove a message as admin', async () => {
      configureChatroomExists(true);
      await service.adminRemove('chatroom1', 'message1');
      expect(mockMessagesCollection.doc).toHaveBeenCalledWith('message1');
      expect(mockMessageDoc.delete).toHaveBeenCalled();
    });
  });
});
