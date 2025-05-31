import { Test, TestingModule } from '@nestjs/testing';
import { AppSettingsService } from './app-settings.service';
import { FirebaseService } from '../firebase/firebase.service';
import { Preference } from './interfaces/preference.interface';

describe('AppSettingsService', () => {
  let service: AppSettingsService;
  let firebaseService: any;

  const mockPreferences: Preference[] = [
    {
      id: 'settings1',
      preferences: ['pref1', 'pref2'],
    },
    {
      id: 'settings2',
      preferences: ['pref3', 'pref4'],
    },
  ];

  const mockFirebaseService = {
    getFirestore: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppSettingsService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
      ],
    }).compile();

    service = module.get<AppSettingsService>(AppSettingsService);
    firebaseService = module.get(FirebaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all preferences', async () => {
      const mockCollection = {
        get: jest.fn().mockResolvedValue({
          docs: mockPreferences.map(pref => ({
            id: pref.id,
            data: () => ({ preferences: pref.preferences }),
          })),
        }),
      };

      const mockFirestore = {
        collection: jest.fn().mockReturnValue(mockCollection),
      };

      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('settings1');
      expect(result[0].preferences).toEqual(['pref1', 'pref2']);
      expect(result[1].id).toBe('settings2');
      expect(result[1].preferences).toEqual(['pref3', 'pref4']);
      expect(mockFirestore.collection).toHaveBeenCalledWith('app_settings');
    });

    it('should return empty preferences array if no preferences exist', async () => {
      const mockCollection = {
        get: jest.fn().mockResolvedValue({
          docs: [],
        }),
      };

      const mockFirestore = {
        collection: jest.fn().mockReturnValue(mockCollection),
      };

      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(mockFirestore.collection).toHaveBeenCalledWith('app_settings');
    });
  });

  describe('getById', () => {
    it('should return preferences by id', async () => {
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          id: 'settings1',
          data: () => ({ preferences: ['pref1', 'pref2'] }),
        }),
      };

      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
      };

      const mockFirestore = {
        collection: jest.fn().mockReturnValue(mockCollection),
      };

      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getById('settings1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('settings1');
      expect(result?.preferences).toEqual(['pref1', 'pref2']);
      expect(mockCollection.doc).toHaveBeenCalledWith('settings1');
    });

    it('should return null if preferences not found', async () => {
      const mockDoc = {
        get: jest.fn().mockResolvedValue({
          exists: false,
        }),
      };

      const mockCollection = {
        doc: jest.fn().mockReturnValue(mockDoc),
      };

      const mockFirestore = {
        collection: jest.fn().mockReturnValue(mockCollection),
      };

      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
      expect(mockCollection.doc).toHaveBeenCalledWith('nonexistent');
    });
  });
});
