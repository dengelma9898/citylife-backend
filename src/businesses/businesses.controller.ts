import { Controller, Get, Param, NotFoundException, Logger, UseGuards, Post, Body, Put, Patch, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException, Delete } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { Business, BusinessResponse, NuernbergspotsReview } from './interfaces/business.interface';
import { BusinessCategory } from './interfaces/business-category.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { AuthGuard } from '../core/guards/auth.guard';
import { CreateBusinessDto } from './dto/create-business.dto';
import { BusinessCustomerDto } from './dto/business-customer.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { IsBoolean, IsNotEmpty } from 'class-validator';

// Erstelle ein DTO für die NuernbergspotsReview
class NuernbergspotsReviewDto {
  reviewText?: string;
  reviewImageUrls?: string[];
}

@Controller('businesses')
@UseGuards(AuthGuard)
export class BusinessesController {
  private readonly logger = new Logger(BusinessesController.name);

  constructor(
    private readonly businessesService: BusinessesService,
    private readonly firebaseStorageService: FirebaseStorageService
  ) {}

  @Get('categories')
  public async getAllCategories(): Promise<BusinessCategory[]> {
    this.logger.log('GET /businesses/categories');
    return this.businessesService.getAllCategories();
  }

  @Get()
  public async getAll(): Promise<BusinessResponse[]> {
    this.logger.log('GET /businesses');
    return this.businessesService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<BusinessResponse> {
    this.logger.log(`GET /businesses/${id}`);
    const business = await this.businessesService.getById(id);
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }

  @Post()
  public async create(@Body() createBusinessDto: CreateBusinessDto): Promise<BusinessResponse> {
    this.logger.log('POST /businesses');
    return this.businessesService.create(createBusinessDto);
  }

  @Put(':id')
  public async update(
    @Param('id') id: string,
    @Body() updateBusinessDto: Partial<CreateBusinessDto>
  ): Promise<BusinessResponse> {
    this.logger.log(`PUT /businesses/${id}`);
    return this.businessesService.update(id, updateBusinessDto as Partial<Business>);
  }

  @Patch(':id')
  public async patchBusiness(
    @Param('id') id: string,
    @Body() patchData: Partial<Business>
  ): Promise<BusinessResponse> {
    this.logger.log(`PATCH /businesses/${id}`);
    return this.businessesService.patch(id, patchData);
  }

  @Patch(':id/scan')
  public async scanCustomer(
    @Param('id') businessId: string,
    @Body() scanData: BusinessCustomerDto
  ): Promise<BusinessResponse> {
    this.logger.log(`PATCH /businesses/${businessId}/scan`);
    return this.businessesService.addCustomerScan(businessId, scanData);
  }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file'))
  public async uploadLogo(
    @Param('id') businessId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File
  ): Promise<BusinessResponse> {
    this.logger.log(`POST /businesses/${businessId}/logo`);
    
    // Get current business to check for existing logo
    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Delete old logo if it exists
    if (business.logoUrl) {
      try {
        await this.firebaseStorageService.deleteFile(business.logoUrl);
      } catch (error) {
        this.logger.error(`Failed to delete old logo: ${error.message}`);
      }
    }

    // Upload new logo
    const path = `businesses/${businessId}/logo/${Date.now()}-${file.originalname}`;
    const logoUrl = await this.firebaseStorageService.uploadFile(file, path);

    // Update business with new logo URL
    return this.businessesService.update(businessId, { logoUrl });
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  public async uploadImages(
    @Param('id') businessId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[]
  ): Promise<BusinessResponse> {
    this.logger.log(`POST /businesses/${businessId}/images`);
    
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Get current business to get existing images
    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Upload each new image
    const uploadPromises = files.map(file => {
      const path = `businesses/${businessId}/images/${Date.now()}-${file.originalname}`;
      return this.firebaseStorageService.uploadFile(file, path);
    });

    const newImageUrls = await Promise.all(uploadPromises);
    
    // Add new image URLs to existing ones
    const imageUrls = [...(business.imageUrls || []), ...newImageUrls];

    // Update business with new image URLs
    return this.businessesService.update(businessId, { imageUrls });
  }

  @Delete(':id/images')
  public async removeImage(
    @Param('id') businessId: string,
    @Body('imageUrl') imageUrl: string
  ): Promise<BusinessResponse> {
    this.logger.log(`DELETE /businesses/${businessId}/images`);
    
    if (!imageUrl) {
      throw new BadRequestException('Image URL is required');
    }

    // Get current business to get existing images
    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Check if image URL exists in the business
    const imageUrls = business.imageUrls || [];
    if (!imageUrls.includes(imageUrl)) {
      throw new BadRequestException('Image URL not found in business');
    }

    // Delete the image from Firebase Storage
    try {
      await this.firebaseStorageService.deleteFile(imageUrl);
    } catch (error) {
      this.logger.error(`Failed to delete image from storage: ${error.message}`);
    }

    // Remove the image URL from the business
    const updatedImageUrls = imageUrls.filter(url => url !== imageUrl);

    // Update business with new image URLs
    return this.businessesService.update(businessId, { imageUrls: updatedImageUrls });
  }

  @Patch(':id/nuernbergspots-review')
  public async updateNuernbergspotsReview(
    @Param('id') businessId: string,
    @Body() reviewData: NuernbergspotsReviewDto
  ): Promise<BusinessResponse> {
    this.logger.log(`PATCH /businesses/${businessId}/nuernbergspots-review`);
    
    // Get current business
    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Create or update the review
    const review: NuernbergspotsReview = {
      reviewText: reviewData.reviewText,
      reviewImageUrls: reviewData.reviewImageUrls,
      updatedAt: new Date().toISOString()
    };

    // Update business with the review
    return this.businessesService.update(businessId, { nuernbergspotsReview: review });
  }

  @Post(':id/nuernbergspots-review/images')
  @UseInterceptors(FilesInterceptor('files', 10))
  public async uploadReviewImages(
    @Param('id') businessId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[]
  ): Promise<BusinessResponse> {
    this.logger.log(`POST /businesses/${businessId}/nuernbergspots-review/images`);
    
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Get current business to get existing review images
    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Get current review or create a new one
    const review = business.nuernbergspotsReview || {
      reviewText: '',
      reviewImageUrls: [],
      updatedAt: new Date().toISOString()
    };

    // Upload each new image
    const uploadPromises = files.map(file => {
      const path = `businesses/${businessId}/review-images/${Date.now()}-${file.originalname}`;
      return this.firebaseStorageService.uploadFile(file, path);
    });

    const newImageUrls = await Promise.all(uploadPromises);
    
    // Add new image URLs to existing ones
    const reviewImageUrls = [...(review.reviewImageUrls || []), ...newImageUrls];

    // Update the review with new image URLs
    const updatedReview: NuernbergspotsReview = {
      ...review,
      reviewImageUrls,
      updatedAt: new Date().toISOString()
    };

    // Update business with updated review
    return this.businessesService.update(businessId, { nuernbergspotsReview: updatedReview });
  }

  @Delete(':id/nuernbergspots-review/images')
  public async removeReviewImage(
    @Param('id') businessId: string,
    @Body('imageUrl') imageUrl: string
  ): Promise<BusinessResponse> {
    this.logger.log(`DELETE /businesses/${businessId}/nuernbergspots-review/images`);
    
    if (!imageUrl) {
      throw new BadRequestException('Image URL is required');
    }

    // Get current business to get existing review
    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Check if review exists
    const review = business.nuernbergspotsReview;
    if (!review) {
      throw new BadRequestException('No review found for the business');
    }

    // Check if image URL exists in the review
    const reviewImageUrls = review.reviewImageUrls || [];
    if (!reviewImageUrls.includes(imageUrl)) {
      throw new BadRequestException('Image URL not found in the review');
    }

    // Delete the image from Firebase Storage
    try {
      await this.firebaseStorageService.deleteFile(imageUrl);
    } catch (error) {
      this.logger.error(`Failed to delete review image from storage: ${error.message}`);
    }

    // Remove the image URL from the review
    const updatedReviewImageUrls = reviewImageUrls.filter(url => url !== imageUrl);

    // Update the review with new image URLs
    const updatedReview: NuernbergspotsReview = {
      ...review,
      reviewImageUrls: updatedReviewImageUrls,
      updatedAt: new Date().toISOString()
    };

    // Update business with updated review
    return this.businessesService.update(businessId, { nuernbergspotsReview: updatedReview });
  }

  @Patch(':id/has-account')
  public async updateHasAccount(
    @Param('id') businessId: string,
    @Body('hasAccount') hasAccount: boolean
  ): Promise<BusinessResponse> {
    this.logger.log(`PATCH /businesses/${businessId}/has-account`);
    
    if (hasAccount === undefined) {
      throw new BadRequestException('hasAccount field is required');
    }
    
    return this.businessesService.updateHasAccount(businessId, hasAccount);
  }
} 