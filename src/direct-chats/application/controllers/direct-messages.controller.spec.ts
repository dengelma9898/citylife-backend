import { Test, TestingModule } from '@nestjs/testing';
import { DirectMessagesController } from './direct-messages.controller';
import { DirectMessagesService } from '../services/direct-messages.service';
import { DirectMessage } from '../../domain/entities/direct-message.entity';
import { AuthGuard } from '../../../core/guards/auth.guard';
import { DirectChatEnabledGuard } from '../guards/direct-chat-enabled.guard';

describe('DirectMessagesController', () => {
  let controller: DirectMessagesController;
  let directMessagesService: jest.Mocked<DirectMessagesService>;

  const mockDirectMessagesService = {
    createMessage: jest.fn(),
    getMessages: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessage: jest.fn(),
    updateReaction: jest.fn(),
  };

  const mockMessage = DirectMessage.fromProps({
    id: 'message-1',
    chatId: 'chat-1',
    senderId: 'user-1',
    senderName: 'Test User',
    content: 'Hello!',
    isEditable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const mockRequest = {
    user: { uid: 'user-1', name: 'Test User' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DirectMessagesController],
      providers: [
        {
          provide: DirectMessagesService,
          useValue: mockDirectMessagesService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DirectChatEnabledGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DirectMessagesController>(DirectMessagesController);
    directMessagesService = module.get(DirectMessagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMessage', () => {
    it('should create a new message', async () => {
      mockDirectMessagesService.createMessage.mockResolvedValue(mockMessage);

      const result = await controller.createMessage(mockRequest, 'chat-1', {
        content: 'Hello!',
      });

      expect(result).toBeDefined();
      expect(result.content).toBe('Hello!');
      expect(mockDirectMessagesService.createMessage).toHaveBeenCalledWith(
        'user-1',
        'Test User',
        'chat-1',
        { content: 'Hello!' },
      );
    });
  });

  describe('getMessages', () => {
    it('should return all messages for a chat', async () => {
      mockDirectMessagesService.getMessages.mockResolvedValue([mockMessage.toJSON()]);

      const result = await controller.getMessages(mockRequest, 'chat-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('message-1');
      expect(mockDirectMessagesService.getMessages).toHaveBeenCalledWith('user-1', 'chat-1');
    });
  });

  describe('updateMessage', () => {
    it('should update a message', async () => {
      const updatedMessage = DirectMessage.fromProps({
        ...mockMessage.toJSON(),
        content: 'Updated content',
        editedAt: new Date().toISOString(),
      });
      mockDirectMessagesService.updateMessage.mockResolvedValue(updatedMessage);

      const result = await controller.updateMessage(mockRequest, 'chat-1', 'message-1', {
        content: 'Updated content',
      });

      expect(result.content).toBe('Updated content');
      expect(mockDirectMessagesService.updateMessage).toHaveBeenCalledWith(
        'user-1',
        'chat-1',
        'message-1',
        { content: 'Updated content' },
      );
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      mockDirectMessagesService.deleteMessage.mockResolvedValue(undefined);

      await controller.deleteMessage(mockRequest, 'chat-1', 'message-1');

      expect(mockDirectMessagesService.deleteMessage).toHaveBeenCalledWith(
        'user-1',
        'chat-1',
        'message-1',
      );
    });
  });

  describe('updateReaction', () => {
    it('should update reaction on a message', async () => {
      const messageWithReaction = DirectMessage.fromProps({
        ...mockMessage.toJSON(),
        reactions: [{ userId: 'user-1', type: '👍' }],
      });
      mockDirectMessagesService.updateReaction.mockResolvedValue(messageWithReaction);

      const result = await controller.updateReaction(mockRequest, 'chat-1', 'message-1', {
        type: '👍',
      });

      expect(result.reactions).toContainEqual({ userId: 'user-1', type: '👍' });
      expect(mockDirectMessagesService.updateReaction).toHaveBeenCalledWith(
        'user-1',
        'chat-1',
        'message-1',
        { type: '👍' },
      );
    });
  });
});

