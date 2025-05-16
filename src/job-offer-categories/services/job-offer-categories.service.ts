import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateJobCategoryDto } from '../dto/create-job-category.dto';
import { JobCategory } from '../interfaces/job-category.interface';

@Injectable()
export class JobOfferCategoriesService {
  private readonly collection = 'job_categories';

  constructor(private readonly firebaseService: FirebaseService) {}

  async create(createJobCategoryDto: CreateJobCategoryDto): Promise<JobCategory> {
    const now = new Date().toISOString();
    const jobCategory: Omit<JobCategory, 'id'> = {
      ...createJobCategoryDto,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.firebaseService
      .getFirestore()
      .collection(this.collection)
      .add(jobCategory);

    return {
      id: docRef.id,
      ...jobCategory,
    };
  }

  async findAll(): Promise<JobCategory[]> {
    const snapshot = await this.firebaseService
      .getFirestore()
      .collection(this.collection)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as JobCategory[];
  }

  async findOne(id: string): Promise<JobCategory> {
    const doc = await this.firebaseService
      .getFirestore()
      .collection(this.collection)
      .doc(id)
      .get();

    if (!doc.exists) {
      throw new Error('Job category not found');
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as JobCategory;
  }

  async update(id: string, updateJobCategoryDto: Partial<CreateJobCategoryDto>): Promise<JobCategory> {
    const updateData = {
      ...updateJobCategoryDto,
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