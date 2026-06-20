import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { Event, DailyTimeSlot } from './interfaces/event.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { DateTimeUtils } from '../utils/date-time.utils';
import { NotificationService } from '../notifications/application/services/notification.service';
import { UsersService } from '../users/users.service';
import { EventStatus } from './enums/event-status.enum';
import { EventCategoriesService } from '../event-categories/services/event-categories.service';
import {
  BulkUpdateEventCategoryItemResult,
  BulkUpdateEventCategoryResult,
} from './dto/bulk-update-event-category-result.dto';
import { removeUndefined } from '../firebase/firebase-mapper.util';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly collection = 'events';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly eventCategoriesService: EventCategoriesService,
  ) {}

  /**
   * Documents without `status` are treated as public (backwards compatibility).
   */
  private isPubliclyVisibleStatus(status?: EventStatus): boolean {
    return status === undefined || status === EventStatus.ACTIVE;
  }

  private convertDateRangeToDailyTimeSlots(
    startDate: string | undefined,
    endDate: string | undefined,
    dailyTimeSlots: DailyTimeSlot[],
  ): DailyTimeSlot[] {
    if (dailyTimeSlots?.length > 0) return dailyTimeSlots;

    // Wenn startDate oder endDate fehlen, gib leeres Array zurück
    if (!startDate || !endDate) {
      this.logger.warn('startDate or endDate is missing, returning empty dailyTimeSlots');
      return [];
    }

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
      const mapped = snapshot.docs.map(doc => {
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
      return mapped.filter(e => this.isPubliclyVisibleStatus(e.status));
    } catch (error) {
      this.logger.error(`Error getting all events: ${error.message}`);
      throw error;
    }
  }

  /**
   * @param includePendingInResult When false, events with status PENDING are hidden (returns null).
   */
  public async getById(
    id: string,
    options: { includePendingInResult?: boolean } = {},
  ): Promise<Event | null> {
    const { includePendingInResult = false } = options;
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

      const event = {
        id: doc.id,
        ...rest,
        dailyTimeSlots,
      } as Event;
      if (!includePendingInResult && !this.isPubliclyVisibleStatus(event.status)) {
        return null;
      }
      return event;
    } catch (error) {
      this.logger.error(`Error getting event ${id}: ${error.message}`);
      throw error;
    }
  }

  public async getPendingEvents(): Promise<Event[]> {
    try {
      this.logger.debug('Getting pending events');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.collection)
        .where('status', '==', EventStatus.PENDING)
        .get();
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
      this.logger.error(`Error getting pending events: ${error.message}`);
      throw error;
    }
  }

  /**
   * Freigabe: PENDING → ACTIVE und einmalige NEW_EVENT-Benachrichtigung.
   */
  public async approveEvent(id: string): Promise<Event> {
    const event = await this.getById(id, { includePendingInResult: true });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.status !== EventStatus.PENDING) {
      throw new BadRequestException('Event is not pending approval');
    }
    await this.update(id, { status: EventStatus.ACTIVE });
    const active = await this.getById(id, { includePendingInResult: true });
    if (!active) {
      throw new NotFoundException('Event not found');
    }
    await this.sendNewEventNotification(active).catch(error => {
      this.logger.error(`Error sending new event notification: ${error.message}`, error.stack);
    });
    return active;
  }

  public async create(data: CreateEventDto, initialStatus: EventStatus): Promise<Event> {
    try {
      this.logger.debug('Creating event');
      const db = this.firebaseService.getFirestore();

      const eventData: Omit<Event, 'id'> = {
        status: initialStatus,
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
        priceString: data.priceString,
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
        monthYear: data.monthYear,
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      const docRef = await db.collection(this.collection).add(removeUndefined(eventData));

      const createdEvent = {
        id: docRef.id,
        ...eventData,
      };

      if (initialStatus === EventStatus.ACTIVE) {
        await this.sendNewEventNotification(createdEvent).catch(error => {
          this.logger.error(`Error sending new event notification: ${error.message}`, error.stack);
        });
      }

      return createdEvent;
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

      const oldEventData = doc.data();
      const { startDate, endDate, ...oldRest } = oldEventData;
      const oldDailyTimeSlots = this.convertDateRangeToDailyTimeSlots(
        startDate,
        endDate,
        oldEventData.dailyTimeSlots,
      );
      const oldEvent: Event = {
        id: doc.id,
        ...oldRest,
        dailyTimeSlots: oldDailyTimeSlots,
      } as Event;

      const updateData = {
        ...data,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      await db.collection(this.collection).doc(id).update(removeUndefined(updateData));

      const updatedDoc = await db.collection(this.collection).doc(id).get();
      const updatedData = updatedDoc.data();
      const { startDate: newStartDate, endDate: newEndDate, ...newRest } = updatedData;
      const newDailyTimeSlots = this.convertDateRangeToDailyTimeSlots(
        newStartDate,
        newEndDate,
        updatedData.dailyTimeSlots,
      );
      const updatedEvent: Event = {
        id: updatedDoc.id,
        ...newRest,
        dailyTimeSlots: newDailyTimeSlots,
      } as Event;

      const shouldNotifyFavorites =
        this.isPubliclyVisibleStatus(oldEvent.status) &&
        this.isPubliclyVisibleStatus(updatedEvent.status);
      if (shouldNotifyFavorites) {
        await this.sendEventUpdateNotification(updatedEvent, oldEvent).catch(error => {
          this.logger.error(
            `Error sending event update notification: ${error.message}`,
            error.stack,
          );
        });
      }

      return updatedEvent;
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

  /**
   * Sucht nach einem existierenden Event mit gleichem Titel und mindestens einem übereinstimmenden Datum
   * Wird für die Duplikatsprüfung beim CSV-Import verwendet
   *
   * @param title - Titel des Events (wird case-insensitive verglichen)
   * @param dates - Array von Datum-Strings im Format YYYY-MM-DD
   * @returns Gefundenes Event oder null wenn kein Duplikat
   */
  public async findByTitleAndDate(title: string, dates: string[]): Promise<Event | null> {
    try {
      this.logger.debug(`Checking for duplicate: title="${title}", dates=${dates.join(', ')}`);
      const normalizedTitle = title.toLowerCase().trim();
      const allEvents = await this.getAll();
      const duplicate = allEvents.find(event => {
        const eventTitleNormalized = event.title.toLowerCase().trim();
        if (eventTitleNormalized !== normalizedTitle) {
          return false;
        }
        const eventDates = (event.dailyTimeSlots || []).map(slot => slot.date);
        return dates.some(date => eventDates.includes(date));
      });
      if (duplicate) {
        this.logger.debug(`Duplicate found: ${duplicate.id} - ${duplicate.title}`);
      }
      return duplicate || null;
    } catch (error) {
      this.logger.error(`Error checking for duplicate event: ${error.message}`);
      throw error;
    }
  }

  public async getByIds(
    ids: string[],
    options: { includeAllStatuses?: boolean } = {},
  ): Promise<Event[]> {
    const { includeAllStatuses = false } = options;
    try {
      this.logger.debug(`Getting events by IDs: ${ids.join(', ')}`);

      if (!ids || ids.length === 0) {
        return [];
      }

      const eventPromises = ids.map(id =>
        this.getById(id, { includePendingInResult: includeAllStatuses }),
      );
      const events = await Promise.all(eventPromises);

      return events.filter((event): event is Event => event !== null);
    } catch (error) {
      this.logger.error(`Error getting events by IDs: ${error.message}`);
      throw error;
    }
  }

  private async sendNewEventNotification(event: Event): Promise<void> {
    try {
      this.logger.log(`[NOTIFICATION] Starting notification process for event ${event.id}`);
      this.logger.debug(`[NOTIFICATION] Event title: ${event.title}`);
      const allUsers = await this.usersService.getAllUserProfilesWithIds();
      this.logger.debug(`[NOTIFICATION] Found ${allUsers.length} total users`);
      const usersToNotify = allUsers.filter(({ id, profile }) => {
        const notificationPreferences = profile.notificationPreferences;
        const newEventsEnabled =
          notificationPreferences?.newEvents !== undefined
            ? notificationPreferences.newEvents
            : true;
        if (!newEventsEnabled) {
          this.logger.debug(`[NOTIFICATION] User ${id} has newEvents disabled`);
        }
        return newEventsEnabled;
      });
      this.logger.log(
        `[NOTIFICATION] Filtered to ${usersToNotify.length} users with newEvents enabled`,
      );
      if (usersToNotify.length === 0) {
        this.logger.warn(`[NOTIFICATION] No users to notify for event ${event.id}`);
        return;
      }
      const sendPromises = usersToNotify.map(async ({ id }) => {
        try {
          this.logger.debug(`[NOTIFICATION] Sending to user ${id}`);
          await this.notificationService.sendToUser(id, {
            title: 'Neues Event verfügbar',
            body: `${event.title} - ${event.categoryId}`,
            data: {
              type: 'NEW_EVENT',
              eventId: event.id,
              eventTitle: event.title,
              categoryId: event.categoryId,
            },
          });
          this.logger.debug(`[NOTIFICATION] Successfully sent to user ${id}`);
        } catch (error: any) {
          this.logger.error(
            `[NOTIFICATION] Error sending notification to user ${id}: ${error.message}`,
            error.stack,
          );
        }
      });
      await Promise.all(sendPromises);
      this.logger.log(
        `[NOTIFICATION] Completed notification process for event ${event.id}. Sent to ${usersToNotify.length} users.`,
      );
    } catch (error: any) {
      this.logger.error(
        `[NOTIFICATION] Error sending new event notification for event ${event.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  private determineUpdateType(
    oldEvent: Event,
    newEvent: Event,
  ): 'TIME' | 'LOCATION' | 'DESCRIPTION' | 'OTHER' {
    const oldTimeSlots = JSON.stringify(oldEvent.dailyTimeSlots || []);
    const newTimeSlots = JSON.stringify(newEvent.dailyTimeSlots || []);
    if (oldTimeSlots !== newTimeSlots) {
      return 'TIME';
    }
    const oldLocation = JSON.stringify(oldEvent.location);
    const newLocation = JSON.stringify(newEvent.location);
    if (oldLocation !== newLocation) {
      return 'LOCATION';
    }
    if (oldEvent.title !== newEvent.title || oldEvent.description !== newEvent.description) {
      return 'DESCRIPTION';
    }
    return 'OTHER';
  }

  private async sendEventUpdateNotification(event: Event, oldEvent: Event): Promise<void> {
    try {
      this.logger.log(`[NOTIFICATION] Starting update notification process for event ${event.id}`);
      this.logger.debug(`[NOTIFICATION] Event title: ${event.title}`);
      const allUsers = await this.usersService.getAllUserProfilesWithIds();
      this.logger.debug(`[NOTIFICATION] Found ${allUsers.length} total users`);
      const updateType = this.determineUpdateType(oldEvent, event);
      this.logger.debug(`[NOTIFICATION] Update type: ${updateType}`);
      const usersToNotify = allUsers.filter(({ id, profile }) => {
        const favoriteEventIds = profile.favoriteEventIds || [];
        const hasEventFavorited = favoriteEventIds.includes(event.id);
        if (!hasEventFavorited) {
          return false;
        }
        const notificationPreferences = profile.notificationPreferences;
        const eventUpdatesEnabled =
          notificationPreferences?.eventUpdates !== undefined
            ? notificationPreferences.eventUpdates
            : true;
        if (!eventUpdatesEnabled) {
          this.logger.debug(`[NOTIFICATION] User ${id} has eventUpdates disabled`);
        }
        return eventUpdatesEnabled;
      });
      this.logger.log(
        `[NOTIFICATION] Filtered to ${usersToNotify.length} users with event favorited and eventUpdates enabled`,
      );
      if (usersToNotify.length === 0) {
        this.logger.warn(`[NOTIFICATION] No users to notify for event update ${event.id}`);
        return;
      }
      const sendPromises = usersToNotify.map(async ({ id }) => {
        try {
          this.logger.debug(`[NOTIFICATION] Sending to user ${id}`);
          await this.notificationService.sendToUser(id, {
            title: 'Event wurde aktualisiert',
            body: `${event.title} wurde aktualisiert`,
            data: {
              type: 'FAV_EVENT_UPDATE',
              eventId: event.id,
              eventTitle: event.title,
              updateType,
            },
          });
          this.logger.debug(`[NOTIFICATION] Successfully sent to user ${id}`);
        } catch (error: any) {
          this.logger.error(
            `[NOTIFICATION] Error sending notification to user ${id}: ${error.message}`,
            error.stack,
          );
        }
      });
      await Promise.all(sendPromises);
      this.logger.log(
        `[NOTIFICATION] Completed update notification process for event ${event.id}. Sent to ${usersToNotify.length} users.`,
      );
    } catch (error: any) {
      this.logger.error(
        `[NOTIFICATION] Error sending event update notification for event ${event.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Weist mehreren Events dieselbe Kategorie zu (Admin-Bulk-Update).
   */
  public async bulkUpdateCategory(
    eventIds: string[],
    categoryId: string,
  ): Promise<BulkUpdateEventCategoryResult> {
    const category = await this.eventCategoriesService.findOne(categoryId);
    if (!category) {
      throw new BadRequestException('categoryId muss eine gültige Event-Kategorie sein');
    }
    const uniqueEventIds = [...new Set(eventIds)];
    const results: BulkUpdateEventCategoryItemResult[] = [];
    for (const eventId of uniqueEventIds) {
      try {
        const existing = await this.getById(eventId, { includePendingInResult: true });
        if (!existing) {
          results.push({
            eventId,
            success: false,
            message: 'Event not found',
          });
          continue;
        }
        if (existing.categoryId === categoryId) {
          results.push({
            eventId,
            success: true,
            event: existing,
          });
          continue;
        }
        const updated = await this.update(eventId, { categoryId });
        results.push({
          eventId,
          success: true,
          event: updated,
        });
      } catch (error: any) {
        this.logger.error(
          `Error bulk-updating category for event ${eventId}: ${error.message}`,
        );
        results.push({
          eventId,
          success: false,
          message: error.message ?? 'Unknown error',
        });
      }
    }
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    this.logger.log(
      `Bulk category update completed: ${successful} successful, ${failed} failed`,
    );
    return {
      total: results.length,
      successful,
      failed,
      results,
    };
  }
}
