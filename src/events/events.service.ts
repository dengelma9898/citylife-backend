import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { Event } from './interfaces/event.interface';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  public async getAll(): Promise<Event[]> {
    this.logger.debug('Getting all events');
    const db = getFirestore();
    const eventsCol = collection(db, 'events');
    const snapshot = await getDocs(eventsCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Event));
  }

  public async getById(id: string): Promise<Event | null> {
    this.logger.debug(`Getting event ${id}`);
    const db = getFirestore();
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
    const db = getFirestore();
    
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
      ticketsNeeded: data.ticketsNeeded,
      price: data.price,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'events'), eventData);
    
    return {
      id: docRef.id,
      ...eventData
    };
  }

  public async update(id: string, data: Partial<Event>): Promise<Event> {
    this.logger.debug(`Updating event ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'events', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Event not found');
    }

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
    const db = getFirestore();
    const docRef = doc(db, 'events', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Event not found');
    }

    await deleteDoc(docRef);
  }

  public async updateFavoriteCount(eventId: string, increment: boolean): Promise<void> {
    this.logger.debug(`${increment ? 'Incrementing' : 'Decrementing'} favorite count for event ${eventId}`);
    const db = getFirestore();
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
} 