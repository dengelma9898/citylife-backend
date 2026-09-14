import { Event } from '../interfaces/event.interface';
import { EventStatus } from '../enums/event-status.enum';
import {
  formatSlotMonthKey,
  getSlotCalendarWeek,
  hasDateInfo,
  isFutureDate,
  isPastDate,
  isWithinDateInterval,
  monthYearToDate,
  startOfDay,
} from './event-list-date.util';

export interface EventListFilterParams {
  q?: string;
  status?: string;
  approval?: string;
  category?: string;
  date?: string;
  time?: string;
  week?: string;
  month?: string;
}

export function matchesCategoryFilter(event: Event, categoryFilter: string): boolean {
  return (
    categoryFilter === 'all' ||
    (categoryFilter === 'no-category' && (!event.categoryId || event.categoryId === 'default')) ||
    (categoryFilter !== 'no-category' && event.categoryId === categoryFilter)
  );
}

export function isPubliclyVisibleStatus(status?: EventStatus): boolean {
  return status === undefined || status === EventStatus.ACTIVE;
}

export function filterEventsByApproval(
  events: Event[],
  approval: string | undefined,
  isAdmin: boolean,
): Event[] {
  const effectiveApproval = approval ?? (isAdmin ? 'all' : 'active');
  if (effectiveApproval === 'pending') {
    return events.filter(event => event.status === EventStatus.PENDING);
  }
  if (effectiveApproval === 'active') {
    return events.filter(event => isPubliclyVisibleStatus(event.status));
  }
  return events;
}

export function filterEvents(events: Event[], params: EventListFilterParams): Event[] {
  const {
    q = '',
    status: statusFilter = 'all',
    approval,
    category: categoryFilter = 'all',
    date: dateFilter = 'all',
    time: timeFilter = 'all',
    week: selectedWeek = '',
    month: selectedMonth = '',
  } = params;
  const searchQuery = q.trim().toLowerCase();
  return events.filter(event => {
    const matchesSearch =
      searchQuery.length === 0 || event.title.toLowerCase().includes(searchQuery);
    if (!matchesSearch) {
      return false;
    }
    const isPendingModeration = event.status === EventStatus.PENDING;
    const effectiveApproval = approval ?? 'all';
    const matchesApproval =
      effectiveApproval === 'all' ||
      (effectiveApproval === 'pending' && isPendingModeration) ||
      (effectiveApproval === 'active' && !isPendingModeration);
    if (!matchesApproval) {
      return false;
    }
    const eventHasDate = hasDateInfo(event);
    const matchesDateFilter =
      dateFilter === 'all' ||
      (dateFilter === 'with-date' && eventHasDate) ||
      (dateFilter === 'no-date' && !eventHasDate);
    if (!matchesDateFilter) {
      return false;
    }
    let matchesStatus = true;
    if (event.dailyTimeSlots?.length) {
      const firstSlot = event.dailyTimeSlots[0];
      const lastSlot = event.dailyTimeSlots[event.dailyTimeSlots.length - 1];
      const firstDate = new Date(firstSlot.date);
      const lastDate = new Date(lastSlot.date);
      matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'past' && isPastDate(lastDate)) ||
        (statusFilter === 'running' && isWithinDateInterval(new Date(), firstDate, lastDate)) ||
        (statusFilter === 'future' && isFutureDate(firstDate));
    } else if (event.monthYear) {
      matchesStatus = true;
    } else if (statusFilter !== 'all') {
      matchesStatus = false;
    }
    const matchesCategory = matchesCategoryFilter(event, categoryFilter);
    let matchesTime = true;
    if (timeFilter === 'week') {
      if (!selectedWeek || !event.dailyTimeSlots?.length) {
        matchesTime = false;
      } else {
        const currentYear = new Date().getFullYear();
        matchesTime = event.dailyTimeSlots.some(slot => {
          const slotWeekInfo = getSlotCalendarWeek(slot.date);
          if (!slotWeekInfo) {
            return false;
          }
          return slotWeekInfo.year === currentYear && slotWeekInfo.week === selectedWeek;
        });
      }
    } else if (timeFilter === 'month') {
      if (!selectedMonth) {
        matchesTime = false;
      } else if (event.dailyTimeSlots?.length) {
        matchesTime = event.dailyTimeSlots.some(
          slot => formatSlotMonthKey(slot.date) === selectedMonth,
        );
      } else if (event.monthYear) {
        const parsedMonthYearDate = monthYearToDate(event.monthYear);
        if (!parsedMonthYearDate) {
          matchesTime = false;
        } else {
          const monthKey = `${parsedMonthYearDate.getFullYear()}-${String(parsedMonthYearDate.getMonth() + 1).padStart(2, '0')}`;
          matchesTime = monthKey === selectedMonth;
        }
      } else {
        matchesTime = false;
      }
    }
    return matchesSearch && matchesStatus && matchesCategory && matchesTime;
  });
}

export function requiresModerationAccess(approval?: string): boolean {
  return approval === 'pending' || approval === 'all';
}

export const PAGINATED_EVENTS_QUERY_KEYS = [
  'page',
  'limit',
  'q',
  'status',
  'approval',
  'category',
  'date',
  'time',
  'week',
  'month',
  'sort',
  'order',
  'facets',
] as const;

export function isPaginatedEventsRequest(query: Record<string, unknown>): boolean {
  return PAGINATED_EVENTS_QUERY_KEYS.some(key => {
    const value = query[key];
    return value !== undefined && value !== null && value !== '';
  });
}
