import { Test, TestingModule } from '@nestjs/testing';
import { AppSettingsService } from './app-settings.service';
import { FirebaseService } from '../firebase/firebase.service';
import { Preference } from './interfaces/preference.interface';
import { collection, doc, getDocs, getDoc } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn()
}));

describe('AppSettingsService', () => {
  let service: AppSettingsService;
  let firebaseService: any;

  const mockPreferences: Preference[] = [
    {
      id: 'settings1',
      preferences: ['pref1', 'pref2']
    },
    {
      id: 'settings2',
      preferences: ['pref3', 'pref4']
    }
  ];

  const mockFirebaseService = {
    getClientFirestore: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppSettingsService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService
        }
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
      const mockFirestore = {};
      mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);

      const mockCollection = {};
      (collection as jest.Mock).mockReturnValue(mockCollection);

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockPreferences.map(pref => ({
          id: pref.id,
          data: () => ({ preferences: pref.preferences })
        }))
      });

      const result = await service.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('settings1');
      expect(result[0].preferences).toEqual(['pref1', 'pref2']);
      expect(result[1].id).toBe('settings2');
      expect(result[1].preferences).toEqual(['pref3', 'pref4']);
      expect(collection).toHaveBeenCalledWith(mockFirestore, 'app_settings');
    });

    it('should return empty preferences array if no preferences exist', async () => {
      const mockFirestore = {};
      mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);

      const mockCollection = {};
      (collection as jest.Mock).mockReturnValue(mockCollection);

      (getDocs as jest.Mock).mockResolvedValue({
        docs: []
      });

      const result = await service.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(0);
      expect(collection).toHaveBeenCalledWith(mockFirestore, 'app_settings');
    });
  });

  describe('getById', () => {
    it('should return preferences by id', async () => {
      const mockFirestore = {};
      mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);

      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        id: 'settings1',
        data: () => ({ preferences: ['pref1', 'pref2'] })
      });

      const result = await service.getById('settings1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('settings1');
      expect(result?.preferences).toEqual(['pref1', 'pref2']);
      expect(doc).toHaveBeenCalledWith(mockFirestore, 'app_settings', 'settings1');
    });

    it('should return null if preferences not found', async () => {
      const mockFirestore = {};
      mockFirebaseService.getClientFirestore.mockReturnValue(mockFirestore);

      const mockDoc = {};
      (doc as jest.Mock).mockReturnValue(mockDoc);

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false
      });

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
      expect(doc).toHaveBeenCalledWith(mockFirestore, 'app_settings', 'nonexistent');
    });
  });
}); 