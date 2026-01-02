import { Test, TestingModule } from '@nestjs/testing';
import { DirectChatsController } from './direct-chats.controller';
import { DirectChatsService } from '../services/direct-chats.service';
import { DirectChatSettingsService } from '../services/direct-chat-settings.service';
import { DirectChat } from '../../domain/entities/direct-chat.entity';
import { DirectChatSettings } from '../../domain/entities/direct-chat-settings.entity';
import { AuthGuard } from '../../../core/guards/auth.guard';
import { DirectChatEnabledGuard } from '../guards/direct-chat-enabled.guard';
import { RolesGuard } from '../../../core/guards/roles.guard';

describe('DirectChatsController', () => {
  let controller: DirectChatsController;
  let directChatsService: jest.Mocked<DirectChatsService>;
  let directChatSettingsService: jest.Mocked<DirectChatSettingsService>;

  const mockDirectChatsService = {
    createChat: jest.fn(),
    getChatsForUser: jest.fn(),
    getPendingChatsForUser: jest.fn(),
    getChatById: jest.fn(),
    confirmChat: jest.fn(),
    deleteChat: jest.fn(),
  };

  const mockDirectChatSettingsService = {
    getSettings: jest.fn(),
    isFeatureEnabled: jest.fn(),
    updateSettings: jest.fn(),
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

  const mockSettings = DirectChatSettings.fromProps({
    id: 'direct_chat_settings',
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  });

  const mockRequest = {
    user: { uid: 'user-1' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DirectChatsController],
      providers: [
        {
          provide: DirectChatsService,
          useValue: mockDirectChatsService,
        },
        {
          provide: DirectChatSettingsService,
          useValue: mockDirectChatSettingsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DirectChatEnabledGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DirectChatsController>(DirectChatsController);
    directChatsService = module.get(DirectChatsService);
    directChatSettingsService = module.get(DirectChatSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return current settings', async () => {
      mockDirectChatSettingsService.getSettings.mockResolvedValue(mockSettings);

      const result = await controller.getSettings();

      expect(result).toBeDefined();
      expect(result.isEnabled).toBe(true);
      expect(mockDirectChatSettingsService.getSettings).toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should update settings', async () => {
      const updatedSettings = DirectChatSettings.fromProps({
        ...mockSettings.toJSON(),
        isEnabled: false,
        updatedBy: 'user-1',
      });
      mockDirectChatSettingsService.updateSettings.mockResolvedValue(updatedSettings);

      const result = await controller.updateSettings(mockRequest, { isEnabled: false });

      expect(result.isEnabled).toBe(false);
      expect(mockDirectChatSettingsService.updateSettings).toHaveBeenCalledWith(false, 'user-1');
    });
  });

  describe('createChat', () => {
    it('should create a new direct chat', async () => {
      mockDirectChatsService.createChat.mockResolvedValue(mockChat);

      const result = await controller.createChat(mockRequest, { invitedUserId: 'user-2' });

      expect(result).toBeDefined();
      expect(result.id).toBe('chat-1');
      expect(mockDirectChatsService.createChat).toHaveBeenCalledWith('user-1', {
        invitedUserId: 'user-2',
      });
    });
  });

  describe('getChats', () => {
    it('should return all chats for the user', async () => {
      const mockChatsWithInfo = [
        {
          ...mockChat.toJSON(),
          otherParticipantName: 'User 2',
          otherParticipantProfilePictureUrl: 'https://example.com/pic.jpg',
        },
      ];
      mockDirectChatsService.getChatsForUser.mockResolvedValue(mockChatsWithInfo);

      const result = await controller.getChats(mockRequest);

      expect(result).toHaveLength(1);
      expect(mockDirectChatsService.getChatsForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getPendingChats', () => {
    it('should return pending chats for the user', async () => {
      const mockPendingChats = [
        {
          ...mockChat.toJSON(),
          otherParticipantName: 'User 1',
        },
      ];
      mockDirectChatsService.getPendingChatsForUser.mockResolvedValue(mockPendingChats);

      const result = await controller.getPendingChats(mockRequest);

      expect(result).toHaveLength(1);
      expect(mockDirectChatsService.getPendingChatsForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getChatById', () => {
    it('should return a specific chat', async () => {
      const mockChatWithInfo = {
        ...mockChat.toJSON(),
        otherParticipantName: 'User 2',
      };
      mockDirectChatsService.getChatById.mockResolvedValue(mockChatWithInfo);

      const result = await controller.getChatById(mockRequest, 'chat-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('chat-1');
      expect(mockDirectChatsService.getChatById).toHaveBeenCalledWith('user-1', 'chat-1');
    });
  });

  describe('confirmChat', () => {
    it('should confirm a chat', async () => {
      const confirmedChat = DirectChat.fromProps({
        ...mockChat.toJSON(),
        invitedConfirmed: true,
        status: 'active',
      });
      mockDirectChatsService.confirmChat.mockResolvedValue(confirmedChat);

      const result = await controller.confirmChat(mockRequest, 'chat-1');

      expect(result.invitedConfirmed).toBe(true);
      expect(result.status).toBe('active');
      expect(mockDirectChatsService.confirmChat).toHaveBeenCalledWith('user-1', 'chat-1');
    });
  });

  describe('deleteChat', () => {
    it('should delete a chat', async () => {
      mockDirectChatsService.deleteChat.mockResolvedValue(undefined);

      await controller.deleteChat(mockRequest, 'chat-1');

      expect(mockDirectChatsService.deleteChat).toHaveBeenCalledWith('user-1', 'chat-1');
    });
  });
});
