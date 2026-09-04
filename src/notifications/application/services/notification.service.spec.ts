import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../../users/users.service';
import { NotificationService } from './notification.service';
import { FcmToken } from '../../../users/interfaces/user-profile.interface';
import { NotificationPayload } from '../../domain/interfaces/notification-payload.interface';

const mockSend = jest.fn();

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ send: mockSend }),
}));

describe('NotificationService', () => {
  let service: NotificationService;
  let usersService: jest.Mocked<Pick<UsersService, 'getFcmTokens' | 'removeFcmToken'>>;

  const payload: NotificationPayload = {
    title: 'Test Titel',
    body: 'Test Body',
    data: { type: 'TEST' },
  };

  const createToken = (id: string, token = `token-${id}`): FcmToken => ({
    token,
    deviceId: id,
    platform: 'android',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastUsedAt: '2026-01-01T00:00:00.000Z',
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    usersService = {
      getFcmTokens: jest.fn(),
      removeFcmToken: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should skip sending when no FCM tokens exist', async () => {
    usersService.getFcmTokens.mockResolvedValue([]);

    await service.sendToUser('user-1', payload);

    expect(mockSend).not.toHaveBeenCalled();
    expect(usersService.removeFcmToken).not.toHaveBeenCalled();
  });

  it('should send to a single token with the expected message shape', async () => {
    usersService.getFcmTokens.mockResolvedValue([createToken('dev-1')]);
    mockSend.mockResolvedValue({});

    await service.sendToUser('user-1', payload);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-dev-1',
        notification: { title: 'Test Titel', body: 'Test Body' },
        data: { type: 'TEST' },
      }),
    );
    expect(usersService.removeFcmToken).not.toHaveBeenCalled();
  });

  it('should send to all tokens of a user', async () => {
    usersService.getFcmTokens.mockResolvedValue([
      createToken('dev-1'),
      createToken('dev-2'),
      createToken('dev-3'),
    ]);
    mockSend.mockResolvedValue({});

    await service.sendToUser('user-1', payload);

    expect(mockSend).toHaveBeenCalledTimes(3);
    expect(usersService.removeFcmToken).not.toHaveBeenCalled();
  });

  it('should remove tokens that fail with invalid-registration-token', async () => {
    usersService.getFcmTokens.mockResolvedValue([
      createToken('dev-1'),
      createToken('dev-2'),
    ]);
    mockSend.mockImplementation(async (message: { token: string }) => {
      if (message.token === 'token-dev-2') {
        const error = new Error('Invalid token');
        (error as { code?: string }).code = 'messaging/invalid-registration-token';
        throw error;
      }
      return {};
    });

    await service.sendToUser('user-1', payload);

    expect(usersService.removeFcmToken).toHaveBeenCalledWith('user-1', 'dev-2');
    expect(usersService.removeFcmToken).not.toHaveBeenCalledWith('user-1', 'dev-1');
  });

  it('should remove tokens that fail with registration-token-not-registered', async () => {
    usersService.getFcmTokens.mockResolvedValue([
      createToken('dev-2', 'stale-token'),
    ]);
    mockSend.mockImplementation(async () => {
      const error = new Error('Not registered');
      (error as { code?: string }).code = 'messaging/registration-token-not-registered';
      throw error;
    });

    await service.sendToUser('user-1', payload);

    expect(usersService.removeFcmToken).toHaveBeenCalledWith('user-1', 'dev-2');
  });

  it('should not remove tokens for unrelated FCM errors', async () => {
    usersService.getFcmTokens.mockResolvedValue([createToken('dev-1')]);
    mockSend.mockImplementation(async () => {
      const error = new Error('Quota exceeded');
      (error as { code?: string }).code = 'messaging/quota-exceeded';
      throw error;
    });

    await service.sendToUser('user-1', payload);

    expect(usersService.removeFcmToken).not.toHaveBeenCalled();
  });

  it('should keep removing other invalid tokens when one removal fails', async () => {
    usersService.getFcmTokens.mockResolvedValue([
      createToken('dev-1'),
      createToken('dev-2'),
    ]);
    mockSend.mockImplementation(async (message: { token: string }) => {
      const error = new Error('Invalid token');
      (error as { code?: string }).code = 'messaging/invalid-registration-token';
      throw error;
    });
    usersService.removeFcmToken.mockImplementation(async (userId: string, deviceId: string) => {
      if (deviceId === 'dev-1') {
        throw new Error('db failure');
      }
    });

    await service.sendToUser('user-1', payload);

    expect(usersService.removeFcmToken).toHaveBeenCalledWith('user-1', 'dev-1');
    expect(usersService.removeFcmToken).toHaveBeenCalledWith('user-1', 'dev-2');
  });

  it('should not throw when getFcmTokens fails', async () => {
    usersService.getFcmTokens.mockRejectedValue(new Error('db error'));

    await expect(service.sendToUser('user-1', payload)).resolves.toBeUndefined();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should limit concurrent FCM sends to the configured cap', async () => {
    const tokens = Array.from({ length: 60 }, (_, i) => createToken(`dev-${i}`));
    usersService.getFcmTokens.mockResolvedValue(tokens);

    let activeCount = 0;
    let maxActive = 0;
    mockSend.mockImplementation(async () => {
      activeCount++;
      maxActive = Math.max(maxActive, activeCount);
      await new Promise(resolve => setTimeout(resolve, 2));
      activeCount--;
    });

    await service.sendToUser('user-1', payload);

    expect(mockSend).toHaveBeenCalledTimes(60);
    expect(maxActive).toBeLessThanOrEqual(25);
  });

  it('should limit concurrent sendToUser calls when sending to many users', async () => {
    const userIds = Array.from({ length: 50 }, (_, index) => `user-${index}`);
    usersService.getFcmTokens.mockResolvedValue([]);
    let activeCount = 0;
    let maxActive = 0;
    const sendToUserSpy = jest.spyOn(service, 'sendToUser').mockImplementation(async () => {
      activeCount++;
      maxActive = Math.max(maxActive, activeCount);
      await new Promise(resolve => setTimeout(resolve, 2));
      activeCount--;
    });
    await service.sendToUsers(userIds, payload);
    expect(sendToUserSpy).toHaveBeenCalledTimes(50);
    expect(maxActive).toBeLessThanOrEqual(15);
    sendToUserSpy.mockRestore();
  });
});