import { Injectable, Logger, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateJobOfferDto } from '../../dto/create-job-offer.dto';
import { JobOffer } from '../../interfaces/job-offer.interface';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { UsersService } from '../../../users/users.service';

@Injectable()
export class JobOffersService {
  private readonly logger = new Logger(JobOffersService.name);
  private readonly collectionName = 'job_offers';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  private toJobOffer(data: Record<string, unknown>, id: string): JobOffer {
    const createdAt = data.createdAt as { toDate?: () => Date } | Date | undefined;
    const updatedAt = data.updatedAt as { toDate?: () => Date } | Date | undefined;
    return {
      id,
      title: data.title as string,
      companyLogo: data.companyLogo as string,
      generalDescription: data.generalDescription as string,
      neededProfile: data.neededProfile as string,
      tasks: (data.tasks as string[]) || [],
      benefits: (data.benefits as string[]) || [],
      images: (data.images as string[]) || [],
      location: data.location as JobOffer['location'],
      typeOfEmployment: data.typeOfEmployment as string,
      additionalNotesForTypeOfEmployment: data.additionalNotesForTypeOfEmployment as
        string | undefined,
      homeOffice: data.homeOffice as boolean,
      additionalNotesHomeOffice: data.additionalNotesHomeOffice as string | undefined,
      wage: data.wage as string | undefined,
      startDate: data.startDate as string,
      contactData: data.contactData as JobOffer['contactData'],
      link: data.link as string,
      socialMedia: data.socialMedia as JobOffer['socialMedia'],
      isHighlight: data.isHighlight as boolean,
      businessIds: data.businessIds as string[] | undefined,
      jobOfferCategoryId: data.jobOfferCategoryId as string,
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

  async create(createJobOfferDto: CreateJobOfferDto): Promise<JobOffer> {
    this.logger.debug('Creating new job offer');
    const now = new Date();
    const jobOffer: JobOffer = {
      id: randomUUID(),
      ...createJobOfferDto,
      createdAt: now,
      updatedAt: now,
    };
    const db = this.firebaseService.getFirestore();
    const docRef = await db
      .collection(this.collectionName)
      .add(toFirestoreData(jobOffer as unknown as Record<string, unknown>));
    const savedJobOffer = { ...jobOffer, id: docRef.id };
    await this.sendNewJobOfferNotification(savedJobOffer);
    return savedJobOffer;
  }

  async findAll(): Promise<JobOffer[]> {
    this.logger.debug('Getting all job offers');
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collectionName).get();
    return snapshot.docs.map(doc => this.toJobOffer(doc.data() as Record<string, unknown>, doc.id));
  }

  async findOne(id: string): Promise<JobOffer> {
    this.logger.debug(`Getting job offer ${id}`);
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collectionName).doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Job offer not found');
    }
    return this.toJobOffer(doc.data() as Record<string, unknown>, doc.id);
  }

  async update(id: string, updateJobOfferDto: Partial<CreateJobOfferDto>): Promise<JobOffer> {
    this.logger.debug(`Updating job offer ${id}`);
    const existingJobOffer = await this.findOne(id);
    const updatedJobOffer: JobOffer = {
      ...existingJobOffer,
      ...updateJobOfferDto,
      updatedAt: new Date(),
    };
    const db = this.firebaseService.getFirestore();
    await db
      .collection(this.collectionName)
      .doc(id)
      .update(toFirestoreData(updatedJobOffer as unknown as Record<string, unknown>));
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    this.logger.debug(`Removing job offer ${id}`);
    await this.findOne(id);
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collectionName).doc(id).delete();
  }

  private async sendNewJobOfferNotification(jobOffer: JobOffer): Promise<void> {
    try {
      this.logger.log(`[NOTIFICATION] Starting notification process for job offer ${jobOffer.id}`);
      this.logger.debug(`[NOTIFICATION] Job offer title: ${jobOffer.title}`);
      const allUsers = await this.usersService.getAllUserProfilesWithIds();
      if (!allUsers || !Array.isArray(allUsers)) {
        this.logger.warn(
          `[NOTIFICATION] getAllUserProfilesWithIds returned invalid data: ${allUsers}`,
        );
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
