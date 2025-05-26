import { Injectable, Logger } from '@nestjs/common';
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
    this.logger.debug(`Finding job category with id: ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Job category with id ${id} not found`);
    }

    return JobCategory.fromProps(this.toJobCategoryProps(docSnap.data(), docSnap.id));
  }

  async findAll(): Promise<JobCategory[]> {
    this.logger.debug('Finding all job categories');
    const db = this.firebaseService.getClientFirestore();
    const categoriesCol = collection(db, this.collectionName);
    const snapshot = await getDocs(categoriesCol);

    return snapshot.docs.map(doc =>
      JobCategory.fromProps(this.toJobCategoryProps(doc.data(), doc.id)),
    );
  }

  async save(jobCategory: JobCategory): Promise<void> {
    this.logger.debug('Saving new job category');
    const db = this.firebaseService.getClientFirestore();
    const data = this.toPlainObject(jobCategory);
    await addDoc(collection(db, this.collectionName), data);
  }

  async update(id: string, jobCategory: JobCategory): Promise<void> {
    this.logger.debug(`Updating job category with id: ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const data = this.toPlainObject(jobCategory);
    await updateDoc(docRef, data);
  }

  async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting job category with id: ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
  }
}
