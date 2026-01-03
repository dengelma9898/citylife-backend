import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  NotFoundException,
  Logger,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { BusinessesService } from '../services/businesses.service';
import { Business } from '../../domain/entities/business.entity';
import { CreateBusinessDto } from '../../dto/create-business.dto';
import { BusinessCustomerDto } from '../../dto/business-customer.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../../../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';
import { UsersService } from '../../../users/users.service';
import { NuernbergspotsReviewDto } from '../../dto/nuernbergspots-review.dto';
import { BusinessStatus } from '../../domain/enums/business-status.enum';

@Controller('businesses')
export class BusinessesController {
  private readonly logger = new Logger(BusinessesController.name);

  constructor(
    private readonly businessesService: BusinessesService,
    private readonly firebaseStorageService: FirebaseStorageService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  public async getAll(): Promise<Business[]> {
    this.logger.log('GET /businesses');
    return this.businessesService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<Business> {
    this.logger.log(`GET /businesses/${id}`);
    const business = await this.businessesService.getById(id);
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }

  @Post()
  public async create(@Body() createBusinessDto: CreateBusinessDto): Promise<Business> {
    this.logger.log('POST /businesses');
    return this.businessesService.create(createBusinessDto);
  }

  @Put(':id')
  public async update(
    @Param('id') id: string,
    @Body() updateBusinessDto: Partial<CreateBusinessDto>,
  ): Promise<Business> {
    this.logger.log(`PUT /businesses/${id}`);
    return this.businessesService.update(id, updateBusinessDto as Partial<Business>);
  }

  @Patch(':id')
  public async patchBusiness(
    @Param('id') id: string,
    @Body() patchData: Partial<Business>,
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${id}`);
    return this.businessesService.update(id, patchData);
  }

  @Patch(':id/scan')
  public async scanCustomer(
    @Param('id') businessId: string,
    @Body() scanData: BusinessCustomerDto,
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/scan`);
    return this.businessesService.addCustomerScan(businessId, scanData);
  }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file'))
  public async uploadLogo(
    @Param('id') businessId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File,
  ): Promise<Business> {
    this.logger.log(`POST /businesses/${businessId}/logo`);

    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.logoUrl) {
      try {
        await this.firebaseStorageService.deleteFile(business.logoUrl);
      } catch (error) {
        this.logger.error(`Failed to delete old logo: ${error.message}`);
      }
    }

    const path = `businesses/${businessId}/logo/${Date.now()}-${file.originalname}`;
    const logoUrl = await this.firebaseStorageService.uploadFile(file, path);

    return this.businessesService.update(businessId, { logoUrl });
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  public async uploadImages(
    @Param('id') businessId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[],
  ): Promise<Business> {
    this.logger.log(`POST /businesses/${businessId}/images`);

    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const uploadPromises = files.map(file => {
      const path = `businesses/${businessId}/images/${Date.now()}-${file.originalname}`;
      return this.firebaseStorageService.uploadFile(file, path);
    });

    const newImageUrls = await Promise.all(uploadPromises);
    const imageUrls = [...(business.imageUrls || []), ...newImageUrls];

    return this.businessesService.update(businessId, { imageUrls });
  }

  @Delete(':id/images')
  public async removeImage(
    @Param('id') businessId: string,
    @Body('imageUrl') imageUrl: string,
  ): Promise<Business> {
    this.logger.log(`DELETE /businesses/${businessId}/images`);

    if (!imageUrl) {
      throw new BadRequestException('Image URL is required');
    }

    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const imageUrls = business.imageUrls || [];
    if (!imageUrls.includes(imageUrl)) {
      throw new BadRequestException('Image URL not found in business');
    }

    try {
      await this.firebaseStorageService.deleteFile(imageUrl);
    } catch (error) {
      this.logger.error(`Failed to delete image from storage: ${error.message}`);
    }

    const updatedImageUrls = imageUrls.filter(url => url !== imageUrl);
    return this.businessesService.update(businessId, { imageUrls: updatedImageUrls });
  }

  @Patch(':id/nuernbergspots-review')
  public async updateNuernbergspotsReview(
    @Param('id') businessId: string,
    @Body() reviewData: NuernbergspotsReviewDto,
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/nuernbergspots-review`);

    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const review = {
      reviewText: reviewData.reviewText || '',
      reviewImageUrls: reviewData.reviewImageUrls || [],
      updatedAt: new Date().toISOString(),
    };

    return this.businessesService.update(businessId, { nuernbergspotsReview: review });
  }

  @Post(':id/nuernbergspots-review/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  public async uploadReviewImages(
    @Param('id') businessId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[],
  ): Promise<Business> {
    this.logger.log(`POST /businesses/${businessId}/nuernbergspots-review/images`);

    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const review = business.nuernbergspotsReview || {
      reviewText: '',
      reviewImageUrls: [],
      updatedAt: new Date().toISOString(),
    };

    const uploadPromises = files.map(file => {
      const path = `businesses/${businessId}/review-images/${Date.now()}-${file.originalname}`;
      return this.firebaseStorageService.uploadFile(file, path);
    });

    const newImageUrls = await Promise.all(uploadPromises);
    const reviewImageUrls = [...(review.reviewImageUrls || []), ...newImageUrls];

    const updatedReview = {
      ...review,
      reviewImageUrls,
      updatedAt: new Date().toISOString(),
    };

    return this.businessesService.update(businessId, { nuernbergspotsReview: updatedReview });
  }

  @Delete(':id/nuernbergspots-review/images')
  public async removeReviewImage(
    @Param('id') businessId: string,
    @Body('imageUrl') imageUrl: string,
  ): Promise<Business> {
    this.logger.log(`DELETE /businesses/${businessId}/nuernbergspots-review/images`);

    if (!imageUrl) {
      throw new BadRequestException('Image URL is required');
    }

    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const review = business.nuernbergspotsReview;
    if (!review) {
      throw new BadRequestException('No review found for the business');
    }

    const reviewImageUrls = review.reviewImageUrls || [];
    if (!reviewImageUrls.includes(imageUrl)) {
      throw new BadRequestException('Image URL not found in the review');
    }

    try {
      await this.firebaseStorageService.deleteFile(imageUrl);
    } catch (error) {
      this.logger.error(`Failed to delete review image from storage: ${error.message}`);
    }

    const updatedReviewImageUrls = reviewImageUrls.filter(url => url !== imageUrl);
    const updatedReview = {
      ...review,
      reviewImageUrls: updatedReviewImageUrls,
      updatedAt: new Date().toISOString(),
    };

    return this.businessesService.update(businessId, { nuernbergspotsReview: updatedReview });
  }

  @Patch(':id/has-account')
  public async updateHasAccount(
    @Param('id') businessId: string,
    @Body('hasAccount') hasAccount: boolean,
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/has-account`);

    if (hasAccount === undefined) {
      throw new BadRequestException('hasAccount field is required');
    }

    return this.businessesService.update(businessId, { hasAccount });
  }

