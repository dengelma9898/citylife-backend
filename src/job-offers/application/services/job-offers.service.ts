import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { CreateJobOfferDto } from '../../dto/create-job-offer.dto';
import { JobOffer } from '../../domain/entities/job-offer.entity';
import {
  JobOfferRepository,
  JOB_OFFER_REPOSITORY,
} from '../../domain/repositories/job-offer.repository.interface';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { UsersService } from '../../../users/users.service';

@Injectable()
export class JobOffersService {
  private readonly logger = new Logger(JobOffersService.name);

  constructor(
    @Inject(JOB_OFFER_REPOSITORY)
    private readonly jobOfferRepository: JobOfferRepository,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async create(createJobOfferDto: CreateJobOfferDto): Promise<JobOffer> {
    this.logger.debug('Creating new job offer');
    const jobOffer = JobOffer.create(createJobOfferDto);
    const savedJobOffer = await this.jobOfferRepository.save(jobOffer);
    await this.sendNewJobOfferNotification(savedJobOffer);
    return savedJobOffer;
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

  private async sendNewJobOfferNotification(jobOffer: JobOffer): Promise<void> {
    try {
      this.logger.log(`[NOTIFICATION] Starting notification process for job offer ${jobOffer.id}`);
      this.logger.debug(`[NOTIFICATION] Job offer title: ${jobOffer.title}`);
      const allUsers = await this.usersService.getAllUserProfilesWithIds();
      if (!allUsers || !Array.isArray(allUsers)) {
        this.logger.warn(`[NOTIFICATION] getAllUserProfilesWithIds returned invalid data: ${allUsers}`);
        return;
      }
      this.logger.debug(`[NOTIFICATION] Found ${allUsers.length} total users`);
      const usersToNotify = allUsers.filter(({ id, profile }) => {
        const notificationPreferences = profile.notificationPreferences;
        const newJobOffersEnabled =
          notificationPreferences?.newJobOffers !== undefined
            ? notificationPreferences.newJobOffers
            : false;
        if (!newJobOffersEnabled) {
          this.logger.debug(`[NOTIFICATION] User ${id} has newJobOffers disabled`);
        }
        return newJobOffersEnabled;
      });
      this.logger.log(
        `[NOTIFICATION] Filtered to ${usersToNotify.length} users with newJobOffers enabled`,
      );
      if (usersToNotify.length === 0) {
        this.logger.warn(`[NOTIFICATION] No users to notify for job offer ${jobOffer.id}`);
        return;
      }
      const sendPromises = usersToNotify.map(async ({ id }) => {
        try {
          this.logger.debug(`[NOTIFICATION] Sending to user ${id}`);
          await this.notificationService.sendToUser(id, {
            title: 'Neues Job-Angebot',
            body: `${jobOffer.title} - ${jobOffer.jobOfferCategoryId}`,
            data: {
              type: 'NEW_JOB_OFFER',
              jobOfferId: jobOffer.id,
              jobTitle: jobOffer.title,
              jobOfferCategoryId: jobOffer.jobOfferCategoryId,
            },
          });
          this.logger.debug(`[NOTIFICATION] Successfully sent to user ${id}`);
        } catch (error: any) {
          this.logger.error(
            `[NOTIFICATION] Error sending notification to user ${id}: ${error.message}`,
            error.stack,
          );
        }
      });
      await Promise.all(sendPromises);
      this.logger.log(
        `[NOTIFICATION] Completed notification process for job offer ${jobOffer.id}. Sent to ${usersToNotify.length} users.`,
      );
    } catch (error: any) {
      this.logger.error(
        `[NOTIFICATION] Error sending new job offer notification for job offer ${jobOffer.id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
