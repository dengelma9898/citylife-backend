import { AdventCalendarEntry } from '../entities/advent-calendar-entry.entity';

export const ADVENT_CALENDAR_ENTRY_REPOSITORY = 'ADVENT_CALENDAR_ENTRY_REPOSITORY';

export interface AdventCalendarEntryRepository {
  findAll(): Promise<AdventCalendarEntry[]>;
  findById(id: string): Promise<AdventCalendarEntry | null>;
  findByNumber(number: number): Promise<AdventCalendarEntry | null>;
  create(entry: AdventCalendarEntry): Promise<AdventCalendarEntry>;
  update(id: string, entry: AdventCalendarEntry): Promise<AdventCalendarEntry>;
  delete(id: string): Promise<void>;
}

