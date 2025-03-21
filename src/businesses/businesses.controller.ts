import { Controller, Get, Param, NotFoundException, Logger, UseGuards, Post, Body, Put, Patch, UseInterceptors, UploadedFile, UploadedFiles, BadRequestException } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { Business, NuernbergspotsReview } from './interfaces/business.interface';
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
    @Body() updateBusinessDto: Partial<CreateBusinessDto>
  ): Promise<Business> {
    this.logger.log(`PUT /businesses/${id}`);
    return this.businessesService.update(id, updateBusinessDto);
  }

  @Patch(':id')
  public async patchBusiness(
    @Param('id') id: string,
    @Body() patchData: Partial<Business>
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${id}`);
    return this.businessesService.patch(id, patchData);
  }

  @Patch(':id/scan')
  public async scanCustomer(
    @Param('id') businessId: string,
    @Body() scanData: BusinessCustomerDto
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/scan`);
    return this.businessesService.addCustomerScan(businessId, scanData);
  }

  @Patch(':id/logo')
  @UseInterceptors(FileInterceptor('file'))
  public async uploadLogo(
    @Param('id') businessId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/logo`);

    // Get current business to check for existing logo
    const currentBusiness = await this.businessesService.getById(businessId);
    if (!currentBusiness) {
      throw new NotFoundException('Business not found');
    }

    // Delete old logo if it exists
    if (currentBusiness.logoUrl) {
      this.logger.debug('Deleting old logo');
      await this.firebaseStorageService.deleteFile(currentBusiness.logoUrl);
    }

    // Upload the new logo
    const path = `businesses/logos/${businessId}/${Date.now()}-${file.originalname}`;
    const logoUrl = await this.firebaseStorageService.uploadFile(file, path);

    // Update the business with the new logo URL
    return this.businessesService.patch(businessId, { logoUrl });
  }

  @Patch(':id/images')
  @UseInterceptors(FilesInterceptor('images'))
  public async uploadImages(
    @Param('id') businessId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[]
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/images`);

    // Get current business
    const currentBusiness = await this.businessesService.getById(businessId);
    if (!currentBusiness) {
      throw new NotFoundException('Business not found');
    }

    // Initialize imageUrls array if it doesn't exist
    let imageUrls = currentBusiness.imageUrls || [];
    
    if (files && files.length > 0) {
      this.logger.debug(`Uploading ${files.length} new images for business ${businessId}`);
      
      // Upload each file and collect URLs
      for (const file of files) {
        const path = `businesses/images/${businessId}/${Date.now()}-${file.originalname}`;
        const imageUrl = await this.firebaseStorageService.uploadFile(file, path);
        imageUrls.push(imageUrl);
      }
    } else {
      this.logger.debug('No new images provided for business');
    }
    
    // Update the business with the new image URLs
    return this.businessesService.patch(businessId, { imageUrls });
  }

  @Patch(':id/images/remove')
  public async removeImage(
    @Param('id') businessId: string,
    @Body('imageUrl') imageUrl: string
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/images/remove`);
    
    if (!imageUrl) {
      throw new NotFoundException('imageUrl is required');
    }
    
    // Get current business
    const currentBusiness = await this.businessesService.getById(businessId);
    if (!currentBusiness) {
      throw new NotFoundException('Business not found');
    }
    
    // Check if the image exists in the business
    if (!currentBusiness.imageUrls || !currentBusiness.imageUrls.includes(imageUrl)) {
      throw new NotFoundException('Image not found in business');
    }
    
    // Delete the image from Firebase Storage
    await this.firebaseStorageService.deleteFile(imageUrl);
    
    // Remove the URL from the business's imageUrls array
    const updatedImageUrls = currentBusiness.imageUrls.filter(url => url !== imageUrl);
    
    // Update the business
    return this.businessesService.patch(businessId, { imageUrls: updatedImageUrls });
  }

  @Patch(':id/nuernbergspots-review')
  public async updateNuernbergspotsReview(
    @Param('id') businessId: string,
    @Body() reviewData: NuernbergspotsReviewDto
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/nuernbergspots-review`);
    
    // Get current business
    const currentBusiness = await this.businessesService.getById(businessId);
    if (!currentBusiness) {
      throw new NotFoundException('Business not found');
    }
    
    // Hole die aktuelle Review, falls vorhanden
    const currentReview = currentBusiness.nuernbergspotsReview || {};
    
    // Wenn reviewImageUrls in den neuen Daten vorhanden ist, vergleiche mit aktuellen Bildern
    // und lösche alle Bilder, die nicht mehr in der neuen Liste sind
    if (reviewData.reviewImageUrls && currentReview.reviewImageUrls) {
      const currentImageUrls = currentReview.reviewImageUrls;
      const newImageUrls = reviewData.reviewImageUrls;
      
      // Finde Bilder, die gelöscht werden sollen (im aktuellen Array, aber nicht im neuen)
      const imagesToDelete = currentImageUrls.filter(url => !newImageUrls.includes(url));
      
      if (imagesToDelete.length > 0) {
        this.logger.debug(`Deleting ${imagesToDelete.length} review images that were removed`);
        
        // Lösche jedes entfernte Bild aus Firebase Storage
        const deletePromises = imagesToDelete.map(imageUrl => {
          this.logger.debug(`Deleting review image: ${imageUrl}`);
          return this.firebaseStorageService.deleteFile(imageUrl);
        });
        
        // Warte auf den Abschluss aller Löschvorgänge
        await Promise.all(deletePromises);
      }
    }
    
    // Erstelle das aktualisierte NuernbergspotsReview-Objekt mit aktuellem Zeitstempel
    const updatedReview: NuernbergspotsReview = {
      ...currentReview,
      ...reviewData,
      updatedAt: new Date().toISOString()
    };
    
    // Aktualisiere das Business mit den neuen Review-Daten
    return this.businessesService.patch(businessId, { nuernbergspotsReview: updatedReview });
  }

  @Patch(':id/nuernbergspots-images')
  @UseInterceptors(FilesInterceptor('images'))
  public async uploadReviewImages(
    @Param('id') businessId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[]
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/nuernbergspots-images`);

    // Get current business
    const currentBusiness = await this.businessesService.getById(businessId);
    if (!currentBusiness) {
      throw new NotFoundException('Business not found');
    }
    
    // Initialize nuernbergspotsReview if it doesn't exist
    const nuernbergspotsReview = currentBusiness.nuernbergspotsReview || {};
    
    // Initialize reviewImageUrls array if it doesn't exist
    let reviewImageUrls = nuernbergspotsReview.reviewImageUrls || [];
    
    if (files && files.length > 0) {
      this.logger.debug(`Uploading ${files.length} new review images for business ${businessId}`);
      
      // Upload each file and collect URLs
      for (const file of files) {
        const path = `businesses/review-images/${businessId}/${Date.now()}-${file.originalname}`;
        const imageUrl = await this.firebaseStorageService.uploadFile(file, path);
        reviewImageUrls.push(imageUrl);
      }
    } else {
      this.logger.debug('No new review images provided for business');
    }
    
    // Update the nuernbergspotsReview object with the new images and timestamp
    nuernbergspotsReview.reviewImageUrls = reviewImageUrls;
    nuernbergspotsReview.updatedAt = new Date().toISOString();
    
    // Update the business with the updated nuernbergspotsReview
    return this.businessesService.patch(businessId, { nuernbergspotsReview });
  }

  @Patch(':id/review-images/remove')
  public async removeReviewImage(
    @Param('id') businessId: string,
    @Body('imageUrl') imageUrl: string
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/review-images/remove`);
    
    if (!imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }
    
    // Get current business
    const currentBusiness = await this.businessesService.getById(businessId);
    if (!currentBusiness) {
      throw new NotFoundException('Business not found');
    }
    
    // Check if the nuernbergspotsReview and reviewImageUrls exist
    if (!currentBusiness.nuernbergspotsReview || !currentBusiness.nuernbergspotsReview.reviewImageUrls) {
      throw new NotFoundException('Review images not found for this business');
    }
    
    // Check if the image exists in the review images
    if (!currentBusiness.nuernbergspotsReview.reviewImageUrls.includes(imageUrl)) {
      throw new NotFoundException('Image not found in review images');
    }
    
    // Delete the image from Firebase Storage
    await this.firebaseStorageService.deleteFile(imageUrl);
    
    // Remove the URL from the reviewImageUrls array
    const updatedReviewImageUrls = currentBusiness.nuernbergspotsReview.reviewImageUrls.filter(
      url => url !== imageUrl
    );
    
    // Update the nuernbergspotsReview object with new image URLs and timestamp
    const updatedNuernbergspotsReview = {
      ...currentBusiness.nuernbergspotsReview,
      reviewImageUrls: updatedReviewImageUrls,
      updatedAt: new Date().toISOString()
    };
    
    // Update the business
    return this.businessesService.patch(businessId, { nuernbergspotsReview: updatedNuernbergspotsReview });
  }

  @Patch(':id/has-account')
  public async updateHasAccount(
    @Param('id') businessId: string,
    @Body('hasAccount') hasAccount: boolean
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${businessId}/has-account`);
    
    if (hasAccount === undefined) {
      throw new BadRequestException('hasAccount is required');
    }
    
    // Get current business
    const currentBusiness = await this.businessesService.getById(businessId);
    if (!currentBusiness) {
      throw new NotFoundException('Business not found');
    }
    
    // Update the hasAccount field
    return this.businessesService.patch(businessId, { 
      hasAccount,
      updatedAt: new Date().toISOString()
    });
  }
} 