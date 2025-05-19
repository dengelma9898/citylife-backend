import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateJobCategoryDto } from '../dto/create-job-category.dto';
import { JobCategory } from '../interfaces/job-category.interface';
import { DateTimeUtils } from '../../utils/date-time.utils';

@Injectable()
export class JobOfferCategoriesService {
  private readonly logger = new Logger(JobOfferCategoriesService.name);
  private readonly collectionName = 'job_categories';

  constructor(private readonly firebaseService: FirebaseService) {}

  async create(createJobCategoryDto: CreateJobCategoryDto): Promise<JobCategory> {
    this.logger.debug('Creating new job category');
    const now = DateTimeUtils.getUTCTime();
    const jobCategory: Omit<JobCategory, 'id'> = {
      ...createJobCategoryDto,
      createdAt: now,
      updatedAt: now,
    };

    const db = this.firebaseService.getClientFirestore();
    const docRef = await addDoc(collection(db, this.collectionName), jobCategory);

    return {
      id: docRef.id,
      ...jobCategory,
    };
  }

  async findAll(): Promise<JobCategory[]> {
    this.logger.debug('Getting all job categories');
    const db = this.firebaseService.getClientFirestore();
    const categoriesCol = collection(db, this.collectionName);
    const snapshot = await getDocs(categoriesCol);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as JobCategory[];
  }

  async findOne(id: string): Promise<JobCategory> {
    this.logger.debug(`Getting job category ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Job category not found');
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as JobCategory;
  }

  async update(id: string, updateJobCategoryDto: Partial<CreateJobCategoryDto>): Promise<JobCategory> {
    this.logger.debug(`Updating job category ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Job category not found');
    }

    const updateData = {
      ...updateJobCategoryDto,
      updatedAt: DateTimeUtils.getUTCTime(),
    };

    await updateDoc(docRef, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    this.logger.debug(`Removing job category ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Job category not found');
    }

    await deleteDoc(docRef);
  }
} 