import { Event } from '../interfaces/event.interface';
import { EventStatus } from '../enums/event-status.enum';

function escapeCsvValue(value: string | number | boolean): string {
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function eventsToCsv(events: Event[]): string {
  const headers = [
    'id',
    'title',
    'status',
    'categoryId',
    'startDate',
    'location',
    'isPromoted',
  ];
  const rows = events.map(event => [
    event.id,
    event.title,
    event.status ?? EventStatus.ACTIVE,
    event.categoryId ?? '',
    event.startDate ?? event.dailyTimeSlots?.[0]?.date ?? '',
    event.location?.address ?? '',
    event.isPromoted ?? false,
  ]);
  return [headers.join(','), ...rows.map(row => row.map(escapeCsvValue).join(','))].join('\n');
}
