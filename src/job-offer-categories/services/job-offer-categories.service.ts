import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JobCategory, JobCategoryProps } from '../domain/entities/job-category.entity';
import { CreateJobCategoryDto } from '../dto/create-job-category.dto';
import { FirebaseService } from '../../firebase/firebase.service';
import { toFirestoreData } from '../../firebase/firebase-mapper.util';

@Injectable()
export class JobOfferCategoriesService {
  private readonly logger = new Logger(JobOfferCategoriesService.name);
  private readonly collectionName = 'job_categories';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toJobCategoryProps(data: Record<string, unknown>, id: string): JobCategoryProps {
    const createdAt = data.createdAt as { toDate?: () => Date } | Date | undefined;
    const updatedAt = data.updatedAt as { toDate?: () => Date } | Date | undefined;
    return {
      id,
      name: data.name as string,
      description: data.description as string | undefined,
      colorCode: data.colorCode as string,
      iconName: data.iconName as string,
      fallbackImages: (data.fallbackImages as string[]) || [],
      createdAt:
        createdAt && typeof createdAt === 'object' && 'toDate' in createdAt && createdAt.toDate
          ? createdAt.toDate()
          : (createdAt as Date),
      updatedAt:
        updatedAt && typeof updatedAt === 'object' && 'toDate' in updatedAt && updatedAt.toDate
          ? updatedAt.toDate()
          : (updatedAt as Date),
    };
  }

  async create(createJobCategoryDto: CreateJobCategoryDto): Promise<JobCategory> {
    this.logger.debug('Creating new job category');
    const jobCategory = JobCategory.create(createJobCategoryDto);
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collectionName).add(toFirestoreData(jobCategory));
    return jobCategory;
  }

  async findAll(): Promise<JobCategory[]> {
    this.logger.debug('Getting all job categories');
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collectionName).get();
    return snapshot.docs.map(doc =>
      JobCategory.fromProps(this.toJobCategoryProps(doc.data(), doc.id)),
    );
  }

  async findOne(id: string): Promise<JobCategory> {
    this.logger.debug(`Getting job category ${id}`);
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(id).get();
      if (!doc.exists) {
        throw new NotFoundException(`Job category with id ${id} not found`);
      }
      return JobCategory.fromProps(this.toJobCategoryProps(doc.data(), doc.id));
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Job category not found');
    }
  }

  async update(
    id: string,
    updateJobCategoryDto: Partial<CreateJobCategoryDto>,
  ): Promise<JobCategory> {
    this.logger.debug(`Updating job category ${id}`);
    const existingCategory = await this.findOne(id);
    const updatedCategory = existingCategory.update(updateJobCategoryDto);
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collectionName).doc(id).update(toFirestoreData(updatedCategory));
    return updatedCategory;
  }

  async remove(id: string): Promise<void> {
    this.logger.debug(`Removing job category ${id}`);
    await this.findOne(id);
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collectionName).doc(id).delete();
  }
}
