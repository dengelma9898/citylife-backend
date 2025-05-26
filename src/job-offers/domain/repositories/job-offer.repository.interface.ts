import { JobOffer } from '../entities/job-offer.entity';

export const JOB_OFFER_REPOSITORY = 'JobOfferRepository';

export interface JobOfferRepository {
  findById(id: string): Promise<JobOffer>;
  findAll(): Promise<JobOffer[]>;
  save(jobOffer: JobOffer): Promise<JobOffer>;
  update(id: string, jobOffer: JobOffer): Promise<JobOffer>;
  delete(id: string): Promise<void>;
}
