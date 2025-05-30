import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Event, DailyTimeSlot } from './interfaces/event.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { DateTimeUtils } from '../utils/date-time.utils';
import { EventScraperService } from './event-scraper.service';
import { EventCategory } from './enums/event-category.enum';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly collection = 'events';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly eventScraperService: EventScraperService,
  ) {}

  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(item => this.removeUndefined(item));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.removeUndefined(obj[key]);
      }
      return result;
    }
    return obj;
  }

  private convertDateRangeToDailyTimeSlots(
    startDate: string,
    endDate: string,
    dailyTimeSlots: DailyTimeSlot[],
  ): DailyTimeSlot[] {
    if (dailyTimeSlots?.length > 0) return dailyTimeSlots;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeSlots: DailyTimeSlot[] = [];

    const startTime = startDate.split('T')[1]?.substring(0, 5) || '00:00';
    const endTime = endDate.split('T')[1]?.substring(0, 5) || '23:59';

    for (
      let currentDate = new Date(start);
      currentDate <= end;
      currentDate.setDate(currentDate.getDate() + 1)
    ) {
      const dateString = currentDate.toISOString().split('T')[0];

      timeSlots.push({
        date: dateString,
        from: startTime,
        to: endTime,
      });
    }

    return timeSlots;
  }

  public async getAll(): Promise<Event[]> {
    try {
      this.logger.debug('Getting all events');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collection).get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const { startDate, endDate, ...rest } = data;

        const dailyTimeSlots = this.convertDateRangeToDailyTimeSlots(
          startDate,
          endDate,
          data.dailyTimeSlots,
        );

        return {
          id: doc.id,
          ...rest,
          dailyTimeSlots,
        } as Event;
      });
    } catch (error) {
      this.logger.error(`Error getting all events: ${error.message}`);
      throw error;
    }
  }

  public async getById(id: string): Promise<Event | null> {
    try {
      this.logger.debug(`Getting event ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      const { startDate, endDate, ...rest } = data;

      const dailyTimeSlots = this.convertDateRangeToDailyTimeSlots(
        startDate,
        endDate,
        data.dailyTimeSlots,
      );

      return {
        id: doc.id,
        ...rest,
        dailyTimeSlots,
      } as Event;
    } catch (error) {
      this.logger.error(`Error getting event ${id}: ${error.message}`);
      throw error;
    }
  }

  public async create(data: CreateEventDto): Promise<Event> {
    try {
      this.logger.debug('Creating event');
      const db = this.firebaseService.getFirestore();

      const eventData: Omit<Event, 'id'> = {
        title: data.title,
        description: data.description,
        location: {
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
        },
        imageUrls: [],
        titleImageUrl: '',
        ticketsNeeded: data.ticketsNeeded || false,
        price: data.price || 0,
        categoryId: data.categoryId,
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        website: data.website || '',
        socialMedia: {
          instagram: data.instagram || '',
          facebook: data.facebook || '',
          tiktok: data.tiktok || '',
        },
        isPromoted: data.isPromoted,
        dailyTimeSlots: data.dailyTimeSlots,
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      const docRef = await db.collection(this.collection).add(this.removeUndefined(eventData));

      return {
        id: docRef.id,
        ...eventData,
      };
    } catch (error) {
      this.logger.error(`Error creating event: ${error.message}`);
      throw error;
    }
  }

  public async update(id: string, data: Partial<Event>): Promise<Event> {
    try {
      this.logger.debug(`Updating event ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Event not found');
      }

      const updateData = {
        ...data,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));

      const updatedDoc = await db.collection(this.collection).doc(id).get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      } as Event;
    } catch (error) {
      this.logger.error(`Error updating event ${id}: ${error.message}`);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting event ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Event not found');
      }

      await db.collection(this.collection).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting event ${id}: ${error.message}`);
      throw error;
    }
  }

  public async updateFavoriteCount(eventId: string, increment: boolean): Promise<void> {
    try {
      this.logger.debug(
        `${increment ? 'Incrementing' : 'Decrementing'} favorite count for event ${eventId}`,
      );
      const db = this.firebaseService.getFirestore();
      const eventRef = db.collection(this.collection).doc(eventId);

      await db.runTransaction(async transaction => {
        const eventDoc = await transaction.get(eventRef);

        if (!eventDoc.exists) {
          throw new NotFoundException(`Event with ID ${eventId} not found`);
        }

        const eventData = eventDoc.data();
        const currentCount = eventData.favoriteCount || 0;
        const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);

        transaction.update(eventRef, {
          favoriteCount: newCount,
          updatedAt: DateTimeUtils.getBerlinTime(),
        });
      });

      this.logger.debug(`Successfully updated favorite count for event ${eventId}`);
    } catch (error) {
      this.logger.error(`Error updating favorite count for event ${eventId}: ${error.message}`);
      throw error;
    }
  }

  public async getByIds(ids: string[]): Promise<Event[]> {
    try {
      this.logger.debug(`Getting events by IDs: ${ids.join(', ')}`);

      if (!ids || ids.length === 0) {
        return [];
      }

      const eventPromises = ids.map(id => this.getById(id));
      const events = await Promise.all(eventPromises);

      return events.filter((event): event is Event => event !== null);
    } catch (error) {
      this.logger.error(`Error getting events by IDs: ${error.message}`);
      throw error;
    }
  }

  async importEventsFromEventFinder(
    timeFrame: string = 'naechste-woche',
    category: EventCategory | null,
    maxResults?: number,
  ): Promise<Event[]> {
    try {
      const scrapedEvents = await this.eventScraperService.scrapeEventFinder(
        timeFrame,
        category,
        maxResults,
      );
      this.logger.log(`${scrapedEvents.length} Events wurden erfolgreich importiert`);
      return scrapedEvents;
    } catch (error) {
      this.logger.error('Fehler beim Importieren der Events:', error);
      throw error;
    }
  }
}
