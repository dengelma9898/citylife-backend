import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { Business, BusinessAddress, BusinessContact, BusinessCustomer } from '../../domain/entities/business.entity';
import { BusinessRepository, BUSINESS_REPOSITORY } from '../../domain/repositories/business.repository';
import { CreateBusinessDto } from '../../dto/create-business.dto';
import { BusinessCustomerDto } from '../../dto/business-customer.dto';
import { BusinessStatus } from '../../domain/enums/business-status.enum';
import { BusinessCategoriesService } from '../../../business-categories/application/services/business-categories.service';
import { KeywordsService } from '../../../keywords/keywords.service';
import { EventsService } from '../../../events/events.service';
import { DateTimeUtils } from '../../../utils/date-time.utils';
import { UpdateBusinessCategoryDto } from 'src/business-categories/dto/update-business-category.dto';

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);

  constructor(
    @Inject(BUSINESS_REPOSITORY)
    private readonly businessRepository: BusinessRepository,
    private readonly businessCategoriesService: BusinessCategoriesService,
    private readonly keywordsService: KeywordsService,
    private readonly eventsService: EventsService
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
      status: data.isAdmin ? BusinessStatus.ACTIVE : BusinessStatus.PENDING
    });

    return this.businessRepository.create(business);
  }

  public async update(id: string, data: Partial<Business>): Promise<Business> {
    this.logger.debug(`Updating business ${id}`);
    const existingBusiness = await this.businessRepository.findById(id);
    if (!existingBusiness) {
      throw new NotFoundException('Business not found');
    }

    const updatedBusiness = existingBusiness.update(data);
    return this.businessRepository.update(id, updatedBusiness);
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting business ${id}`);
    return this.businessRepository.delete(id);
  }

  public async updateStatus(id: string, status: BusinessStatus): Promise<Business> {
    this.logger.debug(`Updating business status ${id} to ${status}`);
    const existingBusiness = await this.businessRepository.findById(id);
    if (!existingBusiness) {
      throw new NotFoundException('Business not found');
    }

    const updatedBusiness = existingBusiness.updateStatus(status);
    return this.businessRepository.update(id, updatedBusiness);
  }

  public async addCustomerScan(businessId: string, scanData: BusinessCustomerDto): Promise<Business> {
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
      benefit: existingBusiness.benefit
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

  public async getBusinessesByStatus(filter: { hasAccount: boolean; status: BusinessStatus }): Promise<Business[]> {
    this.logger.debug(`Getting businesses with status ${filter.status} and hasAccount ${filter.hasAccount}`);
    return this.businessRepository.findByStatusAndHasAccount(filter.status, filter.hasAccount);
  }
} 