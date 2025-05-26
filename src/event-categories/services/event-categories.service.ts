import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { EventCategory } from '../interfaces/event-category.interface';
import { CreateEventCategoryDto } from '../dto/create-event-category.dto';
import { FirebaseService } from '../../firebase/firebase.service';
import { DateTimeUtils } from '../../utils/date-time.utils';

@Injectable()
export class EventCategoriesService {
  private readonly logger = new Logger(EventCategoriesService.name);
  private readonly collectionName = 'event_categories';
  constructor(private readonly firebaseService: FirebaseService) {}

  public async findAll(): Promise<EventCategory[]> {
    this.logger.debug('Getting all event categories');
    const db = this.firebaseService.getClientFirestore();
    const categoriesCol = collection(db, this.collectionName);
    const snapshot = await getDocs(categoriesCol);
    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as EventCategory,
    );
  }

  public async findOne(id: string): Promise<EventCategory | null> {
    this.logger.debug(`Getting event category ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as EventCategory;
  }

  public async create(data: CreateEventCategoryDto): Promise<EventCategory> {
    this.logger.debug('Creating event category');
    const db = this.firebaseService.getClientFirestore();

    const categoryData: Omit<EventCategory, 'id'> = {
      name: data.name,
      description: data.description,
      colorCode: data.colorCode,
      iconName: data.iconName,
      createdAt: DateTimeUtils.getBerlinTime(),
      updatedAt: DateTimeUtils.getBerlinTime(),
    };

    const docRef = await addDoc(collection(db, this.collectionName), categoryData);

    return {
      id: docRef.id,
      ...categoryData,
    };
  }

  public async update(id: string, data: Partial<CreateEventCategoryDto>): Promise<EventCategory> {
    this.logger.debug(`Updating event category ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Event category not found');
    }

    const updateData = {
      ...data,
      updatedAt: DateTimeUtils.getBerlinTime(),
    };

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as EventCategory;
  }

  public async remove(id: string): Promise<void> {
    this.logger.debug(`Deleting event category ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Event category not found');
    }

    await deleteDoc(docRef);
  }
}
