import { Test, TestingModule } from '@nestjs/testing';
import { ChatroomsController } from './chatrooms.controller';
import { ChatroomsService } from '../services/chatrooms.service';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';
import { CreateChatroomDto } from '../dtos/create-chatroom.dto';
import { UpdateChatroomDto } from '../dtos/update-chatroom.dto';
import { NotFoundException } from '@nestjs/common';

describe('ChatroomsController', () => {
  let controller: ChatroomsController;
  let chatroomsService: ChatroomsService;
  let firebaseStorageService: FirebaseStorageService;

  const mockChatroomsService = {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateImage: jest.fn(),
  };

  const mockFirebaseStorageService = {
    deleteFile: jest.fn(),
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatroomsController],
      providers: [
        {
          provide: ChatroomsService,
          useValue: mockChatroomsService,
        },
        {
          provide: FirebaseStorageService,
          useValue: mockFirebaseStorageService,
        },
      ],
    }).compile();

    controller = module.get<ChatroomsController>(ChatroomsController);
    chatroomsService = module.get<ChatroomsService>(ChatroomsService);
    firebaseStorageService = module.get<FirebaseStorageService>(FirebaseStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all chatrooms', async () => {
      const mockChatrooms = [
        {
          id: 'chatroom1',
          title: 'Test Chatroom 1',
          description: 'Description 1',
          imageUrl: 'image1.jpg',
          createdBy: 'user1',
          participants: ['user1'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockChatroomsService.getAll.mockResolvedValue(mockChatrooms);

      const result = await controller.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Chatroom 1');
      expect(mockChatroomsService.getAll).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return a chatroom by id', async () => {
      const mockChatroom = {
        id: 'chatroom1',
        title: 'Test Chatroom 1',
        description: 'Description 1',
        imageUrl: 'image1.jpg',
        createdBy: 'user1',
        participants: ['user1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockChatroomsService.getById.mockResolvedValue(mockChatroom);

      const result = await controller.getById('chatroom1');

      expect(result).toBeDefined();
      expect(result.id).toBe('chatroom1');
      expect(result.title).toBe('Test Chatroom 1');
      expect(mockChatroomsService.getById).toHaveBeenCalledWith('chatroom1');
    });
  });

  describe('create', () => {
    const createDto: CreateChatroomDto = {
      title: 'New Chatroom',
      description: 'New Description',
    };

    it('should create a new chatroom', async () => {
      const mockChatroom = {
        id: 'chatroom1',
        ...createDto,
        imageUrl: null,
        createdBy: 'user1',
        participants: ['user1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockChatroomsService.create.mockResolvedValue(mockChatroom);

      const result = await controller.create(createDto, 'user1');

      expect(result).toBeDefined();
      expect(result.title).toBe(createDto.title);
      expect(result.description).toBe(createDto.description);
      expect(mockChatroomsService.create).toHaveBeenCalledWith(createDto, 'user1');
    });
  });

  describe('update', () => {
    const updateDto: UpdateChatroomDto = {
      title: 'Updated Chatroom',
      image: 'image1.jpg',
    };

    it('should update a chatroom', async () => {
      const mockChatroom = {
        id: 'chatroom1',
        title: 'Updated Chatroom',
        imageUrl: 'image1.jpg',
        description: 'Description',
        createdBy: 'user1',
        participants: ['user1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockChatroomsService.getById.mockResolvedValue(mockChatroom);
      mockChatroomsService.update.mockResolvedValue(mockChatroom);

      const result = await controller.update('chatroom1', updateDto);

      expect(result).toBeDefined();
      expect(result.title).toBe(updateDto.title);
      expect(result.imageUrl).toBe(updateDto.image);
      expect(mockChatroomsService.update).toHaveBeenCalledWith('chatroom1', {
        title: 'Updated Chatroom',
        imageUrl: 'image1.jpg',
      });
    });

    it('should delete image from storage when image is null', async () => {
      const currentChatroom = {
        id: 'chatroom1',
        title: 'Test Chatroom',
        description: 'Description',
        imageUrl: 'old-image.jpg',
        createdBy: 'user1',
        participants: ['user1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updateDtoWithNullImage: UpdateChatroomDto = {
        title: 'Updated Chatroom',
        image: null,
      };

      const updatedChatroom = {
        ...currentChatroom,
        title: 'Updated Chatroom',
        imageUrl: null,
      };

      mockChatroomsService.getById.mockResolvedValue(currentChatroom);
      mockFirebaseStorageService.deleteFile.mockResolvedValue(undefined);
      mockChatroomsService.update.mockResolvedValue(updatedChatroom);

      const result = await controller.update('chatroom1', updateDtoWithNullImage);

      expect(result).toBeDefined();
      expect(result.imageUrl).toBeNull();
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith('old-image.jpg');
      expect(mockChatroomsService.update).toHaveBeenCalledWith('chatroom1', {
        title: 'Updated Chatroom',
        imageUrl: null,
      });
    });

    it('should delete image from storage when image is empty string', async () => {
      const currentChatroom = {
        id: 'chatroom1',
        title: 'Test Chatroom',
        description: 'Description',
        imageUrl: 'old-image.jpg',
        createdBy: 'user1',
        participants: ['user1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updateDtoWithEmptyImage: UpdateChatroomDto = {
        title: 'Updated Chatroom',
        image: '',
      };

      const updatedChatroom = {
        ...currentChatroom,
        title: 'Updated Chatroom',
        imageUrl: null,
      };

      mockChatroomsService.getById.mockResolvedValue(currentChatroom);
      mockFirebaseStorageService.deleteFile.mockResolvedValue(undefined);
      mockChatroomsService.update.mockResolvedValue(updatedChatroom);

      const result = await controller.update('chatroom1', updateDtoWithEmptyImage);

      expect(result).toBeDefined();
      expect(result.imageUrl).toBeNull();
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith('old-image.jpg');
      expect(mockChatroomsService.update).toHaveBeenCalledWith('chatroom1', {
        title: 'Updated Chatroom',
        imageUrl: null,
      });
    });

    it('should not delete image if no image exists when setting to null', async () => {
      const currentChatroom = {
        id: 'chatroom1',
        title: 'Test Chatroom',
        description: 'Description',
        imageUrl: null,
        createdBy: 'user1',
        participants: ['user1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updateDtoWithNullImage: UpdateChatroomDto = {
        title: 'Updated Chatroom',
        image: null,
      };

      const updatedChatroom = {
        ...currentChatroom,
        title: 'Updated Chatroom',
      };

      mockChatroomsService.getById.mockResolvedValue(currentChatroom);
      mockChatroomsService.update.mockResolvedValue(updatedChatroom);

      const result = await controller.update('chatroom1', updateDtoWithNullImage);

      expect(result).toBeDefined();
      expect(mockFirebaseStorageService.deleteFile).not.toHaveBeenCalled();
      expect(mockChatroomsService.update).toHaveBeenCalledWith('chatroom1', {
        title: 'Updated Chatroom',
        imageUrl: null,
      });
    });

    it('should throw NotFoundException if chatroom not found when deleting image', async () => {
      const updateDtoWithNullImage: UpdateChatroomDto = {
        title: 'Updated Chatroom',
        image: null,
      };

      mockChatroomsService.getById.mockResolvedValue(null);

      await expect(controller.update('nonexistent', updateDtoWithNullImage)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a chatroom', async () => {
      mockChatroomsService.remove.mockResolvedValue(undefined);

      await controller.remove('chatroom1');

      expect(mockChatroomsService.remove).toHaveBeenCalledWith('chatroom1');
    });
  });

  describe('updateImage', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 1024,
    } as Express.Multer.File;

    it('should update chatroom image', async () => {
      const mockChatroom = {
        id: 'chatroom1',
        title: 'Test Chatroom',
        description: 'Description',
        imageUrl: 'old-image.jpg',
        createdBy: 'user1',
        participants: ['user1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newImageUrl = 'new-image.jpg';

      mockChatroomsService.getById.mockResolvedValue(mockChatroom);
      mockFirebaseStorageService.uploadFile.mockResolvedValue(newImageUrl);
      mockChatroomsService.updateImage.mockResolvedValue({
        ...mockChatroom,
        imageUrl: newImageUrl,
      });

      const result = await controller.updateImage('chatroom1', mockFile);

      expect(result).toBeDefined();
      expect(result.imageUrl).toBe(newImageUrl);
      expect(mockFirebaseStorageService.deleteFile).toHaveBeenCalledWith('old-image.jpg');
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalled();
      expect(mockChatroomsService.updateImage).toHaveBeenCalledWith('chatroom1', newImageUrl);
    });

    it('should throw NotFoundException if chatroom not found', async () => {
      mockChatroomsService.getById.mockResolvedValue(null);

      await expect(controller.updateImage('nonexistent', mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not delete old image if no image exists', async () => {
      const mockChatroom = {
        id: 'chatroom1',
        title: 'Test Chatroom',
        description: 'Description',
        imageUrl: null,
        createdBy: 'user1',
        participants: ['user1'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newImageUrl = 'new-image.jpg';

      mockChatroomsService.getById.mockResolvedValue(mockChatroom);
      mockFirebaseStorageService.uploadFile.mockResolvedValue(newImageUrl);
      mockChatroomsService.updateImage.mockResolvedValue({
        ...mockChatroom,
        imageUrl: newImageUrl,
      });

      const result = await controller.updateImage('chatroom1', mockFile);

      expect(result).toBeDefined();
      expect(result.imageUrl).toBe(newImageUrl);
      expect(mockFirebaseStorageService.deleteFile).not.toHaveBeenCalled();
      expect(mockFirebaseStorageService.uploadFile).toHaveBeenCalled();
      expect(mockChatroomsService.updateImage).toHaveBeenCalledWith('chatroom1', newImageUrl);
    });
  });
});
