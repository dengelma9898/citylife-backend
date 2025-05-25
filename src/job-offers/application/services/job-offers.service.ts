import { Injectable, Logger, Inject } from '@nestjs/common';
import { CreateJobOfferDto } from '../../dto/create-job-offer.dto';
import { JobOffer } from '../../domain/entities/job-offer.entity';
import { JobOfferRepository, JOB_OFFER_REPOSITORY } from '../../domain/repositories/job-offer.repository.interface';

@Injectable()
export class JobOffersService {
  private readonly logger = new Logger(JobOffersService.name);

  constructor(
    @Inject(JOB_OFFER_REPOSITORY)
    private readonly jobOfferRepository: JobOfferRepository
  ) {}

  async create(createJobOfferDto: CreateJobOfferDto): Promise<JobOffer> {
    this.logger.debug('Creating new job offer');
    const jobOffer = JobOffer.create(createJobOfferDto);
    return this.jobOfferRepository.save(jobOffer);
  }

  async findAll(): Promise<JobOffer[]> {
    this.logger.debug('Getting all job offers');
    return this.jobOfferRepository.findAll();
  }

  async findOne(id: string): Promise<JobOffer> {
    this.logger.debug(`Getting job offer ${id}`);
    return this.jobOfferRepository.findById(id);
  }

  async update(id: string, updateJobOfferDto: Partial<CreateJobOfferDto>): Promise<JobOffer> {
    this.logger.debug(`Updating job offer ${id}`);
    const existingJobOffer = await this.jobOfferRepository.findById(id);
    const updatedJobOffer = existingJobOffer.update(updateJobOfferDto);
    return this.jobOfferRepository.update(id, updatedJobOffer);
  }

  async remove(id: string): Promise<void> {
    this.logger.debug(`Removing job offer ${id}`);
    await this.findOne(id); // Verify existence
    await this.jobOfferRepository.delete(id);
  }
} 