import { Test, TestingModule } from '@nestjs/testing';
import { DirectChatsService } from './direct-chats.service';
import { DirectChatRepository } from '../../domain/repositories/direct-chat.repository';
import { DirectMessageRepository } from '../../domain/repositories/direct-message.repository';
import { DirectChat } from '../../domain/entities/direct-chat.entity';
import { UsersService } from '../../../users/users.service';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('DirectChatsService', () => {
  let service: DirectChatsService;
  let directChatRepository: jest.Mocked<DirectChatRepository>;
  let directMessageRepository: jest.Mocked<DirectMessageRepository>;
  let usersService: jest.Mocked<UsersService>;
  let notificationService: jest.Mocked<NotificationService>;

  const mockDirectChatRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findPendingByInvitedUserId: jest.fn(),
    findExistingChat: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockDirectMessageRepository = {
    findById: jest.fn(),
    findByChatId: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteAllByChatId: jest.fn(),
  };

  const mockUsersService = {
    getUserProfile: jest.fn(),
    getUserProfilesByIds: jest.fn(),
    update: jest.fn(),
  };

  const mockNotificationService = {
    sendToUser: jest.fn(),
    sendToUsers: jest.fn(),
  };

  const mockUserProfile = {
    email: 'test@example.com',
    name: 'Test User',
    profilePictureUrl: 'https://example.com/pic.jpg',
    blockedUserIds: [],
    directChatIds: [],
  };

  const mockChat = DirectChat.fromProps({
    id: 'chat-1',
    creatorId: 'user-1',
    invitedUserId: 'user-2',
    creatorConfirmed: true,
    invitedConfirmed: false,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const mockActiveChat = DirectChat.fromProps({
    id: 'chat-2',
    creatorId: 'user-1',
    invitedUserId: 'user-2',
    creatorConfirmed: true,
    invitedConfirmed: true,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectChatsService,
        {
          provide: DirectChatRepository,
          useValue: mockDirectChatRepository,
        },
        {
          provide: DirectMessageRepository,
          useValue: mockDirectMessageRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<DirectChatsService>(DirectChatsService);
    directChatRepository = module.get(DirectChatRepository);
    directMessageRepository = module.get(DirectMessageRepository);
    usersService = module.get(UsersService);
    notificationService = module.get(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createChat', () => {
    it('should create a new direct chat and send notification when preference is enabled', async () => {
      const senderProfile = { ...mockUserProfile, name: 'Sender User' };
      const invitedProfile = {
        ...mockUserProfile,
        notificationPreferences: { directChatRequests: true },
      };
      mockUsersService.getUserProfile
        .mockResolvedValueOnce(senderProfile) // First call: get sender profile in createChat
        .mockResolvedValueOnce(invitedProfile) // Second call: get invited profile for block check in createChat
        .mockResolvedValueOnce(senderProfile) // Third call: get sender profile in updateUserDirectChatIds
        .mockResolvedValueOnce(invitedProfile) // Fourth call: get invited profile in updateUserDirectChatIds
        .mockResolvedValueOnce(invitedProfile); // Fifth call: get invited profile for notification check
      mockDirectChatRepository.findExistingChat.mockResolvedValue(null);
      mockDirectChatRepository.save.mockImplementation(chat => Promise.resolve(chat));
      mockUsersService.update.mockResolvedValue(mockUserProfile);
      mockNotificationService.sendToUser.mockResolvedValue(undefined);

      const result = await service.createChat('user-1', { invitedUserId: 'user-2' });

      expect(result).toBeDefined();
      expect(result.creatorId).toBe('user-1');
      expect(result.invitedUserId).toBe('user-2');
      expect(result.creatorConfirmed).toBe(true);
      expect(result.invitedConfirmed).toBe(false);
      expect(result.status).toBe('pending');
      expect(mockDirectChatRepository.save).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith('user-2', {
        title: 'Neue Chat-Anfrage',
        body: 'Sender User möchte mit dir chatten',
        data: {
          type: 'DIRECT_CHAT_REQUEST',
          chatId: result.id,
          senderId: 'user-1',
          senderName: 'Sender User',
        },
      });
    });

    it('should create a new direct chat but not send notification when preference is disabled', async () => {
      const senderProfile = { ...mockUserProfile, name: 'Sender User' };
      const invitedProfile = {
        ...mockUserProfile,
        notificationPreferences: { directChatRequests: false },
      };
      mockUsersService.getUserProfile
        .mockResolvedValueOnce(senderProfile) // First call: get sender profile in createChat
        .mockResolvedValueOnce(invitedProfile) // Second call: get invited profile for block check in createChat
        .mockResolvedValueOnce(senderProfile) // Third call: get sender profile in updateUserDirectChatIds
        .mockResolvedValueOnce(invitedProfile) // Fourth call: get invited profile in updateUserDirectChatIds
        .mockResolvedValueOnce(invitedProfile); // Fifth call: get invited profile for notification check
      mockDirectChatRepository.findExistingChat.mockResolvedValue(null);
      mockDirectChatRepository.save.mockImplementation(chat => Promise.resolve(chat));
      mockUsersService.update.mockResolvedValue(mockUserProfile);

      const result = await service.createChat('user-1', { invitedUserId: 'user-2' });

      expect(result).toBeDefined();
      expect(mockDirectChatRepository.save).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should create a new direct chat but not send notification when preference is undefined (default: false)', async () => {
      const senderProfile = { ...mockUserProfile, name: 'Sender User' };
      const invitedProfile = {
        ...mockUserProfile,
        notificationPreferences: {},
      };
      mockUsersService.getUserProfile
        .mockResolvedValueOnce(senderProfile) // First call: get sender profile in createChat
        .mockResolvedValueOnce(invitedProfile) // Second call: get invited profile for block check in createChat
        .mockResolvedValueOnce(senderProfile) // Third call: get sender profile in updateUserDirectChatIds
        .mockResolvedValueOnce(invitedProfile) // Fourth call: get invited profile in updateUserDirectChatIds
        .mockResolvedValueOnce(invitedProfile); // Fifth call: get invited profile for notification check
      mockDirectChatRepository.findExistingChat.mockResolvedValue(null);
      mockDirectChatRepository.save.mockImplementation(chat => Promise.resolve(chat));
      mockUsersService.update.mockResolvedValue(mockUserProfile);

      const result = await service.createChat('user-1', { invitedUserId: 'user-2' });

      expect(result).toBeDefined();
      expect(mockDirectChatRepository.save).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should create a new direct chat even if notification sending fails', async () => {
      const senderProfile = { ...mockUserProfile, name: 'Sender User' };
      const invitedProfile = {
        ...mockUserProfile,
        notificationPreferences: { directChatRequests: true },
      };
      mockUsersService.getUserProfile
        .mockResolvedValueOnce(senderProfile) // First call: get sender profile in createChat
        .mockResolvedValueOnce(invitedProfile) // Second call: get invited profile for block check in createChat
        .mockResolvedValueOnce(senderProfile) // Third call: get sender profile in updateUserDirectChatIds
        .mockResolvedValueOnce(invitedProfile) // Fourth call: get invited profile in updateUserDirectChatIds
        .mockResolvedValueOnce(invitedProfile); // Fifth call: get invited profile for notification check
      mockDirectChatRepository.findExistingChat.mockResolvedValue(null);
      mockDirectChatRepository.save.mockImplementation(chat => Promise.resolve(chat));
      mockUsersService.update.mockResolvedValue(mockUserProfile);
      mockNotificationService.sendToUser.mockRejectedValue(new Error('Notification failed'));

      const result = await service.createChat('user-1', { invitedUserId: 'user-2' });

      expect(result).toBeDefined();
      expect(mockDirectChatRepository.save).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).toHaveBeenCalled();
    });

    it('should use fallback name when sender name is not available', async () => {
      const senderProfile = { ...mockUserProfile, name: undefined };
      const invitedProfile = {
        ...mockUserProfile,
        notificationPreferences: { directChatRequests: true },
      };
      mockUsersService.getUserProfile
        .mockResolvedValueOnce(senderProfile) // First call: get sender profile in createChat
        .mockResolvedValueOnce(invitedProfile) // Second call: get invited profile for block check in createChat
        .mockResolvedValueOnce(senderProfile) // Third call: get sender profile in updateUserDirectChatIds
        .mockResolvedValueOnce(invitedProfile) // Fourth call: get invited profile in updateUserDirectChatIds
        .mockResolvedValueOnce(invitedProfile); // Fifth call: get invited profile for notification check
      mockDirectChatRepository.findExistingChat.mockResolvedValue(null);
      mockDirectChatRepository.save.mockImplementation(chat => Promise.resolve(chat));
      mockUsersService.update.mockResolvedValue(mockUserProfile);
      mockNotificationService.sendToUser.mockResolvedValue(undefined);

      const result = await service.createChat('user-1', { invitedUserId: 'user-2' });

      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith('user-2', {
        title: 'Neue Chat-Anfrage',
        body: 'Jemand möchte mit dir chatten',
        data: {
          type: 'DIRECT_CHAT_REQUEST',
          chatId: result.id,
          senderId: 'user-1',
          senderName: 'Jemand',
        },
      });
    });

    it('should throw BadRequestException when creating chat with yourself', async () => {
      await expect(
        service.createChat('user-1', { invitedUserId: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user is blocked', async () => {
      mockUsersService.getUserProfile.mockResolvedValueOnce({
        ...mockUserProfile,
        blockedUserIds: ['user-2'],
      });

      await expect(
        service.createChat('user-1', { invitedUserId: 'user-2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when blocked by invited user', async () => {
      mockUsersService.getUserProfile
        .mockResolvedValueOnce(mockUserProfile)
        .mockResolvedValueOnce({
          ...mockUserProfile,
          blockedUserIds: ['user-1'],
        });

      await expect(
        service.createChat('user-1', { invitedUserId: 'user-2' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when chat already exists', async () => {
      mockUsersService.getUserProfile
        .mockResolvedValueOnce(mockUserProfile)
        .mockResolvedValueOnce(mockUserProfile);
      mockDirectChatRepository.findExistingChat.mockResolvedValue(mockChat);

      await expect(
        service.createChat('user-1', { invitedUserId: 'user-2' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getChatsForUser', () => {
    it('should return all chats for a user', async () => {
      mockDirectChatRepository.findByUserId.mockResolvedValue([mockChat]);
      mockUsersService.getUserProfilesByIds.mockResolvedValue(
        new Map([['user-2', mockUserProfile]]),
      );

      const result = await service.getChatsForUser('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('chat-1');
      expect(result[0].otherParticipantName).toBe('Test User');
    });
  });

  describe('getChatById', () => {
    it('should return a chat by id', async () => {
      mockDirectChatRepository.findById.mockResolvedValue(mockChat);
      mockUsersService.getUserProfile.mockResolvedValue(mockUserProfile);

      const result = await service.getChatById('user-1', 'chat-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('chat-1');
      expect(result.otherParticipantName).toBe('Test User');
    });

    it('should throw NotFoundException when chat not found', async () => {
      mockDirectChatRepository.findById.mockResolvedValue(null);

      await expect(
        service.getChatById('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not participant', async () => {
      mockDirectChatRepository.findById.mockResolvedValue(mockChat);

      await expect(
        service.getChatById('user-3', 'chat-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmChat', () => {
    it('should confirm a pending chat', async () => {
      mockDirectChatRepository.findById.mockResolvedValue(mockChat);
      mockDirectChatRepository.update.mockImplementation(chat => Promise.resolve(chat));

      const result = await service.confirmChat('user-2', 'chat-1');

      expect(result.invitedConfirmed).toBe(true);
      expect(result.status).toBe('active');
    });

    it('should throw ForbiddenException when non-invited user tries to confirm', async () => {
      mockDirectChatRepository.findById.mockResolvedValue(mockChat);

      await expect(
        service.confirmChat('user-1', 'chat-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when chat is already confirmed', async () => {
      mockDirectChatRepository.findById.mockResolvedValue(mockActiveChat);

      await expect(
        service.confirmChat('user-2', 'chat-2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteChat', () => {
    it('should delete a chat and all its messages', async () => {
      mockDirectChatRepository.findById.mockResolvedValue(mockChat);
      mockDirectMessageRepository.deleteAllByChatId.mockResolvedValue(undefined);
      mockDirectChatRepository.delete.mockResolvedValue(undefined);
      mockUsersService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockUsersService.update.mockResolvedValue(mockUserProfile);

      await service.deleteChat('user-1', 'chat-1');

      expect(mockDirectMessageRepository.deleteAllByChatId).toHaveBeenCalledWith('chat-1');
      expect(mockDirectChatRepository.delete).toHaveBeenCalledWith('chat-1');
    });

    it('should throw ForbiddenException when user is not participant', async () => {
      mockDirectChatRepository.findById.mockResolvedValue(mockChat);

      await expect(
        service.deleteChat('user-3', 'chat-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateChatAccess', () => {
    it('should return chat when user is participant', async () => {
      mockDirectChatRepository.findById.mockResolvedValue(mockChat);

      const result = await service.validateChatAccess('user-1', 'chat-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('chat-1');
    });

    it('should throw NotFoundException when chat not found', async () => {
      mockDirectChatRepository.findById.mockResolvedValue(null);

      await expect(
        service.validateChatAccess('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not participant', async () => {
      mockDirectChatRepository.findById.mockResolvedValue(mockChat);

      await expect(
        service.validateChatAccess('user-3', 'chat-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

