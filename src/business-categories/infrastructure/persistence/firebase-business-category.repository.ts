import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';
import {
  BusinessCategory,
  BusinessCategoryProps,
} from '../../domain/entities/business-category.entity';
import { BusinessCategoryRepository } from '../../domain/repositories/business-category.repository';

@Injectable()
export class FirebaseBusinessCategoryRepository implements BusinessCategoryRepository {
  private readonly logger = new Logger(FirebaseBusinessCategoryRepository.name);
  private readonly collection = 'business_categories';

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

  private toPlainObject(entity: BusinessCategory): Omit<BusinessCategoryProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toBusinessCategoryProps(data: any, id: string): BusinessCategoryProps {
    return {
      id,
      name: data.name,
      iconName: data.iconName,
      description: data.description,
      keywordIds: data.keywordIds || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async findAll(): Promise<BusinessCategory[]> {
    try {
      this.logger.debug('Getting all business categories');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collection).get();

      return snapshot.docs.map(doc =>
        BusinessCategory.fromProps(this.toBusinessCategoryProps(doc.data(), doc.id)),
      );
    } catch (error) {
      this.logger.error(`Error finding all business categories: ${error.message}`);
      throw error;
    }
  }

  async findById(id: string): Promise<BusinessCategory | null> {
    try {
      this.logger.debug(`Getting business category ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return BusinessCategory.fromProps(this.toBusinessCategoryProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error finding business category ${id}: ${error.message}`);
      throw error;
    }
  }

  async create(category: BusinessCategory): Promise<BusinessCategory> {
    try {
      this.logger.debug('Creating new business category');
      const db = this.firebaseService.getFirestore();
      const docRef = await db.collection(this.collection).add(this.toPlainObject(category));

      return BusinessCategory.fromProps({
        ...category.toJSON(),
        id: docRef.id,
      });
    } catch (error) {
      this.logger.error(`Error creating business category: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, category: BusinessCategory): Promise<BusinessCategory> {
    try {
      this.logger.debug(`Updating business category ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Business category not found');
      }

      await db.collection(this.collection).doc(id).update(this.toPlainObject(category));

      return BusinessCategory.fromProps({
        ...category.toJSON(),
        id,
      });
    } catch (error) {
      this.logger.error(`Error updating business category ${id}: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting business category ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Business category not found');
      }

      await db.collection(this.collection).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting business category ${id}: ${error.message}`);
      throw error;
    }
  }
}
