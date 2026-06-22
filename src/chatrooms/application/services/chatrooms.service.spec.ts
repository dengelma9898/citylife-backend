import { Test, TestingModule } from '@nestjs/testing';
import { ChatroomsService } from './chatrooms.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { Chatroom } from '../../domain/entities/chatroom.entity';
import { NotFoundException } from '@nestjs/common';

describe('ChatroomsService', () => {
  let service: ChatroomsService;
  let mockDoc: {
    get: jest.Mock;
    set: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockCollection: {
    doc: jest.Mock;
    get: jest.Mock;
    where: jest.Mock;
  };
  let mockFirestore: { collection: jest.Mock };

  const chatroomToFirestoreData = (chatroom: Chatroom): Record<string, unknown> => {
    const { id, ...data } = chatroom.toJSON();
    return data;
  };

  const mockChatrooms = [
    Chatroom.fromProps({
      id: 'chatroom1',
      title: 'Test Chatroom 1',
      description: 'Description 1',
      imageUrl: 'image1.jpg',
      createdBy: 'user1',
      participants: ['user1', 'user2'],
      participantCount: 2,
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
      participantCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  ];

  beforeEach(async () => {
    mockDoc = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      get: jest.fn().mockResolvedValue({ docs: [] }),
      where: jest.fn().mockReturnThis(),
    };
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatroomsService,
        { provide: FirebaseService, useValue: { getFirestore: jest.fn().mockReturnValue(mockFirestore) } },
      ],
    }).compile();
    service = module.get<ChatroomsService>(ChatroomsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all chatrooms with participantCount', async () => {
      mockCollection.get.mockResolvedValue({
        docs: mockChatrooms.map(chatroom => ({
          id: chatroom.id,
          data: () => chatroomToFirestoreData(chatroom),
        })),
      });
      const result = await service.getAll();
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Chatroom 1');
      expect(result[0].participantCount).toBe(2);
      expect(result[1].title).toBe('Test Chatroom 2');
      expect(result[1].participantCount).toBe(2);
      expect(mockCollection.get).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return a chatroom by id with participantCount', async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: mockChatrooms[0].id,
        data: () => chatroomToFirestoreData(mockChatrooms[0]),
      });
      const result = await service.getById('chatroom1');
      expect(result).toBeDefined();
      expect(result.id).toBe('chatroom1');
      expect(result.title).toBe('Test Chatroom 1');
      expect(result.participantCount).toBe(2);
      expect(mockCollection.doc).toHaveBeenCalledWith('chatroom1');
    });

    it('should throw NotFoundException if chatroom not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockCollection.doc).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('create', () => {
    const createDto = {
      title: 'New Chatroom',
      description: 'New Description',
      image: 'new-image.jpg',
    };

    it('should create a new chatroom', async () => {
      const result = await service.create(createDto, 'user1');
      expect(result).toBeDefined();
      expect(result.title).toBe(createDto.title);
      expect(result.description).toBe(createDto.description);
      expect(result.imageUrl).toBe(createDto.image);
      expect(result.createdBy).toBe('user1');
      expect(result.participants).toContain('user1');
      expect(result.participantCount).toBe(1);
      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = {
      title: 'Updated Chatroom',
      description: 'Updated Description',
    };

    it('should update an existing chatroom', async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: mockChatrooms[0].id,
        data: () => chatroomToFirestoreData(mockChatrooms[0]),
      });
      const result = await service.update('chatroom1', updateDto);
      expect(result).toBeDefined();
      expect(result.id).toBe('chatroom1');
      expect(result.title).toBe(updateDto.title);
      expect(result.description).toBe(updateDto.description);
      expect(result.participantCount).toBe(2);
      expect(mockDoc.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if chatroom not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a chatroom', async () => {
      await service.remove('chatroom1');
      expect(mockCollection.doc).toHaveBeenCalledWith('chatroom1');
      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });

  describe('findByParticipant', () => {
    it('should return chatrooms for a participant with participantCount', async () => {
      mockCollection.get.mockResolvedValue({
        docs: [
          {
            id: mockChatrooms[0].id,
            data: () => chatroomToFirestoreData(mockChatrooms[0]),
          },
        ],
      });
      const result = await service.findByParticipant('user1');
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].participants).toContain('user1');
      expect(result[0].participantCount).toBe(2);
      expect(mockCollection.where).toHaveBeenCalledWith('participants', 'array-contains', 'user1');
    });
  });

  describe('updateImage', () => {
    it('should update chatroom image', async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: mockChatrooms[0].id,
        data: () => chatroomToFirestoreData(mockChatrooms[0]),
      });
      const result = await service.updateImage('chatroom1', 'new-image.jpg');
      expect(result).toBeDefined();
      expect(result.id).toBe('chatroom1');
      expect(result.imageUrl).toBe('new-image.jpg');
      expect(result.participantCount).toBe(2);
      expect(mockDoc.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if chatroom not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      await expect(service.updateImage('nonexistent', 'new-image.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
