import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { JobCategory } from '../domain/entities/job-category.entity';
import {
  JobCategoryRepository,
  JOB_CATEGORY_REPOSITORY,
} from '../domain/repositories/job-category.repository';
import { CreateJobCategoryDto } from '../dto/create-job-category.dto';

@Injectable()
export class JobOfferCategoriesService {
  private readonly logger = new Logger(JobOfferCategoriesService.name);

  constructor(
    @Inject(JOB_CATEGORY_REPOSITORY)
    private readonly jobCategoryRepository: JobCategoryRepository,
  ) {}

  async create(createJobCategoryDto: CreateJobCategoryDto): Promise<JobCategory> {
    this.logger.debug('Creating new job category');
    const jobCategory = JobCategory.create(createJobCategoryDto);
    await this.jobCategoryRepository.save(jobCategory);
    return jobCategory;
  }

  async findAll(): Promise<JobCategory[]> {
    this.logger.debug('Getting all job categories');
    return this.jobCategoryRepository.findAll();
  }

  async findOne(id: string): Promise<JobCategory> {
    this.logger.debug(`Getting job category ${id}`);
    try {
      return await this.jobCategoryRepository.findById(id);
    } catch (error) {
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
    await this.jobCategoryRepository.update(id, updatedCategory);
    return updatedCategory;
  }

  async remove(id: string): Promise<void> {
    this.logger.debug(`Removing job category ${id}`);
    await this.findOne(id); // Verify existence
    await this.jobCategoryRepository.delete(id);
  }
}
