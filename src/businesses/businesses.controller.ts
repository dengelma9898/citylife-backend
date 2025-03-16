import { Controller, Get, Param, NotFoundException, Logger, UseGuards, Post, Body, Put, Patch, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { Business } from './interfaces/business.interface';
import { BusinessCategory } from './interfaces/business-category.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { AuthGuard } from '../core/guards/auth.guard';
import { CreateBusinessDto } from './dto/create-business.dto';
import { BusinessCustomerDto } from './dto/business-customer.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';

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
} 