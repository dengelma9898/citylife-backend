import { Test, TestingModule } from '@nestjs/testing';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';
import { Preference } from './interfaces/preference.interface';

describe('AppSettingsController', () => {
  let controller: AppSettingsController;
  let service: AppSettingsService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppSettingsController],
      providers: [
        {
          provide: AppSettingsService,
          useValue: {
            getAll: jest.fn().mockResolvedValue(mockPreferences),
            getById: jest.fn().mockImplementation((id: string) => {
              const pref = mockPreferences.find(p => p.id === id);
              return Promise.resolve(pref || null);
            })
          }
        }
      ],
    }).compile();

    controller = module.get<AppSettingsController>(AppSettingsController);
    service = module.get<AppSettingsService>(AppSettingsService);
  });

  describe('getAll', () => {
    it('should return all preferences', async () => {
      const result = await controller.getAll();

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('settings1');
      expect(result[0].preferences).toEqual(['pref1', 'pref2']);
      expect(result[1].id).toBe('settings2');
      expect(result[1].preferences).toEqual(['pref3', 'pref4']);
      expect(service.getAll).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return preferences by id', async () => {
      const result = await controller.getById('settings1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('settings1');
      expect(result?.preferences).toEqual(['pref1', 'pref2']);
      expect(service.getById).toHaveBeenCalledWith('settings1');
    });

    it('should return null if preferences not found', async () => {
      const result = await controller.getById('nonexistent');

      expect(result).toBeNull();
      expect(service.getById).toHaveBeenCalledWith('nonexistent');
    });
  });
}); 