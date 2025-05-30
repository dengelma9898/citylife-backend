import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { JobCategory, JobCategoryProps } from '../../domain/entities/job-category.entity';
import { JobCategoryRepository } from '../../domain/repositories/job-category.repository';

@Injectable()
export class FirebaseJobCategoryRepository implements JobCategoryRepository {
  private readonly logger = new Logger(FirebaseJobCategoryRepository.name);
  private readonly collectionName = 'job_categories';

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

  private toPlainObject(entity: JobCategory): Omit<JobCategoryProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toJobCategoryProps(data: any, id: string): JobCategoryProps {
    return {
      id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };
  }

  async findById(id: string): Promise<JobCategory> {
    try {
      this.logger.debug(`Finding job category with id: ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException(`Job category with id ${id} not found`);
      }

      return JobCategory.fromProps(this.toJobCategoryProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error finding job category ${id}: ${error.message}`);
      throw error;
    }
  }

  async findAll(): Promise<JobCategory[]> {
    try {
      this.logger.debug('Finding all job categories');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collectionName).get();

      return snapshot.docs.map(doc =>
        JobCategory.fromProps(this.toJobCategoryProps(doc.data(), doc.id)),
      );
    } catch (error) {
      this.logger.error(`Error finding all job categories: ${error.message}`);
      throw error;
    }
  }

  async save(jobCategory: JobCategory): Promise<void> {
    try {
      this.logger.debug('Saving new job category');
      const db = this.firebaseService.getFirestore();
      const data = this.toPlainObject(jobCategory);
      await db.collection(this.collectionName).add(data);
    } catch (error) {
      this.logger.error(`Error saving job category: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, jobCategory: JobCategory): Promise<void> {
    try {
      this.logger.debug(`Updating job category with id: ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException(`Job category with id ${id} not found`);
      }

      const data = this.toPlainObject(jobCategory);
      await db.collection(this.collectionName).doc(id).update(data);
    } catch (error) {
      this.logger.error(`Error updating job category ${id}: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting job category with id: ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException(`Job category with id ${id} not found`);
      }

      await db.collection(this.collectionName).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting job category ${id}: ${error.message}`);
      throw error;
    }
  }
}
