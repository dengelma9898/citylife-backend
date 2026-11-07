import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ChristmasMarketsService } from './christmas-markets.service';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateChristmasMarketDto } from './dto/create-christmas-market.dto';

describe('ChristmasMarketsService', () => {
  let service: ChristmasMarketsService;
  let store: Map<string, Record<string, unknown>>;
  let cacheStore: Map<string, unknown>;
  let mockCache: Record<string, jest.Mock>;
  let mockCollection: Record<string, jest.Mock>;

  const baseDto: CreateChristmasMarketDto = {
    name: 'Nürnberger Christkindlesmarkt',
    city: 'Nürnberg',
    place: 'Hauptmarkt',
    description: 'Einer der ältesten Weihnachtsmärkte Deutschlands.',
    periodLabel: '27.11. – 24.12.2026',
    openingHoursLabel: 'Täglich 10–21 Uhr',
    startDate: '2026-11-27',
    endDate: '2026-12-24',
    latitude: 49.4541,
    longitude: 11.0773,
    highlights: ['Christkind'],
  };

  function seedDocument(id: string, data: Record<string, unknown>): void {
    store.set(id, {
      name: 'Markt',
      city: 'Nürnberg',
      place: 'Hauptmarkt',
      description: 'Beschreibung',
      periodLabel: '27.11. – 24.12.2026',
      openingHoursLabel: 'Täglich 10–21 Uhr',
      latitude: 49.45,
      longitude: 11.07,
      highlights: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...data,
    });
  }

  beforeEach(async () => {
    store = new Map();
    cacheStore = new Map();
    const docFor = (id: string) => ({
      id,
      get: jest.fn(async () => ({
        exists: store.has(id),
        id,
        data: () => store.get(id),
      })),
      set: jest.fn(async (data: Record<string, unknown>) => store.set(id, data)),
      update: jest.fn(async (data: Record<string, unknown>) =>
        store.set(id, { ...store.get(id), ...data }),
      ),
      delete: jest.fn(async () => store.delete(id)),
    });
    mockCollection = {
      get: jest.fn(async () => ({
        docs: [...store.entries()].map(([id, data]) => ({ id, data: () => data })),
      })),
      doc: jest.fn((id: string) => docFor(id)),
      add: jest.fn(async (data: Record<string, unknown>) => {
        store.set('auto-id-1', data);
        return { id: 'auto-id-1' };
      }),
    };
    mockCache = {
      get: jest.fn(async (key: string) => cacheStore.get(key)),
      set: jest.fn(async (key: string, value: unknown) => cacheStore.set(key, value)),
      del: jest.fn(async (key: string) => cacheStore.delete(key)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChristmasMarketsService,
        { provide: FirebaseService, useValue: { getFirestore: () => ({ collection: () => mockCollection }) } },
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();
    service = module.get<ChristmasMarketsService>(ChristmasMarketsService);
  });

  describe('findAll', () => {
    it('should sort by startDate with undated markets last and convert timestamps', async () => {
      seedDocument('late', { name: 'Spät', startDate: { toDate: () => new Date('2026-12-01T00:00:00.000Z') }, endDate: null });
      seedDocument('early', { name: 'Früh', startDate: { toDate: () => new Date('2026-11-20T00:00:00.000Z') }, endDate: null });
      seedDocument('undated', { name: 'Ohne Datum', startDate: null, endDate: null });
      const result = await service.findAll();
      expect(result.map(market => market.id)).toEqual(['early', 'late', 'undated']);
      expect(result[0].startDate).toBe('2026-11-20T00:00:00.000Z');
      expect(result[2].startDate).toBeUndefined();
    });

    it('should serve the list from cache on hit without Firestore access', async () => {
      seedDocument('a', { startDate: '2026-11-27' });
      await service.findAll();
      const firstCollectionCalls = mockCollection.get.mock.calls.length;
      const second = await service.findAll();
      expect(second).toHaveLength(1);
      expect(mockCollection.get.mock.calls.length).toBe(firstCollectionCalls);
    });

    it('should fill the cache on miss with a 15 minute TTL', async () => {
      seedDocument('a', {});
      await service.findAll();
      expect(mockCache.set).toHaveBeenCalledWith('christmas-markets:all', expect.any(Array), 900000);
    });
  });

  describe('findOne', () => {
    it('should return a market and cache it', async () => {
      seedDocument('m1', { name: 'Eins' });
      const result = await service.findOne('m1');
      expect(result.name).toBe('Eins');
      expect(mockCache.set).toHaveBeenCalledWith(
        'christmas-markets:m1',
        expect.objectContaining({ id: 'm1' }),
        900000,
      );
      await service.findOne('m1');
      expect(mockCollection.doc.mock.calls.filter(([id]) => id === 'm1')).toHaveLength(1);
    });

    it('should throw 404 when missing', async () => {
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create with slug id, audit fields and invalidate cache', async () => {
      const result = await service.create({ ...baseDto, id: 'nuernberg-christkindlesmarkt' }, 'admin-1');
      expect(result.id).toBe('nuernberg-christkindlesmarkt');
      expect(result.createdBy).toBe('admin-1');
      expect(result.updatedBy).toBe('admin-1');
      expect(store.get('nuernberg-christkindlesmarkt')?.startDate).toBeInstanceOf(Date);
      expect(mockCache.del).toHaveBeenCalledWith('christmas-markets:all');
      expect(mockCache.del).toHaveBeenCalledWith('christmas-markets:nuernberg-christkindlesmarkt');
    });

    it('should create with an auto id when no slug is given', async () => {
      const result = await service.create(baseDto, 'admin-1');
      expect(result.id).toBe('auto-id-1');
      expect(mockCollection.add).toHaveBeenCalled();
    });

    it('should reject a duplicate slug with 409', async () => {
      seedDocument('taken', {});
      await expect(service.create({ ...baseDto, id: 'taken' }, 'admin-1')).rejects.toThrow(ConflictException);
    });

    it('should reject endDate before startDate with 400', async () => {
      await expect(
        service.create({ ...baseDto, startDate: '2026-12-24', endDate: '2026-11-27' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update fields, set updatedBy and invalidate cache', async () => {
      seedDocument('m1', { startDate: new Date('2026-11-27'), endDate: new Date('2026-12-24') });
      const result = await service.update('m1', { name: 'Neuer Name' }, 'admin-2');
      expect(result.name).toBe('Neuer Name');
      expect(result.updatedBy).toBe('admin-2');
      expect(mockCache.del).toHaveBeenCalledWith('christmas-markets:all');
      expect(mockCache.del).toHaveBeenCalledWith('christmas-markets:m1');
    });

    it('should validate the merged date range', async () => {
      seedDocument('m1', { startDate: '2026-11-27', endDate: '2026-12-24' });
      await expect(service.update('m1', { endDate: '2026-11-01' }, 'admin-2')).rejects.toThrow(BadRequestException);
    });

    it('should throw 404 when missing', async () => {
      await expect(service.update('missing', { name: 'X' }, 'admin-2')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete and invalidate cache', async () => {
      seedDocument('m1', {});
      await service.remove('m1');
      expect(store.has('m1')).toBe(false);
      expect(mockCache.del).toHaveBeenCalledWith('christmas-markets:all');
      expect(mockCache.del).toHaveBeenCalledWith('christmas-markets:m1');
    });

    it('should throw 404 when missing', async () => {
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
