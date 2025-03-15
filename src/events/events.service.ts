import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
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
} 