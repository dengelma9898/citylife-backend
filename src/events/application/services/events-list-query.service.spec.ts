import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ForbiddenException } from '@nestjs/common';
import { EventsListQueryService } from './events-list-query.service';
import { EventsService } from '../../events.service';
import { Event } from '../../interfaces/event.interface';
import { EventStatus } from '../../enums/event-status.enum';
import { EVENTS_LIST_CACHE_KEY } from '../../constants/events-list-cache.constants';

describe('EventsListQueryService', () => {
  let service: EventsListQueryService;
  let mockEventsService: { getAllUnfiltered: jest.Mock };
  let mockCacheManager: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  const activeEvent: Event = {
    id: 'active-1',
    title: 'Active Event',
    description: 'Desc',
    location: { address: 'A', latitude: 0, longitude: 0 },
    categoryId: 'cat-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    status: EventStatus.ACTIVE,
    dailyTimeSlots: [{ date: '2026-12-01' }],
  };

  const pendingEvent: Event = {
    ...activeEvent,
    id: 'pending-1',
    title: 'Pending Event',
    status: EventStatus.PENDING,
    updatedAt: '2026-01-03T00:00:00.000Z',
  };

  beforeEach(async () => {
    mockEventsService = {
      getAllUnfiltered: jest.fn().mockResolvedValue([activeEvent, pendingEvent]),
    };
    mockCacheManager = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsListQueryService,
        { provide: EventsService, useValue: mockEventsService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();
    service = module.get(EventsListQueryService);
  });

  it('should return paginated public events for non-admin', async () => {
    const result = await service.queryEvents({ page: 1, limit: 10 }, false);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('active-1');
    expect(result.meta.total).toBe(1);
  });

  it('should include pending events for admin by default', async () => {
    const result = await service.queryEvents({ page: 1, limit: 10 }, true);
    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
  });

  it('should reject pending approval filter for non-admin', async () => {
    await expect(service.queryEvents({ approval: 'pending' }, false)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should use cache on second load', async () => {
    await service.queryEvents({ page: 1, limit: 10 }, true);
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      EVENTS_LIST_CACHE_KEY,
      [activeEvent, pendingEvent],
      expect.any(Number),
    );
    mockCacheManager.get.mockResolvedValue([activeEvent, pendingEvent]);
    await service.queryEvents({ page: 1, limit: 10 }, true);
    expect(mockEventsService.getAllUnfiltered).toHaveBeenCalledTimes(1);
  });

  it('should invalidate cache', async () => {
    await service.invalidateListCache();
    expect(mockCacheManager.del).toHaveBeenCalledWith(EVENTS_LIST_CACHE_KEY);
  });

  it('should return facets for admin when requested', async () => {
    const result = await service.queryEvents({ page: 1, limit: 10, facets: true }, true);
    expect(result.facets?.pendingCount).toBe(1);
    expect(result.facets?.monthOptions.length).toBeGreaterThan(0);
  });

  it('should count filtered events', async () => {
    const result = await service.countEvents({ approval: 'pending' }, true);
    expect(result.count).toBe(1);
  });
});
