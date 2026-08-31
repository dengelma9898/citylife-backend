import { Event } from '../interfaces/event.interface';
import { EventStatus } from '../enums/event-status.enum';
import {
  filterEvents,
  filterEventsByApproval,
  isPaginatedEventsRequest,
  matchesCategoryFilter,
  requiresModerationAccess,
} from './event-list-filter.util';

function createEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    title: 'Konzert in Nürnberg',
    description: 'Beschreibung',
    location: { address: 'Test', latitude: 0, longitude: 0 },
    categoryId: 'cat-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    status: EventStatus.ACTIVE,
    ...overrides,
  };
}

describe('event-list-filter.util', () => {
  describe('matchesCategoryFilter', () => {
    it('should match no-category for missing and default categoryId', () => {
      expect(matchesCategoryFilter(createEvent({ categoryId: undefined as unknown as string }), 'no-category')).toBe(true);
      expect(matchesCategoryFilter(createEvent({ categoryId: 'default' }), 'no-category')).toBe(true);
      expect(matchesCategoryFilter(createEvent({ categoryId: 'cat-1' }), 'no-category')).toBe(false);
    });
  });

  describe('filterEventsByApproval', () => {
    const events = [
      createEvent({ id: 'active', status: EventStatus.ACTIVE }),
      createEvent({ id: 'pending', status: EventStatus.PENDING }),
    ];

    it('should return only public events for non-admin default', () => {
      const result = filterEventsByApproval(events, undefined, false);
      expect(result.map(event => event.id)).toEqual(['active']);
    });

    it('should return all events for admin default', () => {
      const result = filterEventsByApproval(events, undefined, true);
      expect(result).toHaveLength(2);
    });

    it('should return pending events for approval=pending', () => {
      const result = filterEventsByApproval(events, 'pending', true);
      expect(result.map(event => event.id)).toEqual(['pending']);
    });
  });

  describe('filterEvents', () => {
    it('should filter by title search', () => {
      const events = [
        createEvent({ id: '1', title: 'Jazz Night' }),
        createEvent({ id: '2', title: 'Rock Festival' }),
      ];
      const result = filterEvents(events, { q: 'jazz' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should always include monthYear-only events for status filter', () => {
      const events = [
        createEvent({
          id: 'month-only',
          monthYear: '12.2099',
          dailyTimeSlots: [],
        }),
      ];
      const result = filterEvents(events, { status: 'past' });
      expect(result).toHaveLength(1);
    });

    it('should exclude events without date for non-all status filter', () => {
      const events = [createEvent({ id: 'no-date', dailyTimeSlots: [], monthYear: undefined })];
      const result = filterEvents(events, { status: 'future' });
      expect(result).toHaveLength(0);
    });

    it('should filter by date with-date and no-date', () => {
      const events = [
        createEvent({ id: 'with-date', dailyTimeSlots: [{ date: '2026-08-01' }] }),
        createEvent({ id: 'no-date', dailyTimeSlots: [] }),
      ];
      expect(filterEvents(events, { date: 'with-date' }).map(event => event.id)).toEqual([
        'with-date',
      ]);
      expect(filterEvents(events, { date: 'no-date' }).map(event => event.id)).toEqual(['no-date']);
    });
  });

  describe('isPaginatedEventsRequest', () => {
    it('should detect paginated requests by query keys', () => {
      expect(isPaginatedEventsRequest({})).toBe(false);
      expect(isPaginatedEventsRequest({ page: '1' })).toBe(true);
      expect(isPaginatedEventsRequest({ limit: '50' })).toBe(true);
      expect(isPaginatedEventsRequest({ q: 'test' })).toBe(true);
    });
  });

  describe('requiresModerationAccess', () => {
    it('should require moderation access for pending and all', () => {
      expect(requiresModerationAccess('pending')).toBe(true);
      expect(requiresModerationAccess('all')).toBe(true);
      expect(requiresModerationAccess('active')).toBe(false);
      expect(requiresModerationAccess(undefined)).toBe(false);
    });
  });
});
