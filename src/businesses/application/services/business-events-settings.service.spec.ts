import { Test, TestingModule } from '@nestjs/testing';
import { BusinessEventsSettingsService } from './business-events-settings.service';
import { BusinessEventsSettings } from '../../domain/entities/business-events-settings.entity';
import { FirebaseService } from '../../../firebase/firebase.service';

describe('BusinessEventsSettingsService', () => {
  let service: BusinessEventsSettingsService;
  let mockDoc: {
    id: string;
    exists: boolean;
    data: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
  };
  let mockCollection: {
    doc: jest.Mock;
  };
  let mockFirestore: { collection: jest.Mock };

  const mockSettingsData = {
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  };

  const mockSettings = BusinessEventsSettings.fromProps({
    id: 'business_events_settings',
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  });

  const mockDisabledSettings = BusinessEventsSettings.fromProps({
    id: 'business_events_settings',
    isEnabled: false,
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin-1',
  });

  beforeEach(async () => {
    mockDoc = {
      id: 'business_events_settings',
      exists: true,
      data: jest.fn().mockReturnValue(mockSettingsData),
      get: jest.fn().mockResolvedValue({
        exists: true,
        id: 'business_events_settings',
        data: () => mockSettingsData,
      }),
      set: jest.fn().mockResolvedValue(undefined),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
    };
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessEventsSettingsService,
        {
          provide: FirebaseService,
          useValue: { getFirestore: jest.fn().mockReturnValue(mockFirestore) },
        },
      ],
    }).compile();
    service = module.get<BusinessEventsSettingsService>(BusinessEventsSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return current settings', async () => {
      const result = await service.getSettings();
      expect(result).toBeDefined();
      expect(result.isEnabled).toBe(true);
      expect(mockCollection.doc).toHaveBeenCalledWith('business_events_settings');
      expect(mockDoc.get).toHaveBeenCalled();
    });

    it('should create default settings when document does not exist', async () => {
      mockDoc.get.mockResolvedValueOnce({ exists: false });
      const result = await service.getSettings();
      expect(result.isEnabled).toBe(true);
      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true when feature is enabled', async () => {
      const result = await service.isFeatureEnabled();
      expect(result).toBe(true);
    });

    it('should return false when feature is disabled', async () => {
      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        id: 'business_events_settings',
        data: () => ({
          isEnabled: false,
          updatedAt: new Date().toISOString(),
          updatedBy: 'admin-1',
        }),
      });
      const result = await service.isFeatureEnabled();
      expect(result).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('should update settings to disabled', async () => {
      const result = await service.updateSettings(false, 'admin-1');
      expect(result.isEnabled).toBe(false);
      expect(result.updatedBy).toBe('admin-1');
      expect(mockDoc.set).toHaveBeenCalled();
    });

    it('should update settings to enabled', async () => {
      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        id: 'business_events_settings',
        data: () => ({
          isEnabled: false,
          updatedAt: new Date().toISOString(),
          updatedBy: 'admin-1',
        }),
      });
      const result = await service.updateSettings(true, 'admin-2');
      expect(result.isEnabled).toBe(true);
      expect(result.updatedBy).toBe('admin-2');
    });
  });
});
