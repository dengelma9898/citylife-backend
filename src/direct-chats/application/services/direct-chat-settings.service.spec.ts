import { Test, TestingModule } from '@nestjs/testing';
import { DirectChatSettingsService } from './direct-chat-settings.service';
import { DirectChatSettings } from '../../domain/entities/direct-chat-settings.entity';
import { FirebaseService } from '../../../firebase/firebase.service';

describe('DirectChatSettingsService', () => {
  let service: DirectChatSettingsService;
  let mockDoc: {
    get: jest.Mock;
    set: jest.Mock;
  };
  let mockCollection: {
    doc: jest.Mock;
  };
  let mockFirestore: { collection: jest.Mock };
  let mockFirebaseService: { getFirestore: jest.Mock };

  const mockSettings = DirectChatSettings.fromProps({
    id: 'direct_chat_settings',
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  });

  const mockDisabledSettings = DirectChatSettings.fromProps({
    id: 'direct_chat_settings',
    isEnabled: false,
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin-1',
  });

  const settingsToFirestoreData = (settings: DirectChatSettings): Record<string, unknown> => {
    const { id, ...data } = settings.toJSON();
    return data;
  };

  const configureGetSettings = (settings: DirectChatSettings | null): void => {
    mockDoc.get.mockResolvedValue({
      exists: settings !== null,
      id: settings?.id ?? 'direct_chat_settings',
      data: () => (settings ? settingsToFirestoreData(settings) : undefined),
    });
  };

  beforeEach(async () => {
    mockDoc = {
      get: jest.fn().mockResolvedValue({ exists: false, id: 'direct_chat_settings', data: () => undefined }),
      set: jest.fn().mockResolvedValue(undefined),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
    };
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    mockFirebaseService = {
      getFirestore: jest.fn().mockReturnValue(mockFirestore),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectChatSettingsService,
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();
    service = module.get<DirectChatSettingsService>(DirectChatSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return current settings', async () => {
      configureGetSettings(mockSettings);

      const result = await service.getSettings();

      expect(result).toBeDefined();
      expect(result.isEnabled).toBe(true);
      expect(mockDoc.get).toHaveBeenCalled();
    });

    it('should create default settings when document does not exist', async () => {
      configureGetSettings(null);

      const result = await service.getSettings();

      expect(result).toBeDefined();
      expect(result.isEnabled).toBe(true);
      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true when feature is enabled', async () => {
      configureGetSettings(mockSettings);

      const result = await service.isFeatureEnabled();

      expect(result).toBe(true);
    });

    it('should return false when feature is disabled', async () => {
      configureGetSettings(mockDisabledSettings);

      const result = await service.isFeatureEnabled();

      expect(result).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('should update settings to disabled', async () => {
      configureGetSettings(mockSettings);

      const result = await service.updateSettings(false, 'admin-1');

      expect(result.isEnabled).toBe(false);
      expect(result.updatedBy).toBe('admin-1');
      expect(mockDoc.set).toHaveBeenCalled();
    });

    it('should update settings to enabled', async () => {
      configureGetSettings(mockDisabledSettings);

      const result = await service.updateSettings(true, 'admin-2');

      expect(result.isEnabled).toBe(true);
      expect(result.updatedBy).toBe('admin-2');
    });
  });
});