  /**
   * @deprecated Use PATCH /businesses/:id with { benefit: "..." } instead.
   * This endpoint exists only for backwards compatibility with older clients.
   */
  @Patch(':id/benefit')
  public async updateBenefit(
    @Param('id') businessId: string,
    @Body('benefit') benefit: string,
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/benefit`);
    this.logger.warn('DEPRECATED: Use PATCH /businesses/:id with benefit field instead');

    if (!benefit) {
      throw new BadRequestException('benefit field is required');
    }

    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return this.businessesService.update(businessId, {
      benefit,
      previousBenefits: [...(business.previousBenefits || []), business.benefit],
    });
  }

  @Post('users/:id')
  public async createBusinessForUser(
    @Param('id') userId: string,
    @Body() createBusinessDto: CreateBusinessDto,
  ): Promise<Business> {
    this.logger.log(`POST /businesses/users/${userId}`);

    const businessUser = await this.usersService.getBusinessUser(userId);
    if (!businessUser) {
      throw new NotFoundException(`Business user with ID ${userId} not found`);
    }

    const createdBusiness = await this.businessesService.create(createBusinessDto);
    await this.usersService.addBusinessToUser(userId, createdBusiness.id);

    return createdBusiness;
  }

  @Get('pending-approvals/count')
  public async getPendingApprovalsCount(): Promise<{ count: number }> {
    this.logger.log('GET /businesses/pending-approvals/count');

    const pendingBusinesses = await this.businessesService.getBusinessesByStatus({
      hasAccount: true,
      status: BusinessStatus.PENDING,
    });

    return { count: pendingBusinesses.length };
  }
}
