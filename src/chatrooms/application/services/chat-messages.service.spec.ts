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
import { ReactionType, UpdateMessageReactionDto } from '../dtos/update-message-reaction.dto';

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

  describe('getAll', () => {
    it('should return all messages for a chatroom', async () => {
      mockChatMessageRepository.findAll.mockResolvedValue(mockMessages);

      const result = await service.findAll('chatroom1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Test Message 1');
      expect(result[1].content).toBe('Test Message 2');
      expect(mockChatMessageRepository.findAll).toHaveBeenCalledWith('chatroom1', undefined);
    });

    it('should return limited messages when limit is provided', async () => {
      mockChatMessageRepository.findAll.mockResolvedValue([mockMessages[0]]);

      const result = await service.findAll('chatroom1', 1);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(mockChatMessageRepository.findAll).toHaveBeenCalledWith('chatroom1', 1);
    });
  });

  describe('getById', () => {
    it('should return a message by id', async () => {
      mockChatMessageRepository.findById.mockResolvedValue(mockMessages[0]);

      const result = await service.findOne('chatroom1', 'message1');

      expect(result).toBeDefined();
      expect(result.id).toBe('message1');
      expect(result.content).toBe('Test Message 1');
      expect(mockChatMessageRepository.findById).toHaveBeenCalledWith('chatroom1', 'message1');
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

    it('should update an existing message', async () => {
      const updatedMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        content: updateDto.content,
        updatedAt: new Date().toISOString(),
      });

      mockChatMessageRepository.update.mockResolvedValue(updatedMessage);

      const result = await service.update('chatroom1', 'message1', updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('message1');
      expect(result.content).toBe(updateDto.content);
      expect(mockChatMessageRepository.update).toHaveBeenCalledWith(
        'chatroom1',
        'message1',
        updateDto,
      );
    });

    it('should throw NotFoundException if message not found', async () => {
      mockChatMessageRepository.update.mockResolvedValue(null);

      await expect(service.update('chatroom1', 'nonexistent', updateDto)).rejects.toThrow(
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

  describe('findByChatroom', () => {
    it('should return messages for a chatroom', async () => {
      mockChatMessageRepository.findByChatroom.mockResolvedValue(mockMessages);

      const result = await service.findAll('chatroom1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(mockChatMessageRepository.findByChatroom).toHaveBeenCalledWith('chatroom1');
    });
  });

  describe('addReaction', () => {
    const reactionDto: UpdateMessageReactionDto = {
      type: ReactionType.LIKE,
    };

    it('should add a reaction to a message', async () => {
      const updatedMessage = ChatMessage.fromProps({
        ...mockMessages[0],
        reactions: [{ userId: 'user1', type: ReactionType.LIKE }],
        updatedAt: new Date().toISOString(),
      });

      mockChatMessageRepository.addReaction.mockResolvedValue(updatedMessage);

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

  describe('findAll', () => {
    it('should return messages from Firestore', async () => {
      const mockFirestore = {};
      mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);

      const mockCollection = {};
      (collection as jest.Mock).mockReturnValue(mockCollection);

      const mockQuery = {};
      (query as jest.Mock).mockReturnValue(mockQuery);
      (orderBy as jest.Mock).mockReturnThis();
      (limit as jest.Mock).mockReturnThis();

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockMessages.map(msg => ({
          id: msg.id,
          data: () => ({
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.senderName,
            reactions: msg.reactions,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt,
          }),
        })),
      });

      const result = await service.findAll('chatroom1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(collection).toHaveBeenCalledWith(mockFirestore, 'chatrooms/chatroom1/messages');
      expect(query).toHaveBeenCalled();
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(limit).toHaveBeenCalledWith(50);
    });
  });

  describe('findOne', () => {
    it('should return a message from Firestore', async () => {
      const mockFirestore = {};
      mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);

      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'message1',
        data: () => ({
          content: 'Test Message 1',
          senderId: 'user1',
          senderName: 'User 1',
          reactions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      const result = await service.findOne('chatroom1', 'message1');

      expect(result).toBeDefined();
      expect(result.id).toBe('message1');
      expect(result.content).toBe('Test Message 1');
      expect(doc).toHaveBeenCalledWith(mockFirestore, 'chatrooms/chatroom1/messages', 'message1');
    });

    it('should throw NotFoundException if message not found', async () => {
      const mockFirestore = {};
      mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);

      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      await expect(service.findOne('chatroom1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a message if user is sender', async () => {
      const mockFirestore = {};
      mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);

      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'message1',
        data: () => ({
          content: 'Test Message 1',
          senderId: 'user1',
          senderName: 'User 1',
          reactions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      await service.remove('chatroom1', 'message1', 'user1');

      expect(doc).toHaveBeenCalledWith(mockFirestore, 'chatrooms/chatroom1/messages', 'message1');
      expect(deleteDoc).toHaveBeenCalledWith(mockDoc);
    });

    it('should throw BadRequestException if user is not sender', async () => {
      const mockFirestore = {};
      mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);

      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'message1',
        data: () => ({
          content: 'Test Message 1',
          senderId: 'user2',
          senderName: 'User 2',
          reactions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });

      await expect(service.remove('chatroom1', 'message1', 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('adminUpdate', () => {
    xit('should update a message as admin', async () => {
      const mockFirestore = createFirestoreMock({
        ...mockMessages[0],
        editedByAdmin: false,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const updateDto = {
        content: 'Admin Updated Message',
      };

      const result = await service.adminUpdate('chatroom1', 'message1', updateDto);

      expect(result).toBeDefined();
      expect(result.content).toBe(updateDto.content);
      expect(result.editedByAdmin).toBe(true);
      expect(mockFirestore.collection().doc().update).toHaveBeenCalledWith({
        content: updateDto.content,
        editedByAdmin: true,
        updatedAt: expect.any(String),
      });
    });
  });

  describe('adminRemove', () => {
    it('should remove a message as admin', async () => {
      const mockFirestore = {};
      mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);

      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);

      await service.adminRemove('chatroom1', 'message1');

      expect(doc).toHaveBeenCalledWith(mockFirestore, 'chatrooms/chatroom1/messages', 'message1');
      expect(deleteDoc).toHaveBeenCalledWith(mockDoc);
    });
  });
});
