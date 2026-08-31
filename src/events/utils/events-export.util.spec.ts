import { eventsToCsv } from './events-export.util';
import { Event } from '../interfaces/event.interface';
import { EventStatus } from '../enums/event-status.enum';

describe('events-export.util', () => {
  it('should convert events to csv with headers', () => {
    const events: Event[] = [
      {
        id: '1',
        title: 'Test, Event',
        description: 'Desc',
        location: { address: 'Street 1', latitude: 0, longitude: 0 },
        categoryId: 'cat-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        status: EventStatus.ACTIVE,
        dailyTimeSlots: [{ date: '2026-08-01' }],
        isPromoted: true,
      },
    ];
    const csv = eventsToCsv(events);
    expect(csv).toContain('id,title,status,categoryId,startDate,location,isPromoted');
    expect(csv).toContain('"Test, Event"');
    expect(csv).toContain('2026-08-01');
  });
});
