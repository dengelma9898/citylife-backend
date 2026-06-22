import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CuratedSpotsUserRatingsSettingsService } from './curated-spots-user-ratings-settings.service';
import { CuratedSpotsUserRatingsSettings } from '../../domain/entities/curated-spots-user-ratings-settings.entity';
import { CuratedSpotUserRatingsService } from './curated-spot-user-ratings.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { CuratedSpotStatus } from '../../domain/enums/curated-spot-status.enum';

describe('CuratedSpotsUserRatingsSettingsService', () => {
  let service: CuratedSpotsUserRatingsSettingsService;
  let getSpy: jest.SpyInstance;
  let saveSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuratedSpotsUserRatingsSettingsService,
        { provide: FirebaseService, useValue: { getFirestore: jest.fn() } },
      ],
    }).compile();
    service = module.get(CuratedSpotsUserRatingsSettingsService);
    getSpy = jest.spyOn(service as any, 'get');
    saveSpy = jest.spyOn(service as any, 'save');
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('isFeatureEnabled returns settings flag', async () => {
    getSpy.mockResolvedValue(CuratedSpotsUserRatingsSettings.createDefault());
    await expect(service.isFeatureEnabled()).resolves.toBe(false);
  });

  it('updateSettings saves updated entity', async () => {
    const current = CuratedSpotsUserRatingsSettings.createDefault();
    const saved = current.update({ isEnabled: true }, 'admin-1');
    getSpy.mockResolvedValue(current);
    saveSpy.mockResolvedValue(saved);
    const result = await service.updateSettings(true, 'admin-1');
    expect(result.isEnabled).toBe(true);
    expect(saveSpy).toHaveBeenCalled();
  });
});

describe('CuratedSpotUserRatingsService', () => {
  let service: CuratedSpotUserRatingsService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submitOnce throws NotFound when spot missing', async () => {
    const firebaseService = { getFirestore: jest.fn() };
    service = new CuratedSpotUserRatingsService(firebaseService as unknown as FirebaseService);
    const t = { get: jest.fn(), set: jest.fn(), update: jest.fn() };
    t.get.mockResolvedValueOnce({ exists: false }).mockResolvedValueOnce({ exists: false });
    firebaseService.getFirestore.mockReturnValue({
      collection: () => ({
        doc: () => ({
          collection: () => ({ doc: () => ({}) }),
        }),
      }),
      runTransaction: async (fn: (tx: typeof t) => Promise<void>) => {
        await fn(t);
      },
    });
    await expect(service.submitOnce('s1', 'u1', 5)).rejects.toThrow(NotFoundException);
  });

  it('submitOnce throws Conflict when user already rated', async () => {
    const firebaseService = { getFirestore: jest.fn() };
    service = new CuratedSpotUserRatingsService(firebaseService as unknown as FirebaseService);
    const t = { get: jest.fn(), set: jest.fn(), update: jest.fn() };
    t.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: CuratedSpotStatus.ACTIVE,
          isDeleted: false,
          userRatingCount: 1,
          userRatingAverage: 4,
        }),
      })
      .mockResolvedValueOnce({ exists: true });
    firebaseService.getFirestore.mockReturnValue({
      collection: () => ({
        doc: () => ({
          collection: () => ({ doc: () => ({}) }),
        }),
      }),
      runTransaction: async (fn: (tx: typeof t) => Promise<void>) => {
        await fn(t);
      },
    });
    await expect(service.submitOnce('s1', 'u1', 5)).rejects.toThrow(ConflictException);
  });

  it('submitOnce writes rating and aggregate when first vote', async () => {
    const firebaseService = { getFirestore: jest.fn() };
    service = new CuratedSpotUserRatingsService(firebaseService as unknown as FirebaseService);
    const t = { get: jest.fn(), set: jest.fn(), update: jest.fn() };
    t.get
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: CuratedSpotStatus.ACTIVE, isDeleted: false }),
      })
      .mockResolvedValueOnce({ exists: false });
    firebaseService.getFirestore.mockReturnValue({
      collection: () => ({
        doc: () => ({
          collection: () => ({ doc: () => ({}) }),
        }),
      }),
      runTransaction: async (fn: (tx: typeof t) => Promise<void>) => {
        await fn(t);
      },
    });
    const result = await service.submitOnce('s1', 'u1', 5);
    expect(result.score).toBe(5);
    expect(result.ratedAt).toMatch(/^\d{4}-/);
    expect(t.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ score: 5 }));
    expect(t.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userRatingCount: 1, userRatingAverage: 5 }),
    );
  });

  it('getMyRating returns null when missing', async () => {
    const firebaseService = { getFirestore: jest.fn() };
    service = new CuratedSpotUserRatingsService(firebaseService as unknown as FirebaseService);
    firebaseService.getFirestore.mockReturnValue({
      collection: () => ({
        doc: () => ({
          collection: () => ({
            doc: () => ({
              get: jest.fn().mockResolvedValue({ exists: false }),
            }),
          }),
        }),
      }),
    });
    await expect(service.getMyRating('s1', 'u1')).resolves.toBeNull();
  });
});
