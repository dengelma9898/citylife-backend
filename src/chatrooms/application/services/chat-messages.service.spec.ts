import { Test, TestingModule } from '@nestjs/testing';
import { ChatMessagesService } from './chat-messages.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { UsersService } from '../../../users/users.service';
import { CHAT_MESSAGE_REPOSITORY } from '../../domain/repositories/chat-message.repository';
import { ChatMessage } from '../../domain/entities/chat-message.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { ReactionType, UpdateChatMessageReactionDto } from '../dtos/update-message-reaction.dto';
import { UserType } from '../../../users/enums/user-type.enum';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

describe('ChatMessagesService', () => {
  let service: ChatMessagesService;
  let firebaseService: any;
  let usersService: any;
  let chatMessageRepository: any;

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

    return {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
  };

  const mockFirebaseService = {
    getClientFirestore: jest.fn(),
    getFirestore: jest.fn(),
  };

  const mockUsersService = {
    getById: jest.fn(),
  };

  const mockChatMessageRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByChatroom: jest.fn(),
    addReaction: jest.fn(),
    removeReaction: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatMessagesService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: CHAT_MESSAGE_REPOSITORY,
          useValue: mockChatMessageRepository,
        },
      ],
    }).compile();

    service = module.get<ChatMessagesService>(ChatMessagesService);
    firebaseService = module.get(FirebaseService);
    usersService = module.get(UsersService);
    chatMessageRepository = module.get(CHAT_MESSAGE_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all messages for a chatroom', async () => {
      mockChatMessageRepository.findAll.mockResolvedValue(mockMessages);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });

      const result = await service.findAll('chatroom1', 50, 'user1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Test Message 1');
      expect(result[1].content).toBe('Test Message 2');
      expect(mockChatMessageRepository.findAll).toHaveBeenCalledWith('chatroom1', 50);
    });

    it('should set isEditable to true for own messages', async () => {
      const ownMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user1',
      });
      mockChatMessageRepository.findAll.mockResolvedValue([ownMessage]);
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
      mockChatMessageRepository.findAll.mockResolvedValue([otherMessage]);
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
      mockChatMessageRepository.findAll.mockResolvedValue([otherMessage]);
      mockUsersService.getById.mockResolvedValue({
        id: 'superAdmin1',
        userType: UserType.SUPER_ADMIN,
      });

      const result = await service.findAll('chatroom1', 50, 'superAdmin1');

      expect(result).toBeDefined();
      expect(result[0].isEditable).toBe(true);
    });

    it('should return limited messages when limit is provided', async () => {
      mockChatMessageRepository.findAll.mockResolvedValue([mockMessages[0]]);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });

      const result = await service.findAll('chatroom1', 1, 'user1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(mockChatMessageRepository.findAll).toHaveBeenCalledWith('chatroom1', 1);
    });
  });

  describe('findOne', () => {
    it('should return a message by id', async () => {
      mockChatMessageRepository.findById.mockResolvedValue(mockMessages[0]);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });

      const result = await service.findOne('chatroom1', 'message1', 'user1');

      expect(result).toBeDefined();
      expect(result.id).toBe('message1');
      expect(result.content).toBe('Test Message 1');
      expect(mockChatMessageRepository.findById).toHaveBeenCalledWith('chatroom1', 'message1');
    });

    it('should set isEditable to true for own message', async () => {
      const ownMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user1',
      });
      mockChatMessageRepository.findById.mockResolvedValue(ownMessage);
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
      mockChatMessageRepository.findById.mockResolvedValue(otherMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'superAdmin1',
        userType: UserType.SUPER_ADMIN,
      });

      const result = await service.findOne('chatroom1', 'message1', 'superAdmin1');

      expect(result.isEditable).toBe(true);
    });

    it('should throw NotFoundException if message not found', async () => {
      mockChatMessageRepository.findById.mockResolvedValue(null);

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

      mockUsersService.getById.mockResolvedValue(mockUser);

      const mockCreatedMessage = ChatMessage.create({
        content: createDto.content,
        senderId: 'user1',
        senderName: 'User 1',
        reactions: [],
      });

      mockChatMessageRepository.create.mockResolvedValue(mockCreatedMessage);

      const result = await service.create('chatroom1', 'user1', createDto);

      expect(result).toBeDefined();
      expect(result.content).toBe(createDto.content);
      expect(result.senderId).toBe('user1');
      expect(result.senderName).toBe('User 1');
      expect(result.isEditable).toBe(true);
      expect(mockChatMessageRepository.create).toHaveBeenCalled();
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
      const updatedMessage = ChatMessage.fromProps({
        ...existingMessage,
        content: updateDto.content,
        updatedAt: new Date().toISOString(),
      });

      mockChatMessageRepository.findById.mockResolvedValue(existingMessage);
      mockChatMessageRepository.update.mockResolvedValue(updatedMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });

      const result = await service.update('chatroom1', 'message1', updateDto, 'user1');

      expect(result).toBeDefined();
      expect(result.id).toBe('message1');
      expect(result.content).toBe(updateDto.content);
      expect(mockChatMessageRepository.update).toHaveBeenCalledWith(
        'chatroom1',
        'message1',
        updateDto,
      );
    });

    it('should update message when user is super admin', async () => {
      const existingMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user2',
      });
      const updatedMessage = ChatMessage.fromProps({
        ...existingMessage,
        content: updateDto.content,
        updatedAt: new Date().toISOString(),
      });

      mockChatMessageRepository.findById.mockResolvedValue(existingMessage);
      mockChatMessageRepository.update.mockResolvedValue(updatedMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'superAdmin1',
        userType: UserType.SUPER_ADMIN,
      });

      const result = await service.update('chatroom1', 'message1', updateDto, 'superAdmin1');

      expect(result).toBeDefined();
      expect(result.content).toBe(updateDto.content);
      expect(mockChatMessageRepository.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user is not owner and not super admin', async () => {
      const existingMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user2',
      });

      mockChatMessageRepository.findById.mockResolvedValue(existingMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });

      await expect(
        service.update('chatroom1', 'message1', updateDto, 'user1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if message not found', async () => {
      mockChatMessageRepository.findById.mockResolvedValue(null);

      await expect(service.update('chatroom1', 'nonexistent', updateDto, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a message', async () => {
      mockChatMessageRepository.delete.mockResolvedValue(undefined);

      await service.delete('chatroom1', 'message1');

      expect(mockChatMessageRepository.delete).toHaveBeenCalledWith('chatroom1', 'message1');
    });
  });

  describe('remove', () => {
    it('should remove a message if user is sender', async () => {
      const ownMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user1',
      });
      mockChatMessageRepository.findById.mockResolvedValue(ownMessage);
      mockChatMessageRepository.delete.mockResolvedValue(undefined);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });

      await service.remove('chatroom1', 'message1', 'user1');

      expect(mockChatMessageRepository.findById).toHaveBeenCalledWith('chatroom1', 'message1');
      expect(mockChatMessageRepository.delete).toHaveBeenCalledWith('chatroom1', 'message1');
    });

    it('should remove a message if user is super admin', async () => {
      const otherMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user2',
      });
      mockChatMessageRepository.findById.mockResolvedValue(otherMessage);
      mockChatMessageRepository.delete.mockResolvedValue(undefined);
      mockUsersService.getById.mockResolvedValue({
        id: 'superAdmin1',
        userType: UserType.SUPER_ADMIN,
      });

      await service.remove('chatroom1', 'message1', 'superAdmin1');

      expect(mockChatMessageRepository.findById).toHaveBeenCalledWith('chatroom1', 'message1');
      expect(mockChatMessageRepository.delete).toHaveBeenCalledWith('chatroom1', 'message1');
    });

    it('should throw BadRequestException if user is not sender and not super admin', async () => {
      const otherMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        senderId: 'user2',
      });
      mockChatMessageRepository.findById.mockResolvedValue(otherMessage);
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
      const updatedMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        reactions: [{ userId: 'user1', type: ReactionType.LIKE }],
        updatedAt: new Date().toISOString(),
      });

      mockChatMessageRepository.addReaction.mockResolvedValue(updatedMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });

      const result = await service.addReaction('chatroom1', 'message1', 'user1', reactionDto);

      expect(result).toBeDefined();
      expect(result.reactions).toHaveLength(1);
      expect(result.reactions![0].userId).toBe('user1');
      expect(result.reactions![0].type).toBe(ReactionType.LIKE);
      expect(mockChatMessageRepository.addReaction).toHaveBeenCalledWith(
        'chatroom1',
        'message1',
        'user1',
        reactionDto,
      );
    });

    it('should throw NotFoundException if message not found', async () => {
      mockChatMessageRepository.addReaction.mockResolvedValue(null);

      await expect(
        service.addReaction('chatroom1', 'nonexistent', 'user1', reactionDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeReaction', () => {
    it('should remove a reaction from a message', async () => {
      const updatedMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        reactions: [],
        updatedAt: new Date().toISOString(),
      });

      mockChatMessageRepository.removeReaction.mockResolvedValue(updatedMessage);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        userType: UserType.USER,
      });

      const result = await service.removeReaction('chatroom1', 'message1', 'user1');

      expect(result).toBeDefined();
      expect(result.reactions).toHaveLength(0);
      expect(mockChatMessageRepository.removeReaction).toHaveBeenCalledWith(
        'chatroom1',
        'message1',
        'user1',
      );
    });

    it('should throw NotFoundException if message not found', async () => {
      mockChatMessageRepository.removeReaction.mockResolvedValue(null);

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

      const updatedMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        content: updateDto.content,
        updatedAt: new Date().toISOString(),
        editedAt: new Date().toISOString(),
        editedByAdmin: true,
      });

      mockChatMessageRepository.update.mockResolvedValue(updatedMessage);
      mockUsersService.getById.mockResolvedValue(null);

      const result = await service.adminUpdate('chatroom1', 'message1', updateDto);

      expect(result).toBeDefined();
      expect(result.content).toBe(updateDto.content);
      expect(result.editedByAdmin).toBe(true);
      expect(mockChatMessageRepository.update).toHaveBeenCalledWith('chatroom1', 'message1', {
        content: updateDto.content,
        updatedAt: expect.any(String),
        editedAt: expect.any(String),
        editedByAdmin: true,
      });
    });

    it('should throw NotFoundException if message not found', async () => {
      mockChatMessageRepository.update.mockResolvedValue(null);

      await expect(
        service.adminUpdate('chatroom1', 'nonexistent', { content: 'New Content' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adminRemove', () => {
    it('should remove a message as admin', async () => {
      mockChatMessageRepository.delete.mockResolvedValue(undefined);

      await service.adminRemove('chatroom1', 'message1');

      expect(mockChatMessageRepository.delete).toHaveBeenCalledWith('chatroom1', 'message1');
    });
  });
});
