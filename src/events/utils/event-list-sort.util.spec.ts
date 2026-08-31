import { Event } from '../interfaces/event.interface';
import { paginateEvents, sortEvents } from './event-list-sort.util';

function createEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: overrides.id ?? 'event-1',
    title: 'Event',
    description: 'Beschreibung',
    location: { address: 'Test', latitude: 0, longitude: 0 },
    categoryId: 'cat-1',
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
    dailyTimeSlots: overrides.dailyTimeSlots,
    monthYear: overrides.monthYear,
    ...overrides,
  };
}

describe('event-list-sort.util', () => {
  describe('sortEvents', () => {
    it('should sort by startDate descending with no-date events last', () => {
      const events = [
        createEvent({ id: 'b', dailyTimeSlots: [{ date: '2026-02-01' }] }),
        createEvent({ id: 'a', dailyTimeSlots: [{ date: '2026-03-01' }] }),
        createEvent({ id: 'c', dailyTimeSlots: [] }),
      ];
      const sorted = sortEvents(events, 'startDate', 'desc');
      expect(sorted.map(event => event.id)).toEqual(['a', 'b', 'c']);
    });

    it('should use id as tie-breaker', () => {
      const events = [
        createEvent({ id: 'b', updatedAt: '2026-01-02T00:00:00.000Z' }),
        createEvent({ id: 'a', updatedAt: '2026-01-02T00:00:00.000Z' }),
      ];
      const sorted = sortEvents(events, 'updatedAt', 'desc');
      expect(sorted.map(event => event.id)).toEqual(['a', 'b']);
    });
  });

  describe('paginateEvents', () => {
    it('should paginate items and compute meta flags', () => {
      const items = ['a', 'b', 'c', 'd', '5'];
      const page1 = paginateEvents(items, 1, 2);
      expect(page1.data).toEqual(['a', 'b']);
      expect(page1.total).toBe(5);
      expect(page1.totalPages).toBe(3);
      expect(page1.hasNextPage).toBe(true);
      expect(page1.hasPreviousPage).toBe(false);
      const page2 = paginateEvents(items, 2, 2);
      expect(page2.hasPreviousPage).toBe(true);
      expect(page2.hasNextPage).toBe(true);
    });
  });
});
