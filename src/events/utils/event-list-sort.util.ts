import { Event } from '../interfaces/event.interface';
import { getEventStartDate } from './event-list-date.util';

export type EventListSortField = 'startDate' | 'updatedAt';
export type EventListSortOrder = 'asc' | 'desc';

export function sortEvents(
  events: Event[],
  sort: EventListSortField = 'startDate',
  order: EventListSortOrder = 'desc',
): Event[] {
  const direction = order === 'asc' ? 1 : -1;
  return [...events].sort((left, right) => {
    if (sort === 'startDate') {
      return compareByStartDate(left, right, direction);
    }
    const comparison = new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
    if (comparison !== 0) {
      return comparison * direction;
    }
    return left.id.localeCompare(right.id);
  });
}

function compareByStartDate(left: Event, right: Event, direction: number): number {
  const leftStart = getEventStartDate(left);
  const rightStart = getEventStartDate(right);
  if (!leftStart && !rightStart) {
    return left.id.localeCompare(right.id);
  }
  if (!leftStart) {
    return 1;
  }
  if (!rightStart) {
    return -1;
  }
  const comparison = leftStart.getTime() - rightStart.getTime();
  if (comparison !== 0) {
    return comparison * direction;
  }
  return left.id.localeCompare(right.id);
}

export function paginateEvents<T>(
  items: T[],
  page: number,
  limit: number,
): {
  data: T[];
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const safePage = Math.max(1, page);
  const startIndex = (safePage - 1) * limit;
  const data = items.slice(startIndex, startIndex + limit);
  return {
    data,
    total,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1 && totalPages > 0,
  };
}
