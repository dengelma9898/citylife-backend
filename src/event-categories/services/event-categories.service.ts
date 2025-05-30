import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventCategory } from '../interfaces/event-category.interface';
import { CreateEventCategoryDto } from '../dto/create-event-category.dto';
import { FirebaseService } from '../../firebase/firebase.service';
import { DateTimeUtils } from '../../utils/date-time.utils';

@Injectable()
export class EventCategoriesService {
  private readonly logger = new Logger(EventCategoriesService.name);
  private readonly collection = 'event_categories';

  constructor(private readonly firebaseService: FirebaseService) {}

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

  public async findAll(): Promise<EventCategory[]> {
    try {
      this.logger.debug('Getting all event categories');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collection).get();
      return snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as EventCategory,
      );
    } catch (error) {
      this.logger.error(`Error finding all event categories: ${error.message}`);
      throw error;
    }
  }

  public async findOne(id: string): Promise<EventCategory | null> {
    try {
      this.logger.debug(`Getting event category ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as EventCategory;
    } catch (error) {
      this.logger.error(`Error finding event category ${id}: ${error.message}`);
      throw error;
    }
  }

  public async create(data: CreateEventCategoryDto): Promise<EventCategory> {
    try {
      this.logger.debug('Creating event category');
      const db = this.firebaseService.getFirestore();

      const categoryData: Omit<EventCategory, 'id'> = {
        name: data.name,
        description: data.description,
        colorCode: data.colorCode,
        iconName: data.iconName,
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      const docRef = await db.collection(this.collection).add(this.removeUndefined(categoryData));

      return {
        id: docRef.id,
        ...categoryData,
      };
    } catch (error) {
      this.logger.error(`Error creating event category: ${error.message}`);
      throw error;
    }
  }

  public async update(id: string, data: Partial<CreateEventCategoryDto>): Promise<EventCategory> {
    try {
      this.logger.debug(`Updating event category ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Event category not found');
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
      } as EventCategory;
    } catch (error) {
      this.logger.error(`Error updating event category ${id}: ${error.message}`);
      throw error;
    }
  }

  public async remove(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting event category ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Event category not found');
      }

      await db.collection(this.collection).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting event category ${id}: ${error.message}`);
      throw error;
    }
  }
}
