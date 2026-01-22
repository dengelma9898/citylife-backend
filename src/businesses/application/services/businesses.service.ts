import { Injectable, Inject, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import {
  Business,
  BusinessAddress,
  BusinessContact,
  BusinessCustomer,
} from '../../domain/entities/business.entity';
import {
  BusinessRepository,
  BUSINESS_REPOSITORY,
} from '../../domain/repositories/business.repository';
import { CreateBusinessDto } from '../../dto/create-business.dto';
import { BusinessCustomerDto } from '../../dto/business-customer.dto';
import { BusinessStatus } from '../../domain/enums/business-status.enum';
import { BusinessCategoriesService } from '../../../business-categories/application/services/business-categories.service';
import { KeywordsService } from '../../../keywords/keywords.service';
import { EventsService } from '../../../events/events.service';
import { DateTimeUtils } from '../../../utils/date-time.utils';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { UsersService } from '../../../users/users.service';

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(
    @Inject(BUSINESS_REPOSITORY)
    private readonly businessRepository: BusinessRepository,
    private readonly businessCategoriesService: BusinessCategoriesService,
    private readonly keywordsService: KeywordsService,
    private readonly eventsService: EventsService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  public async getAll(): Promise<Business[]> {
    this.logger.debug('Getting all businesses');
    return this.businessRepository.findAll();
  }

  public async getById(id: string): Promise<Business | null> {
    this.logger.debug(`Getting business ${id}`);
    return this.businessRepository.findById(id);
  }

  public async create(data: CreateBusinessDto): Promise<Business> {
    this.logger.debug('Creating new business');
    const initialStatus = data.isAdmin ? BusinessStatus.ACTIVE : BusinessStatus.PENDING;
    this.logger.debug(`Initial status will be: ${initialStatus} (isAdmin: ${data.isAdmin})`);
    const business = Business.create({
      name: data.name,
      contact: BusinessContact.create(data.contact),
      address: BusinessAddress.create(data.address),
      categoryIds: data.categoryIds,
      keywordIds: data.keywordIds || [],
      description: data.description,
      openingHours: data.openingHours,
      detailedOpeningHours: data.detailedOpeningHours,
      benefit: data.benefit,
      hasAccount: data.hasAccount,
      isPromoted: data.isPromoted || false,
      status: initialStatus,
      logoUrl: '',
    });

    const createdBusiness = await this.businessRepository.create(business);
    this.logger.debug(
      `Created business ${createdBusiness.id} with status ${createdBusiness.status}`,
    );
    if (createdBusiness.status === BusinessStatus.ACTIVE) {
      this.logger.log(
        `Business ${createdBusiness.id} created with ACTIVE status. Sending notification.`,
      );
      await this.sendNewBusinessNotification(createdBusiness);
    } else {
      this.logger.debug(
        `Business ${createdBusiness.id} created with status ${createdBusiness.status}. No notification sent.`,
      );
    }
    return createdBusiness;
  }

  public async update(id: string, data: Partial<Business>): Promise<Business> {
    this.logger.debug(`Updating business ${id} with data: ${JSON.stringify(data)}`);
    const existingBusiness = await this.businessRepository.findById(id);
    if (!existingBusiness) {
      this.logger.warn(`Business ${id} not found`);
      throw new NotFoundException('Business not found');
    }
    this.logger.debug(
      `Existing business ${id} status: ${existingBusiness.status}, new status: ${data.status}`,
    );
    const previousStatus = existingBusiness.status;
    const newStatus = data.status;
    const isStatusChangeToActive =
      previousStatus === BusinessStatus.PENDING && newStatus === BusinessStatus.ACTIVE;
    if (isStatusChangeToActive) {
      this.logger.log(
        `Status change detected: PENDING -> ACTIVE for business ${id}. Will send notification after update.`,
      );
    }
    if (data.benefit !== undefined && data.benefit !== existingBusiness.benefit) {
      this.logger.debug(`Updating benefit for business ${id}`);
      const updatedPreviousBenefits = [
        ...(existingBusiness.previousBenefits || []),
        existingBusiness.benefit,
      ];
      const limitedPreviousBenefits = updatedPreviousBenefits.slice(-5);
      const updatedBusiness = existingBusiness.update({
        ...data,
        previousBenefits: limitedPreviousBenefits,
      });
      const savedBusiness = await this.businessRepository.update(id, updatedBusiness);
      if (isStatusChangeToActive) {
        this.logger.log(`Sending notification for business ${id} after status change`);
        await this.sendNewBusinessNotification(savedBusiness);
      }
      return savedBusiness;
    }
    const updatedBusiness = existingBusiness.update(data);
    const savedBusiness = await this.businessRepository.update(id, updatedBusiness);
    if (isStatusChangeToActive) {
      this.logger.log(`Sending notification for business ${id} after status change`);
      await this.sendNewBusinessNotification(savedBusiness);
    }
    return savedBusiness;
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting business ${id}`);
    return this.businessRepository.delete(id);
  }

  public async updateStatus(id: string, status: BusinessStatus): Promise<Business> {
    this.logger.debug(`Updating business status ${id} to ${status}`);
    const existingBusiness = await this.businessRepository.findById(id);
    if (!existingBusiness) {
      this.logger.warn(`Business ${id} not found`);
      throw new NotFoundException('Business not found');
    }

    const previousStatus = existingBusiness.status;
    this.logger.debug(`Previous status: ${previousStatus}, new status: ${status}`);
    const updatedBusiness = existingBusiness.updateStatus(status);
    const savedBusiness = await this.businessRepository.update(id, updatedBusiness);
    if (previousStatus === BusinessStatus.PENDING && status === BusinessStatus.ACTIVE) {
      this.logger.log(
        `Status change detected: PENDING -> ACTIVE for business ${id}. Sending notifications.`,
      );
      await this.sendNewBusinessNotification(savedBusiness);
      await this.sendBusinessActivatedNotification(savedBusiness);
    } else {
      this.logger.debug(
        `Status change from ${previousStatus} to ${status} does not trigger notification.`,
      );
    }
    return savedBusiness;
  }

  public async addCustomerScan(
    businessId: string,
    scanData: BusinessCustomerDto,
  ): Promise<Business> {
    this.logger.debug(`Adding customer scan to business ${businessId}`);
    const existingBusiness = await this.businessRepository.findById(businessId);
    if (!existingBusiness) {
      throw new NotFoundException('Business not found');
    }

    const customer: BusinessCustomer = BusinessCustomer.create({
      customerId: scanData.customerId,
      scannedAt: DateTimeUtils.getBerlinTime(),
      price: scanData.price,
      numberOfPeople: scanData.numberOfPeople,
      additionalInfo: scanData.additionalInfo,
      benefit: existingBusiness.benefit,
    });

    const updatedBusiness = existingBusiness.addCustomer(customer);
    return this.businessRepository.update(businessId, updatedBusiness);
  }

  public async updateBenefit(id: string, benefit: string): Promise<Business> {
    this.logger.debug(`Updating business benefit ${id}`);
    const existingBusiness = await this.businessRepository.findById(id);
    if (!existingBusiness) {
      throw new NotFoundException('Business not found');
    }

    const updatedBusiness = existingBusiness.updateBenefit(benefit);
    return this.businessRepository.update(id, updatedBusiness);
  }

  public async getBusinessesByStatus(filter: {
    hasAccount: boolean;
    status: BusinessStatus;
  }): Promise<Business[]> {
    this.logger.debug(
      `Getting businesses with status ${filter.status} and hasAccount ${filter.hasAccount}`,
    );
    return this.businessRepository.findByStatusAndHasAccount(filter.status, filter.hasAccount);
  }

  public async updateHasAccount(id: string, hasAccount: boolean): Promise<Business> {
    this.logger.debug(`Updating business hasAccount status ${id} to ${hasAccount}`);
    const existingBusiness = await this.businessRepository.findById(id);
    if (!existingBusiness) {
      throw new NotFoundException('Business not found');
    }

    const updatedBusiness = existingBusiness.update({ hasAccount });
    return this.businessRepository.update(id, updatedBusiness);
  }

  private async sendNewBusinessNotification(business: Business): Promise<void> {
    try {
      this.logger.log(`[NOTIFICATION] Starting notification process for business ${business.id}`);
      this.logger.debug(`[NOTIFICATION] Business name: ${business.name}`);
      const allUsers = await this.usersService.getAllUserProfilesWithIds();
      if (!allUsers || !Array.isArray(allUsers)) {
        this.logger.warn(`[NOTIFICATION] getAllUserProfilesWithIds returned invalid data: ${allUsers}`);
        return;
      }
      this.logger.debug(`[NOTIFICATION] Found ${allUsers.length} total users`);
      const usersToNotify = allUsers.filter(({ id, profile }) => {
        const notificationPreferences = profile.notificationPreferences;
        const newBusinessesEnabled =
          notificationPreferences?.newBusinesses !== undefined
            ? notificationPreferences.newBusinesses
            : false;
        if (!newBusinessesEnabled) {
          this.logger.debug(`[NOTIFICATION] User ${id} has newBusinesses disabled`);
        }
        return newBusinessesEnabled;
      });
      this.logger.log(
        `[NOTIFICATION] Filtered to ${usersToNotify.length} users with newBusinesses enabled`,
      );
      if (usersToNotify.length === 0) {
        this.logger.warn(`[NOTIFICATION] No users to notify for business ${business.id}`);
        return;
      }
      const sendPromises = usersToNotify.map(async ({ id, profile }) => {
        try {
          this.logger.debug(`[NOTIFICATION] Sending to user ${id}`);
          await this.notificationService.sendToUser(id, {
            title: 'Neuer Partner verfügbar',
            body: `${business.name} ist jetzt verfügbar`,
            data: {
              type: 'NEW_BUSINESS',
              businessId: business.id,
              businessName: business.name,
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
        `[NOTIFICATION] Completed notification process for business ${business.id}. Sent to ${usersToNotify.length} users.`,
      );
    } catch (error: any) {
      this.logger.error(
        `[NOTIFICATION] Error sending new business notification for business ${business.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async sendBusinessActivatedNotification(business: Business): Promise<void> {
    try {
      this.logger.log(
        `[BUSINESS_NOTIFICATION] Starting business activated notification process for business ${business.id}`,
      );
      this.logger.debug(`[BUSINESS_NOTIFICATION] Business name: ${business.name}`);
      const allBusinessUsers = await this.usersService.getAllBusinessUsers();
      if (!allBusinessUsers || !Array.isArray(allBusinessUsers)) {
        this.logger.warn(`[BUSINESS_NOTIFICATION] getAllBusinessUsers returned invalid data: ${allBusinessUsers}`);
        return;
      }
      this.logger.debug(
        `[BUSINESS_NOTIFICATION] Found ${allBusinessUsers.length} total business users`,
      );
      const businessUsersToNotify = allBusinessUsers.filter(user => {
        const hasBusiness = user.businessIds && user.businessIds.includes(business.id);
        if (!hasBusiness) {
          return false;
        }
        const notificationPreferences = user.notificationPreferences;
        const businessActivatedEnabled =
          notificationPreferences?.businessActivated !== undefined
            ? notificationPreferences.businessActivated
            : false;
        if (!businessActivatedEnabled) {
          this.logger.debug(
            `[BUSINESS_NOTIFICATION] Business user ${user.id} has businessActivated disabled`,
          );
        }
        return businessActivatedEnabled;
      });
      this.logger.log(
        `[BUSINESS_NOTIFICATION] Filtered to ${businessUsersToNotify.length} business users with businessActivated enabled`,
      );
      if (businessUsersToNotify.length === 0) {
        this.logger.warn(
          `[BUSINESS_NOTIFICATION] No business users to notify for business ${business.id}`,
        );
        return;
      }
      const sendPromises = businessUsersToNotify.map(async user => {
        try {
          this.logger.debug(`[BUSINESS_NOTIFICATION] Sending to business user ${user.id}`);
          await this.notificationService.sendToUser(user.id, {
            title: 'Dein Business ist jetzt aktiv',
            body: `${business.name} wurde freigeschaltet und ist jetzt sichtbar`,
            data: {
              type: 'BUSINESS_ACTIVATED',
              businessId: business.id,
              businessName: business.name,
              previousStatus: 'PENDING',
              newStatus: 'ACTIVE',
            },
          });
          this.logger.debug(
            `[BUSINESS_NOTIFICATION] Successfully sent to business user ${user.id}`,
          );
        } catch (error: any) {
          this.logger.error(
            `[BUSINESS_NOTIFICATION] Error sending notification to business user ${user.id}: ${error.message}`,
            error.stack,
          );
        }
      });
      await Promise.all(sendPromises);
      this.logger.log(
        `[BUSINESS_NOTIFICATION] Completed business activated notification process for business ${business.id}. Sent to ${businessUsersToNotify.length} business users.`,
      );
    } catch (error: any) {
      this.logger.error(
        `[BUSINESS_NOTIFICATION] Error sending business activated notification for business ${business.id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
