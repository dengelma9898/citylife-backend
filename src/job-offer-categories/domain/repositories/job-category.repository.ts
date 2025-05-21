import { JobCategory } from '../entities/job-category.entity';

export const JOB_CATEGORY_REPOSITORY = 'JOB_CATEGORY_REPOSITORY';

export interface JobCategoryRepository {
  findById(id: string): Promise<JobCategory>;
  findAll(): Promise<JobCategory[]>;
  save(jobCategory: JobCategory): Promise<void>;
  update(id: string, jobCategory: JobCategory): Promise<void>;
  delete(id: string): Promise<void>;
} 