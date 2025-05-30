import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { JobOffer } from '../../domain/entities/job-offer.entity';
import { JobOfferRepository } from '../../domain/repositories/job-offer.repository.interface';

@Injectable()
export class FirebaseJobOfferRepository implements JobOfferRepository {
  private readonly logger = new Logger(FirebaseJobOfferRepository.name);
  private readonly collectionName = 'job_offers';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toJobOfferProps(data: any, id: string) {
    return {
      id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };
  }

  private toPlainObject(jobOffer: JobOffer) {
    const { id, ...data } = jobOffer;
    return this.removeUndefined({
      ...data,
    });
  }

  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefined(item));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        const value = obj[key];
        result[key] = this.removeUndefined(value);
      }
      return result;
    }

    return obj;
  }

  async findById(id: string): Promise<JobOffer> {
    try {
      this.logger.debug(`Getting job offer ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Job offer not found');
      }

      return new JobOffer(this.toJobOfferProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error finding job offer ${id}: ${error.message}`);
      throw error;
    }
  }

  async findAll(): Promise<JobOffer[]> {
    try {
      this.logger.debug('Getting all job offers');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collectionName).get();

      return snapshot.docs.map(doc => new JobOffer(this.toJobOfferProps(doc.data(), doc.id)));
    } catch (error) {
      this.logger.error(`Error finding all job offers: ${error.message}`);
      throw error;
    }
  }

  async save(jobOffer: JobOffer): Promise<JobOffer> {
    try {
      this.logger.debug('Creating new job offer');
      const db = this.firebaseService.getFirestore();
      const plainObject = this.toPlainObject(jobOffer);
      const docRef = await db.collection(this.collectionName).add(plainObject);

      return new JobOffer(this.toJobOfferProps(plainObject, docRef.id));
    } catch (error) {
      this.logger.error(`Error saving job offer: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, jobOffer: JobOffer): Promise<JobOffer> {
    try {
      this.logger.debug(`Updating job offer ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Job offer not found');
      }

      const plainObject = this.toPlainObject(jobOffer);
      await db.collection(this.collectionName).doc(id).update(plainObject);
      return this.findById(id);
    } catch (error) {
      this.logger.error(`Error updating job offer ${id}: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      this.logger.debug(`Removing job offer ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Job offer not found');
      }

      await db.collection(this.collectionName).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting job offer ${id}: ${error.message}`);
      throw error;
    }
  }
}
