import { Injectable, Logger } from '@nestjs/common';
import { Event, DailyTimeSlot } from '../../interfaces/event.interface';

/**
 * Normalisiert und vervollständigt Events aus LLM-Extraktion
 * Ergänzt fehlende Felder (id, timestamps) und validiert Daten
 */
@Injectable()
export class EventNormalizerService {
  private readonly logger = new Logger(EventNormalizerService.name);

  /**
   * Normalisiert ein Array von Partial-Events zu vollständigen Events
   * @param partialEvents - Events aus LLM-Extraktion (ohne id/timestamps)
   * @returns Vollständige Events
   */
  async normalize(partialEvents: Partial<Event>[]): Promise<Event[]> {
    return partialEvents.map(partial => this.completeEvent(partial));
  }

  /**
   * Ergänzt fehlende Felder eines Events
   * @param partial - Partielles Event
   * @returns Vollständiges Event
   */
  private completeEvent(partial: Partial<Event>): Event {
    const now = new Date().toISOString();

    const event: Event = {
      id: crypto.randomUUID(),
      title: partial.title || '',
      description: partial.description || '',
      location: this.ensureLocationFormat(partial.location),
      dailyTimeSlots: this.validateAndFixDailyTimeSlots(partial.dailyTimeSlots),
      categoryId: this.mapCategoryId(partial.categoryId),
      createdAt: now,
      updatedAt: now,
    };

    // Optionale Felder hinzufügen falls vorhanden
    if (partial.price !== undefined) {
      event.price = partial.price;
    }
    if (partial.priceString) {
      event.priceString = partial.priceString;
    }
    // titleImageUrl und imageUrls werden NICHT vom LLM gesetzt - Bilder werden vom System selbst bereitgestellt
    if (partial.website) {
      event.website = partial.website;
    }
    if (partial.contactEmail) {
      event.contactEmail = partial.contactEmail;
    }
    if (partial.contactPhone) {
      event.contactPhone = partial.contactPhone;
    }
    if (partial.socialMedia) {
      event.socialMedia = partial.socialMedia;
    }
    if (partial.ticketsNeeded !== undefined) {
      event.ticketsNeeded = partial.ticketsNeeded;
    }
    // isPromoted wird NICHT vom LLM gesetzt - diese Entscheidung liegt allein beim System

    return event;
  }

  /**
   * Validiert und korrigiert dailyTimeSlots
   * @param slots - Time-Slots aus LLM
   * @returns Validierte Time-Slots
   */
  private validateAndFixDailyTimeSlots(slots?: DailyTimeSlot[]): DailyTimeSlot[] {
    if (!slots || slots.length === 0) {
      return [];
    }

    return slots
      .filter(slot => {
        // Validiere ISO-Datum-Format
        if (!slot.date || !/^\d{4}-\d{2}-\d{2}$/.test(slot.date)) {
          this.logger.warn(`Ungültiges Datum in dailyTimeSlot: ${slot.date}`);
          return false;
        }
        return true;
      })
      .map(slot => ({
        date: slot.date,
        from: slot.from && /^\d{2}:\d{2}$/.test(slot.from) ? slot.from : undefined,
        to: slot.to && /^\d{2}:\d{2}$/.test(slot.to) ? slot.to : undefined,
      }));
  }

  /**
   * Sichert korrektes Location-Format
   * @param location - Location aus LLM
   * @returns Validierte Location
   */
  private ensureLocationFormat(location?: any): {
    address: string;
    latitude: number;
    longitude: number;
  } {
    if (!location || typeof location !== 'object') {
      return { address: '', latitude: 0, longitude: 0 };
    }

    return {
      address: location.address || '',
      latitude: typeof location.latitude === 'number' ? location.latitude : 0,
      longitude: typeof location.longitude === 'number' ? location.longitude : 0,
    };
  }

  /**
   * Validiert und mappt categoryId
   * @param categoryId - Kategorie-ID aus LLM
   * @returns Validierte categoryId
   */
  private mapCategoryId(categoryId?: string): string {
    if (!categoryId || typeof categoryId !== 'string') {
      return 'default';
    }

    // Validiere bekannte Kategorien (kann später erweitert werden)
    const validCategories = [
      'konzert',
      'party',
      'theater',
      'ausstellung',
      'sport',
      'kinder',
      'sonstiges',
      'default',
    ];
    const normalized = categoryId.toLowerCase().trim();

    return validCategories.includes(normalized) ? normalized : 'default';
  }
}
