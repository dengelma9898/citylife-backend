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
    this.logger.debug(`Getting job offer ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Job offer not found');
    }

    return new JobOffer(this.toJobOfferProps(docSnap.data(), docSnap.id));
  }

  async findAll(): Promise<JobOffer[]> {
    this.logger.debug('Getting all job offers');
    const db = this.firebaseService.getClientFirestore();
    const offersCol = collection(db, this.collectionName);
    const snapshot = await getDocs(offersCol);

    return snapshot.docs.map(doc => new JobOffer(this.toJobOfferProps(doc.data(), doc.id)));
  }

  async save(jobOffer: JobOffer): Promise<JobOffer> {
    this.logger.debug('Creating new job offer');
    const db = this.firebaseService.getClientFirestore();
    const plainObject = this.toPlainObject(jobOffer);
    const docRef = await addDoc(collection(db, this.collectionName), plainObject);

    return new JobOffer(this.toJobOfferProps(plainObject, docRef.id));
  }

  async update(id: string, jobOffer: JobOffer): Promise<JobOffer> {
    this.logger.debug(`Updating job offer ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Job offer not found');
    }

    const plainObject = this.toPlainObject(jobOffer);
    await updateDoc(docRef, plainObject);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    this.logger.debug(`Removing job offer ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Job offer not found');
    }

    await deleteDoc(docRef);
  }
}
