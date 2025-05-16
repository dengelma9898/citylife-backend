import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateJobOfferDto } from '../dto/create-job-offer.dto';
import { JobOffer } from '../interfaces/job-offer.interface';

@Injectable()
export class JobOffersService {
  private readonly collection = 'job_offers';

  constructor(private readonly firebaseService: FirebaseService) {}

  async create(createJobOfferDto: CreateJobOfferDto): Promise<JobOffer> {
    const now = new Date().toISOString();
    const jobOffer: Omit<JobOffer, 'id'> = {
      ...createJobOfferDto,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firebaseService
      .getFirestore()
      .collection(this.collection)
      .add(jobOffer);

    return {
      id: docRef.id,
      ...jobOffer,
    };
  }

  async findAll(): Promise<JobOffer[]> {
    const snapshot = await this.firebaseService
      .getFirestore()
      .collection(this.collection)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as JobOffer[];
  }

  async findOne(id: string): Promise<JobOffer> {
    const doc = await this.firebaseService
      .getFirestore()
      .collection(this.collection)
      .doc(id)
      .get();

    if (!doc.exists) {
      throw new Error('Job offer not found');
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as JobOffer;
  }

  async update(id: string, updateJobOfferDto: Partial<CreateJobOfferDto>): Promise<JobOffer> {
    const updateData = {
      ...updateJobOfferDto,
      updatedAt: new Date().toISOString(),
    };

    await this.firebaseService
      .getFirestore()
      .collection(this.collection)
      .doc(id)
      .update(updateData);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.firebaseService
      .getFirestore()
      .collection(this.collection)
      .doc(id)
      .delete();
  }
} 