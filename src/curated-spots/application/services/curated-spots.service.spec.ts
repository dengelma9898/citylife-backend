import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CuratedSpotsService } from './curated-spots.service';
import { SpotKeywordsService } from './spot-keywords.service';
import { FirebaseService } from '../../../firebase/firebase.service';
import { CuratedSpot, KidsProfile } from '../../interfaces/curated-spot.interface';
import { CuratedSpotStatus } from '../../domain/enums/curated-spot-status.enum';
import { UpdateCuratedSpotDto } from '../../dto/update-curated-spot.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UsersService } from '../../../users/users.service';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { KidsLocationType } from '../../domain/enums/kids-location-type.enum';
import { KidsAgeGroup } from '../../domain/enums/kids-age-group.enum';
import { KidsEquipmentTag } from '../../domain/enums/kids-equipment-tag.enum';

describe('CuratedSpotsService', () => {
  let service: CuratedSpotsService;
  let mockCache: Record<string, jest.Mock>;
  let mockUsersService: Record<string, jest.Mock>;
  let mockNotificationService: Record<string, jest.Mock>;
  let mockSpotKeywordsService: Record<string, jest.Mock>;
  let findByIdSpy: jest.SpyInstance;
  let findAllActiveNotDeletedSpy: jest.SpyInstance;
  let findActiveNotDeletedByKeywordContainsSpy: jest.SpyInstance;
  let createSpotSpy: jest.SpyInstance;
  let updateSpotSpy: jest.SpyInstance;

  const sampleAddress = {
    street: 'Hauptstraße',
    houseNumber: '1',
    postalCode: '90403',
    city: 'Nürnberg',
    latitude: 49.45,
    longitude: 11.08,
  };

  const activeSpotA = ({
    id: 's1',
    name: 'Alpha Cafe',
    nameLower: 'alpha cafe',
    descriptionMarkdown: 'x',
    imageUrls: [],
    keywordIds: ['k1', 'k2'],
    address: sampleAddress,
    videoUrl: null,
    instagramUrl: null,
    status: CuratedSpotStatus.ACTIVE,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: null,
  });

  const activeSpotB = ({
    id: 's2',
    name: 'Alpha Bar',
    nameLower: 'alpha bar',
    descriptionMarkdown: 'y',
    imageUrls: [],
    keywordIds: ['k1'],
    address: sampleAddress,
    videoUrl: null,
    instagramUrl: null,
    status: CuratedSpotStatus.ACTIVE,
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdByUserId: null,
  });

  beforeEach(async () => {
    mockSpotKeywordsService = {
      suggestByPrefix: jest.fn(),
      create: jest.fn(),
      resolveNewKeywordNamesToIds: jest.fn(),
    };
    mockCache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    mockUsersService = { getAllUserProfilesWithIds: jest.fn().mockResolvedValue([]) };
    mockNotificationService = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuratedSpotsService,
        { provide: FirebaseService, useValue: { getFirestore: jest.fn() } },
        { provide: SpotKeywordsService, useValue: mockSpotKeywordsService },
        { provide: CACHE_MANAGER, useValue: mockCache },
        { provide: UsersService, useValue: mockUsersService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();
    service = module.get<CuratedSpotsService>(CuratedSpotsService);
    findByIdSpy = jest.spyOn(service as any, 'findById');
    findAllActiveNotDeletedSpy = jest.spyOn(service as any, 'findAllActiveNotDeleted');
    findActiveNotDeletedByKeywordContainsSpy = jest.spyOn(
      service as any,
      'findActiveNotDeletedByKeywordContains',
    );
    createSpotSpy = jest.spyOn(service as any, 'createSpot');
    updateSpotSpy = jest.spyOn(service as any, 'updateSpot');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('should persist mandatory address', async () => {
      mockSpotKeywordsService.resolveNewKeywordNamesToIds.mockResolvedValue([]);
      createSpotSpy.mockImplementation((s: CuratedSpot) => Promise.resolve(s));
      await service.create(
        {
          name: 'Neu',
          descriptionMarkdown: 'Text',
          address: sampleAddress,
        },
        'user-1',
      );
      const created = createSpotSpy.mock.calls[0][0] as CuratedSpot;
      expect(created.address).toEqual(sampleAddress);
    });
  });

  describe('update', () => {
    it('should patch address when provided', async () => {
      findByIdSpy.mockResolvedValue(activeSpotA);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      const newAddr = { ...sampleAddress, street: 'Neue Straße' };
      await service.update('s1', { address: newAddr });
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.address.street).toBe('Neue Straße');
    });

    it('should set adminRating and adminRatedAt on first assign', async () => {
      findByIdSpy.mockResolvedValue(activeSpotA);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      await service.update('s1', { adminRating: 4 });
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.adminRating).toBe(4);
      expect(updated.adminRatedAt).toMatch(/^\d{4}-/);
    });

    it('should update adminRating and refresh adminRatedAt when value changes', async () => {
      const rated: CuratedSpot = {
        ...activeSpotA,
        adminRating: 4,
        adminRatedAt: '2026-01-02T00:00:00.000Z',
      };
      findByIdSpy.mockResolvedValue(rated);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      await service.update('s1', { adminRating: 5 });
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.adminRating).toBe(5);
      expect(updated.adminRatedAt).not.toBe('2026-01-02T00:00:00.000Z');
      expect(updated.adminRatedAt).toMatch(/^\d{4}-/);
    });

    it('should clear adminRating and adminRatedAt when PATCH sends null', async () => {
      const rated: CuratedSpot = {
        ...activeSpotA,
        adminRating: 4,
        adminRatedAt: '2026-01-02T00:00:00.000Z',
      };
      findByIdSpy.mockResolvedValue(rated);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      await service.update('s1', { adminRating: null });
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.adminRating).toBeNull();
      expect(updated.adminRatedAt).toBeNull();
    });

    it('should not touch admin fields when adminRating equals existing (idempotent)', async () => {
      const rated: CuratedSpot = {
        ...activeSpotA,
        adminRating: 4,
        adminRatedAt: '2026-01-02T00:00:00.000Z',
      };
      findByIdSpy.mockResolvedValue(rated);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      await service.update('s1', { name: 'Renamed', adminRating: 4 });
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.name).toBe('Renamed');
      expect(updated.adminRating).toBe(4);
      expect(updated.adminRatedAt).toBe('2026-01-02T00:00:00.000Z');
    });

    it('should normalize videoUrl with spaces on update', async () => {
      findByIdSpy.mockResolvedValue(activeSpotA);
      updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      await service.update('s1', {
        videoUrl: 'https://storage.test/x/Video File Name.mp4',
      } as UpdateCuratedSpotDto);
      const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
      expect(updated.videoUrl).toBe('https://storage.test/x/Video%20File%20Name.mp4');
    });
  });

  describe('parseKeywordIdsFromQuery', () => {
    it('should parse comma-separated and dedupe', () => {
      expect(CuratedSpotsService.parseKeywordIdsFromQuery(['a,b', 'a'])).toEqual(['a', 'b']);
    });
  });

  describe('searchActive', () => {
    it('should apply AND for multiple keyword ids', async () => {
      findActiveNotDeletedByKeywordContainsSpy.mockResolvedValue([activeSpotA, activeSpotB]);
      const result = await service.searchActive(undefined, ['k1', 'k2']);
      expect(result.map(s => s.id)).toEqual(['s1']);
    });

    it('should combine name prefix with keyword AND', async () => {
      findActiveNotDeletedByKeywordContainsSpy.mockResolvedValue([activeSpotA, activeSpotB]);
      const result = await service.searchActive('alpha c', ['k1']);
      expect(result.map(s => s.id)).toEqual(['s1']);
    });

    it('should list all active when no filters', async () => {
      findAllActiveNotDeletedSpy.mockResolvedValue([activeSpotA]);
      const result = await service.searchActive(undefined, []);
      expect(result).toHaveLength(1);
    });
  });

  describe('getByIdForApp', () => {
    it('should throw when pending', async () => {
      const pending: CuratedSpot = { ...activeSpotA, status: CuratedSpotStatus.PENDING };
      findByIdSpy.mockResolvedValue(pending);
      await expect(service.getByIdForApp('s1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('appendImageUrls', () => {
    it('should throw when no urls', async () => {
      findByIdSpy.mockResolvedValue(activeSpotA);
      await expect(service.appendImageUrls('s1', [])).rejects.toThrow(BadRequestException);
    });
  });

  describe('kids spots', () => {
    const buildKidsSpot = (
      id: string,
      name: string,
      profile: Partial<KidsProfile> = {},
      overrides: Partial<CuratedSpot> = {},
    ): CuratedSpot => ({
      ...activeSpotA,
      id,
      name,
      nameLower: name.toLowerCase(),
      imageUrls: ['https://img/1.jpg'],
      kidsProfile: {
        locationType: KidsLocationType.INDOOR,
        suitableForToddlers: true,
        suitableForSchoolKids: false,
        isFree: false,
        isBadWeatherTip: false,
        equipmentTags: [],
        ...profile,
      },
      kidsNotificationSentAt: null,
      ...overrides,
    });
    const indoorToddlerFree = buildKidsSpot('k-indoor', 'Zoo Indoor', { isFree: true });
    const outdoorSchoolRain = buildKidsSpot('k-outdoor', 'Abenteuerspielplatz', {
      locationType: KidsLocationType.OUTDOOR,
      suitableForToddlers: false,
      suitableForSchoolKids: true,
      isBadWeatherTip: true,
    });
    const bothBothAges = buildKidsSpot('k-both', 'Museum Mitte', {
      locationType: KidsLocationType.BOTH,
      suitableForSchoolKids: true,
    });
    const withoutPhoto = buildKidsSpot('k-nophoto', 'Ohne Foto', {}, { imageUrls: [] });
    const withoutProfile: CuratedSpot = { ...activeSpotA, id: 'plain', imageUrls: ['https://i/x'] };
    const pendingKids = buildKidsSpot('k-pending', 'Pending Kids', {}, {
      status: CuratedSpotStatus.PENDING,
    });
    const allSpots = [
      indoorToddlerFree,
      outdoorSchoolRain,
      bothBothAges,
      withoutPhoto,
      withoutProfile,
      pendingKids,
    ];

    describe('isKidsVisible', () => {
      it('should be true for active spot with profile and photo', () => {
        expect(CuratedSpotsService.isKidsVisible(indoorToddlerFree)).toBe(true);
      });

      it.each([
        ['no photo', withoutPhoto],
        ['no kids profile', withoutProfile],
        ['pending status', pendingKids],
        ['soft-deleted', { ...indoorToddlerFree, isDeleted: true }],
        ['null profile', { ...indoorToddlerFree, kidsProfile: null }],
      ])('should be false for %s', (_label, spot) => {
        expect(CuratedSpotsService.isKidsVisible(spot as CuratedSpot)).toBe(false);
      });
    });

    describe('parseKidsFiltersFromQuery', () => {
      it('should treat true as filter and false/missing as no filter', () => {
        expect(
          CuratedSpotsService.parseKidsFiltersFromQuery({ isFree: 'true', isBadWeatherTip: 'false' }),
        ).toEqual({
          locationType: undefined,
          ageGroup: undefined,
          isFree: true,
          isBadWeatherTip: undefined,
        });
      });

      it('should pass enum filters through', () => {
        const filters = CuratedSpotsService.parseKidsFiltersFromQuery({
          locationType: KidsLocationType.OUTDOOR,
          ageGroup: KidsAgeGroup.TODDLER,
        });
        expect(filters.locationType).toBe(KidsLocationType.OUTDOOR);
        expect(filters.ageGroup).toBe(KidsAgeGroup.TODDLER);
      });
    });

    describe('searchKids', () => {
      beforeEach(() => {
        mockCache.get.mockResolvedValue(undefined);
        findAllActiveNotDeletedSpy.mockResolvedValue(allSpots);
      });

      const searchIds = async (filters = {}) =>
        (await service.searchKids(filters)).map(spot => spot.id);

      it('should return only kids-visible spots sorted by name A-Z without filters', async () => {
        expect(await searchIds()).toEqual(['k-outdoor', 'k-both', 'k-indoor']);
      });

      it('should match INDOOR filter for INDOOR and BOTH', async () => {
        expect(await searchIds({ locationType: KidsLocationType.INDOOR })).toEqual([
          'k-both',
          'k-indoor',
        ]);
      });

      it('should match OUTDOOR filter for OUTDOOR and BOTH', async () => {
        expect(await searchIds({ locationType: KidsLocationType.OUTDOOR })).toEqual([
          'k-outdoor',
          'k-both',
        ]);
      });

      it('should match BOTH filter only for BOTH', async () => {
        expect(await searchIds({ locationType: KidsLocationType.BOTH })).toEqual(['k-both']);
      });

      it('should filter toddler age group', async () => {
        expect(await searchIds({ ageGroup: KidsAgeGroup.TODDLER })).toEqual(['k-both', 'k-indoor']);
      });

      it('should filter school child age group', async () => {
        expect(await searchIds({ ageGroup: KidsAgeGroup.SCHOOL_CHILD })).toEqual([
          'k-outdoor',
          'k-both',
        ]);
      });

      it('should filter free spots only', async () => {
        expect(await searchIds({ isFree: true })).toEqual(['k-indoor']);
      });

      it('should filter bad weather tips only', async () => {
        expect(await searchIds({ isBadWeatherTip: true })).toEqual(['k-outdoor']);
      });

      it('should combine filters with AND', async () => {
        expect(
          await searchIds({
            locationType: KidsLocationType.INDOOR,
            ageGroup: KidsAgeGroup.TODDLER,
            isFree: true,
          }),
        ).toEqual(['k-indoor']);
      });

      it('should return empty list when nothing matches', async () => {
        expect(
          await searchIds({ locationType: KidsLocationType.OUTDOOR, isFree: true }),
        ).toEqual([]);
      });
    });

    describe('kids cache', () => {
      it('should load from database on miss and fill cache with TTL', async () => {
        mockCache.get.mockResolvedValue(undefined);
        findAllActiveNotDeletedSpy.mockResolvedValue(allSpots);
        await service.searchKids();
        expect(findAllActiveNotDeletedSpy).toHaveBeenCalledTimes(1);
        expect(mockCache.set).toHaveBeenCalledWith(
          'curated-spots:kids:all',
          expect.any(Array),
          300000,
        );
      });

      it('should serve from cache on hit without database access', async () => {
        mockCache.get.mockResolvedValue([indoorToddlerFree, bothBothAges]);
        const result = await service.searchKids({ ageGroup: KidsAgeGroup.SCHOOL_CHILD });
        expect(findAllActiveNotDeletedSpy).not.toHaveBeenCalled();
        expect(mockCache.set).not.toHaveBeenCalled();
        expect(result.map(s => s.id)).toEqual(['k-both']);
      });

      it('should invalidate cache after create, update, softDelete and appendImageUrls', async () => {
        mockSpotKeywordsService.resolveNewKeywordNamesToIds.mockResolvedValue([]);
        createSpotSpy.mockImplementation((s: CuratedSpot) => Promise.resolve(s));
        updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
        findByIdSpy.mockResolvedValue(activeSpotA);
        await service.create(
          { name: 'N', descriptionMarkdown: 'T', address: sampleAddress },
          'user-1',
        );
        await service.update('s1', { name: 'Neu' });
        await service.softDelete('s1');
        await service.appendImageUrls('s1', ['https://img/x.jpg']);
        expect(mockCache.del).toHaveBeenCalledTimes(4);
        expect(mockCache.del).toHaveBeenCalledWith('curated-spots:kids:all');
      });
    });

    describe('create', () => {
      beforeEach(() => {
        mockSpotKeywordsService.resolveNewKeywordNamesToIds.mockResolvedValue([]);
        createSpotSpy.mockImplementation((s: CuratedSpot) => Promise.resolve(s));
      });

      it('should persist kids profile and normalized websiteUrl', async () => {
        await service.create(
          {
            name: 'Kids',
            descriptionMarkdown: 'Text',
            address: sampleAddress,
            websiteUrl: 'https://example.org/Kids Page',
            kidsProfile: {
              locationType: KidsLocationType.BOTH,
              suitableForToddlers: true,
              suitableForSchoolKids: true,
              isFree: true,
              isBadWeatherTip: false,
              equipmentTags: [KidsEquipmentTag.STROLLER_FRIENDLY],
            },
          },
          'user-1',
        );
        const created = createSpotSpy.mock.calls[0][0] as CuratedSpot;
        expect(created.websiteUrl).toBe('https://example.org/Kids%20Page');
        expect(created.kidsProfile).toEqual({
          locationType: KidsLocationType.BOTH,
          suitableForToddlers: true,
          suitableForSchoolKids: true,
          isFree: true,
          isBadWeatherTip: false,
          equipmentTags: [KidsEquipmentTag.STROLLER_FRIENDLY],
        });
      });

      it('should default kidsProfile and websiteUrl to null', async () => {
        await service.create(
          { name: 'Plain', descriptionMarkdown: 'Text', address: sampleAddress },
          'user-1',
        );
        const created = createSpotSpy.mock.calls[0][0] as CuratedSpot;
        expect(created.kidsProfile).toBeNull();
        expect(created.websiteUrl).toBeNull();
      });

      it('should default equipmentTags to empty list', async () => {
        await service.create(
          {
            name: 'Kids',
            descriptionMarkdown: 'Text',
            address: sampleAddress,
            kidsProfile: {
              locationType: KidsLocationType.OUTDOOR,
              suitableForToddlers: true,
              suitableForSchoolKids: false,
              isFree: false,
              isBadWeatherTip: false,
            },
          },
          'user-1',
        );
        const created = createSpotSpy.mock.calls[0][0] as CuratedSpot;
        expect(created.kidsProfile?.equipmentTags).toEqual([]);
      });
    });

    describe('update', () => {
      beforeEach(() => {
        updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      });

      it('should keep kids profile when omitted', async () => {
        findByIdSpy.mockResolvedValue(indoorToddlerFree);
        await service.update('k-indoor', { name: 'Anders' });
        const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
        expect(updated.kidsProfile).toEqual(indoorToddlerFree.kidsProfile);
      });

      it('should remove kids profile when null', async () => {
        findByIdSpy.mockResolvedValue(indoorToddlerFree);
        await service.update('k-indoor', { kidsProfile: null });
        const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
        expect(updated.kidsProfile).toBeNull();
      });

      it('should replace kids profile completely', async () => {
        findByIdSpy.mockResolvedValue(indoorToddlerFree);
        await service.update('k-indoor', {
          kidsProfile: {
            locationType: KidsLocationType.OUTDOOR,
            suitableForToddlers: false,
            suitableForSchoolKids: true,
            isFree: false,
            isBadWeatherTip: true,
          },
        });
        const updated = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
        expect(updated.kidsProfile).toEqual({
          locationType: KidsLocationType.OUTDOOR,
          suitableForToddlers: false,
          suitableForSchoolKids: true,
          isFree: false,
          isBadWeatherTip: true,
          equipmentTags: [],
        });
      });

      it('should set and clear websiteUrl', async () => {
        findByIdSpy.mockResolvedValue(activeSpotA);
        await service.update('s1', { websiteUrl: 'https://example.org' });
        expect((updateSpotSpy.mock.calls[0][1] as CuratedSpot).websiteUrl).toBe(
          'https://example.org',
        );
        await service.update('s1', { websiteUrl: null });
        expect((updateSpotSpy.mock.calls[1][1] as CuratedSpot).websiteUrl).toBeNull();
      });
    });

    describe('persistence', () => {
      it('should never store derived isKidsSpot but return it', async () => {
        const add = jest.fn().mockResolvedValue({ id: 'new-id' });
        const firebase = (service as any).firebaseService as { getFirestore: jest.Mock };
        firebase.getFirestore.mockReturnValue({ collection: () => ({ add }) });
        mockSpotKeywordsService.resolveNewKeywordNamesToIds.mockResolvedValue([]);
        const created = await service.create(
          {
            name: 'Kids',
            descriptionMarkdown: 'Text',
            address: sampleAddress,
            kidsProfile: {
              locationType: KidsLocationType.INDOOR,
              suitableForToddlers: true,
              suitableForSchoolKids: false,
              isFree: false,
              isBadWeatherTip: false,
            },
          },
          'user-1',
        );
        expect(add.mock.calls[0][0]).not.toHaveProperty('isKidsSpot');
        expect(add.mock.calls[0][0].kidsProfile).not.toBeNull();
        expect(created.isKidsSpot).toBe(true);
        expect(created.id).toBe('new-id');
      });
    });

    describe('legacy parsing', () => {
      const parse = (data: Record<string, unknown>): CuratedSpot =>
        (service as any).toCuratedSpot(data, 'legacy-id');

      it('should map documents without kids fields to a non-kids spot', () => {
        const spot = parse({ name: 'Alt', status: CuratedSpotStatus.ACTIVE });
        expect(spot.kidsProfile).toBeNull();
        expect(spot.websiteUrl).toBeNull();
        expect(spot.isKidsSpot).toBe(false);
        expect(spot.kidsNotificationSentAt).toBeNull();
      });

      it('should map malformed kids profile to null', () => {
        expect(parse({ kidsProfile: 'oops' }).kidsProfile).toBeNull();
        expect(parse({ kidsProfile: { locationType: 'MOON' } }).kidsProfile).toBeNull();
      });

      it('should drop unknown equipment tags and duplicates', () => {
        const spot = parse({
          kidsProfile: {
            locationType: KidsLocationType.INDOOR,
            suitableForToddlers: true,
            equipmentTags: [
              KidsEquipmentTag.PLAY_AREA,
              'UNKNOWN_TAG',
              KidsEquipmentTag.PLAY_AREA,
            ],
          },
        });
        expect(spot.kidsProfile?.equipmentTags).toEqual([KidsEquipmentTag.PLAY_AREA]);
        expect(spot.isKidsSpot).toBe(true);
      });
    });

    describe('new kids spot notification', () => {
      const hiddenSpot = (overrides: Partial<CuratedSpot> = {}): CuratedSpot =>
        buildKidsSpot('k-new', 'Neuer Spot', {}, { status: CuratedSpotStatus.PENDING, ...overrides });
      const usersWithPreferences = [
        { id: 'u-on', profile: { notificationPreferences: { newKidsSpots: true } } },
        { id: 'u-off', profile: { notificationPreferences: { newKidsSpots: false } } },
        { id: 'u-empty-prefs', profile: { notificationPreferences: {} } },
        { id: 'u-no-prefs', profile: {} },
      ];

      beforeEach(() => {
        mockUsersService.getAllUserProfilesWithIds.mockResolvedValue(usersWithPreferences);
        updateSpotSpy.mockImplementation((_id: string, s: CuratedSpot) => Promise.resolve(s));
      });

      it('should notify only users with newKidsSpots explicitly enabled on activation', async () => {
        findByIdSpy.mockResolvedValue(hiddenSpot());
        await service.update('k-new', { status: CuratedSpotStatus.ACTIVE });
        expect(mockNotificationService.sendToUsers).toHaveBeenCalledWith(['u-on'], {
          title: 'Neuer Kids-Spot',
          body: 'Neuer Spot ist jetzt in den Kids-Spots verfügbar',
          data: { type: 'NEW_KIDS_SPOT', spotId: 'k-new', spotName: 'Neuer Spot' },
        });
      });

      it('should stamp kidsNotificationSentAt in the same write', async () => {
        findByIdSpy.mockResolvedValue(hiddenSpot());
        await service.update('k-new', { status: CuratedSpotStatus.ACTIVE });
        const persisted = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
        expect(persisted.kidsNotificationSentAt).toMatch(/^\d{4}-/);
      });

      it('should not notify when no user has the preference enabled', async () => {
        mockUsersService.getAllUserProfilesWithIds.mockResolvedValue(
          usersWithPreferences.filter(({ id }) => id !== 'u-on'),
        );
        findByIdSpy.mockResolvedValue(hiddenSpot());
        await service.update('k-new', { status: CuratedSpotStatus.ACTIVE });
        expect(mockNotificationService.sendToUsers).not.toHaveBeenCalled();
      });

      it('should notify when kids profile is added to an already visible spot', async () => {
        const plainVisible: CuratedSpot = { ...withoutProfile, kidsProfile: null };
        findByIdSpy.mockResolvedValue(plainVisible);
        await service.update('plain', {
          kidsProfile: {
            locationType: KidsLocationType.INDOOR,
            suitableForToddlers: true,
            suitableForSchoolKids: false,
            isFree: false,
            isBadWeatherTip: false,
          },
        });
        expect(mockNotificationService.sendToUsers).toHaveBeenCalledTimes(1);
      });

      it('should notify when the first photo makes the spot kids-visible', async () => {
        findByIdSpy.mockResolvedValue(buildKidsSpot('k-photo', 'Foto Spot', {}, { imageUrls: [] }));
        await service.appendImageUrls('k-photo', ['https://img/first.jpg']);
        expect(mockNotificationService.sendToUsers).toHaveBeenCalledTimes(1);
      });

      it('should not notify on create because a new spot has no photo yet', async () => {
        mockSpotKeywordsService.resolveNewKeywordNamesToIds.mockResolvedValue([]);
        createSpotSpy.mockImplementation((s: CuratedSpot) => Promise.resolve(s));
        await service.create(
          {
            name: 'Direkt aktiv',
            descriptionMarkdown: 'Text',
            address: sampleAddress,
            status: CuratedSpotStatus.ACTIVE,
            kidsProfile: {
              locationType: KidsLocationType.INDOOR,
              suitableForToddlers: true,
              suitableForSchoolKids: false,
              isFree: false,
              isBadWeatherTip: false,
            },
          },
          'user-1',
        );
        expect(mockNotificationService.sendToUsers).not.toHaveBeenCalled();
      });

      it('should not notify when the spot stays invisible (no photo)', async () => {
        findByIdSpy.mockResolvedValue(hiddenSpot({ imageUrls: [] }));
        await service.update('k-new', { status: CuratedSpotStatus.ACTIVE });
        expect(mockNotificationService.sendToUsers).not.toHaveBeenCalled();
      });

      it('should not notify on plain edits of an already visible spot', async () => {
        findByIdSpy.mockResolvedValue(indoorToddlerFree);
        await service.update('k-indoor', { name: 'Umbenannt' });
        expect(mockNotificationService.sendToUsers).not.toHaveBeenCalled();
      });

      it('should never notify twice after reactivation', async () => {
        findByIdSpy.mockResolvedValue(
          hiddenSpot({ kidsNotificationSentAt: '2026-01-02T00:00:00.000Z' }),
        );
        await service.update('k-new', { status: CuratedSpotStatus.ACTIVE });
        expect(mockNotificationService.sendToUsers).not.toHaveBeenCalled();
        const persisted = updateSpotSpy.mock.calls[0][1] as CuratedSpot;
        expect(persisted.kidsNotificationSentAt).toBe('2026-01-02T00:00:00.000Z');
      });

      it('should never notify again after removing and re-adding the kids profile', async () => {
        findByIdSpy.mockResolvedValue({
          ...indoorToddlerFree,
          kidsProfile: null,
          kidsNotificationSentAt: '2026-01-02T00:00:00.000Z',
        });
        await service.update('k-indoor', {
          kidsProfile: {
            locationType: KidsLocationType.INDOOR,
            suitableForToddlers: true,
            suitableForSchoolKids: false,
            isFree: false,
            isBadWeatherTip: false,
          },
        });
        expect(mockNotificationService.sendToUsers).not.toHaveBeenCalled();
      });

      it('should still save the spot when sending the notification fails', async () => {
        mockNotificationService.sendToUsers.mockRejectedValue(new Error('FCM down'));
        findByIdSpy.mockResolvedValue(hiddenSpot());
        const result = await service.update('k-new', { status: CuratedSpotStatus.ACTIVE });
        expect(result.status).toBe(CuratedSpotStatus.ACTIVE);
        expect(updateSpotSpy).toHaveBeenCalledTimes(1);
      });

      it('should still save the spot when loading user profiles fails', async () => {
        mockUsersService.getAllUserProfilesWithIds.mockRejectedValue(new Error('db down'));
        findByIdSpy.mockResolvedValue(hiddenSpot());
        const result = await service.update('k-new', { status: CuratedSpotStatus.ACTIVE });
        expect(result.status).toBe(CuratedSpotStatus.ACTIVE);
        expect(mockNotificationService.sendToUsers).not.toHaveBeenCalled();
      });
    });
  });
});
