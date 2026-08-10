import {
  Controller,
  Get,
  Post,
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
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { BusinessesService } from '../services/businesses.service';
import { Business } from '../../interfaces/business.interface';
import { CreateBusinessDto } from '../../dto/create-business.dto';
import { BusinessCustomerDto } from '../../dto/business-customer.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../../../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';
import { UsersService } from '../../../users/users.service';
import { UserType } from '../../../users/enums/user-type.enum';
import { NuernbergspotsReviewDto } from '../../dto/nuernbergspots-review.dto';
import { BusinessStatus } from '../../domain/enums/business-status.enum';
import { UpdateOpeningHoursDto } from '../../dto/update-opening-hours.dto';
import { OpeningHoursMapper } from '../mappers/opening-hours.mapper';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { BusinessEventsSettingsService } from '../services/business-events-settings.service';
import { UpdateBusinessEventsSettingsDto } from '../dtos/update-business-events-settings.dto';

@ApiTags('businesses')
@ApiBearerAuth()
@Controller('businesses')
export class BusinessesController {
  private readonly logger = new Logger(BusinessesController.name);

  constructor(
    private readonly businessesService: BusinessesService,
    private readonly firebaseStorageService: FirebaseStorageService,
    private readonly usersService: UsersService,
    private readonly businessEventsSettingsService: BusinessEventsSettingsService,
  ) {}

  private async verifyBusinessAccessOrSuperAdmin(
    reqUserUid: string,
    businessId: string,
  ): Promise<void> {
    const businessUser = await this.usersService.getBusinessUser(reqUserUid);
    if (businessUser?.businessIds?.includes(businessId)) {
      return;
    }
    const userProfile = await this.usersService.getUserProfile(reqUserUid);
    if (userProfile?.userType === UserType.SUPER_ADMIN) {
      return;
    }
    throw new UnauthorizedException('You do not have permission to modify this business');
  }

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
  @UseGuards(RolesGuard)
  @Roles('business_user', 'super_admin')
  public async create(@Body() createBusinessDto: CreateBusinessDto): Promise<Business> {
    this.logger.log('POST /businesses');
    return this.businessesService.create(createBusinessDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('business_user', 'super_admin')
  public async patchBusiness(
    @Request() req: { user: { uid: string } },
    @Param('id') id: string,
    @Body() patchData: Partial<Business>,
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${id}`);
    await this.verifyBusinessAccessOrSuperAdmin(req.user.uid, id);
    this.logger.debug(`PATCH data: ${JSON.stringify(patchData)}`);
    return this.businessesService.update(id, patchData);
  }

  @Patch(':id/scan')
  @UseGuards(RolesGuard)
  @Roles('business_user', 'super_admin')
  public async scanCustomer(
    @Request() req: { user: { uid: string } },
    @Param('id') businessId: string,
    @Body() scanData: BusinessCustomerDto,
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/scan`);
    await this.verifyBusinessAccessOrSuperAdmin(req.user.uid, businessId);
    return this.businessesService.addCustomerScan(businessId, scanData);
  }

  @Post(':id/logo')
  @UseGuards(RolesGuard)
  @Roles('business_user', 'super_admin')
  @UseInterceptors(FileInterceptor('file'))
  public async uploadLogo(
    @Request() req: { user: { uid: string } },
    @Param('id') businessId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File,
  ): Promise<Business> {
    this.logger.log(`POST /businesses/${businessId}/logo`);
    await this.verifyBusinessAccessOrSuperAdmin(req.user.uid, businessId);

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
  @UseGuards(RolesGuard)
  @Roles('business_user', 'super_admin')
  @UseInterceptors(FilesInterceptor('images', 10))
  public async uploadImages(
    @Request() req: { user: { uid: string } },
    @Param('id') businessId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[],
  ): Promise<Business> {
    this.logger.log(`POST /businesses/${businessId}/images`);
    await this.verifyBusinessAccessOrSuperAdmin(req.user.uid, businessId);

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
  @UseGuards(RolesGuard)
  @Roles('business_user', 'super_admin')
  public async removeImage(
    @Request() req: { user: { uid: string } },
    @Param('id') businessId: string,
    @Body('imageUrl') imageUrl: string,
  ): Promise<Business> {
    this.logger.log(`DELETE /businesses/${businessId}/images`);
    await this.verifyBusinessAccessOrSuperAdmin(req.user.uid, businessId);

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
  @UseGuards(RolesGuard)
  @Roles('super_admin')
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
  @UseGuards(RolesGuard)
  @Roles('super_admin')
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
  @UseGuards(RolesGuard)
  @Roles('super_admin')
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
  @UseGuards(RolesGuard)
  @Roles('super_admin')
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
  @UseGuards(RolesGuard)
  @Roles('business_user', 'super_admin')
  public async updateBenefit(
    @Request() req: { user: { uid: string } },
    @Param('id') businessId: string,
    @Body('benefit') benefit: string,
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/benefit`);
    await this.verifyBusinessAccessOrSuperAdmin(req.user.uid, businessId);
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

  /**
   * @deprecated Use PATCH /businesses/:id with { openingHours: {...}, detailedOpeningHours: {...} } instead.
   * This endpoint exists only for backwards compatibility with older clients.
   */
  @Patch(':id/opening-hours')
  @UseGuards(RolesGuard)
  @Roles('business_user', 'super_admin')
  public async updateOpeningHours(
    @Request() req: { user: { uid: string } },
    @Param('id') businessId: string,
    @Body() openingHoursData: UpdateOpeningHoursDto,
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/opening-hours`);
    await this.verifyBusinessAccessOrSuperAdmin(req.user.uid, businessId);
    this.logger.warn(
      'DEPRECATED: Use PATCH /businesses/:id with openingHours/detailedOpeningHours fields instead',
    );
    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    const updateData = OpeningHoursMapper.buildUpdatePayload(
      openingHoursData,
      business.detailedOpeningHours,
    );
    return this.businessesService.update(businessId, updateData);
  }

  @Post('users/:id')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
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
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Anzahl ausstehender Business-Freigaben (nur SUPER_ADMIN)' })
  @ApiResponse({
    status: 401,
    description: 'Nicht autorisiert - Nur SUPER_ADMINs können diese Resource aufrufen',
  })
  public async getPendingApprovalsCount(): Promise<{ count: number }> {
    this.logger.log('GET /businesses/pending-approvals/count');

    const pendingBusinesses = await this.businessesService.getBusinessesByStatus({
      hasAccount: true,
      status: BusinessStatus.PENDING,
    });

    return { count: pendingBusinesses.length };
  }

  @Get('events/settings')
  @ApiOperation({ summary: 'Get business events feature settings' })
  @ApiResponse({ status: 200, description: 'Feature settings' })
  async getBusinessEventsSettings() {
    this.logger.log('GET /businesses/events/settings');
    return this.businessEventsSettingsService.getSettings();
  }

  @Patch('events/settings')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update business events feature settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  async updateBusinessEventsSettings(
    @Request() req: any,
    @Body() dto: UpdateBusinessEventsSettingsDto,
  ) {
    this.logger.log('PATCH /businesses/events/settings');
    const updatedBy = req.user.uid;
    return this.businessEventsSettingsService.updateSettings(dto.isEnabled, updatedBy);
  }
}
