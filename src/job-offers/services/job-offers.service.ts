import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateJobOfferDto } from '../dto/create-job-offer.dto';
import { JobOffer } from '../interfaces/job-offer.interface';
import { DateTimeUtils } from '../../utils/date-time.utils';

@Injectable()
export class JobOffersService {
  private readonly logger = new Logger(JobOffersService.name);
  private readonly collectionName = 'job_offers';

  constructor(private readonly firebaseService: FirebaseService) {}

  async create(createJobOfferDto: CreateJobOfferDto): Promise<JobOffer> {
    this.logger.debug('Creating new job offer');
    const now = DateTimeUtils.getUTCTime();
    const jobOffer: Omit<JobOffer, 'id'> = {
      ...createJobOfferDto,
      createdAt: now,
      updatedAt: now,
    };

    const db = this.firebaseService.getClientFirestore();
    const docRef = await addDoc(collection(db, this.collectionName), jobOffer);

    return {
      id: docRef.id,
      ...jobOffer,
    };
  }

  async findAll(): Promise<JobOffer[]> {
    this.logger.debug('Getting all job offers');
    const db = this.firebaseService.getClientFirestore();
    const offersCol = collection(db, this.collectionName);
    const snapshot = await getDocs(offersCol);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as JobOffer[];
  }

  async findOne(id: string): Promise<JobOffer> {
    this.logger.debug(`Getting job offer ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Job offer not found');
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as JobOffer;
  }

  async update(id: string, updateJobOfferDto: Partial<CreateJobOfferDto>): Promise<JobOffer> {
    this.logger.debug(`Updating job offer ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Job offer not found');
    }

    const updateData = {
      ...updateJobOfferDto,
      updatedAt: DateTimeUtils.getUTCTime(),
    };

    await updateDoc(docRef, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
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