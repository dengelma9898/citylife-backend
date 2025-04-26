import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { Event } from './interfaces/event.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  constructor(private readonly firebaseService: FirebaseService) {}

  public async getAll(): Promise<Event[]> {
    this.logger.debug('Getting all events');
    const db = this.firebaseService.getClientFirestore();
    const eventsCol = collection(db, 'events');
    const snapshot = await getDocs(eventsCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Event));
  }

  public async getById(id: string): Promise<Event | null> {
    this.logger.debug(`Getting event ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'events', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Event;
  }

  public async create(data: CreateEventDto): Promise<Event> {
    this.logger.debug('Creating event');
    const db = this.firebaseService.getClientFirestore();
    
    const eventData: Omit<Event, 'id'> = {
      title: data.title,
      description: data.description,
      location: {
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude
      },
      startDate: data.startDate,
      endDate: data.endDate,
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
        tiktok: data.tiktok || ''
      },
      isPromoted: data.isPromoted,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('eventData', eventData);
    const docRef = await addDoc(collection(db, 'events'), eventData);
    
    return {
      id: docRef.id,
      ...eventData
    };
  }

  public async update(id: string, data: Partial<Event>): Promise<Event> {
    this.logger.debug(`Updating event ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'events', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Event not found');
    }
    console.log('update event data', data);
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updateData);
    
    const updatedDoc = await getDoc(docRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Event;
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting event ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'events', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Event not found');
    }

    await deleteDoc(docRef);
  }

  public async updateFavoriteCount(eventId: string, increment: boolean): Promise<void> {
    this.logger.debug(`${increment ? 'Incrementing' : 'Decrementing'} favorite count for event ${eventId}`);
    const db = this.firebaseService.getClientFirestore();
    const eventRef = doc(db, 'events', eventId);

    try {
      await runTransaction(db, async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        
        if (!eventDoc.exists()) {
          throw new NotFoundException(`Event with ID ${eventId} not found`);
        }
        
        const eventData = eventDoc.data();
        const currentCount = eventData.favoriteCount || 0;
        const newCount = increment ? currentCount + 1 : Math.max(0, currentCount - 1);
        
        transaction.update(eventRef, { 
          favoriteCount: newCount,
          updatedAt: new Date().toISOString()
        });
      });
      
      this.logger.debug(`Successfully updated favorite count for event ${eventId}`);
    } catch (error) {
      this.logger.error(`Error updating favorite count for event ${eventId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Holt Events basierend auf einer Liste von IDs
   * 
   * @param ids - Array von Event-IDs
   * @returns Liste der gefundenen Events
   */
  public async getByIds(ids: string[]): Promise<Event[]> {
    this.logger.debug(`Getting events by IDs: ${ids.join(', ')}`);
    
    // Wenn keine IDs übergeben wurden, geben wir ein leeres Array zurück
    if (!ids || ids.length === 0) {
      return [];
    }
    
    // Jedes Event einzeln abrufen (Firestore unterstützt kein "IN"-Query für Dokument-IDs)
    const eventPromises = ids.map(id => this.getById(id));
    const events = await Promise.all(eventPromises);
    
    // Null-Werte entfernen (für den Fall, dass einige Events nicht gefunden wurden)
    return events.filter((event): event is Event => event !== null);
  }
} 