import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe, UseInterceptors, UploadedFiles, NotFoundException } from '@nestjs/common';
import { JobOfferCategoriesService } from './services/job-offer-categories.service';
import { CreateJobCategoryDto } from './dto/create-job-category.dto';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { JobCategory } from './domain/entities/job-category.entity';

@ApiTags('Job Offer Categories')
@Controller('job-offer-categories')
export class JobOfferCategoriesController {
  constructor(
    private readonly jobOfferCategoriesService: JobOfferCategoriesService,
    private readonly firebaseStorageService: FirebaseStorageService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job offer category' })
  @ApiResponse({ status: 201, description: 'The job offer category has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body(ValidationPipe) createJobCategoryDto: CreateJobCategoryDto): Promise<JobCategory> {
    return this.jobOfferCategoriesService.create(createJobCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all job offer categories' })
  @ApiResponse({ status: 200, description: 'Return all job offer categories.' })
  findAll(): Promise<JobCategory[]> {
    return this.jobOfferCategoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job offer category by id' })
  @ApiResponse({ status: 200, description: 'Return the job offer category.' })
  @ApiResponse({ status: 404, description: 'Job offer category not found.' })
  findOne(@Param('id') id: string): Promise<JobCategory> {
    return this.jobOfferCategoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job offer category' })
  @ApiResponse({ status: 200, description: 'The job offer category has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Job offer category not found.' })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateJobCategoryDto: Partial<CreateJobCategoryDto>
  ): Promise<JobCategory> {
    return this.jobOfferCategoriesService.update(id, updateJobCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job offer category' })
  @ApiResponse({ status: 200, description: 'The job offer category has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Job offer category not found.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.jobOfferCategoriesService.remove(id);
  }

  @Patch(':id/fallback-images')
  @UseInterceptors(FilesInterceptor('images'))
  @ApiOperation({ summary: 'Add fallback images to a job offer category' })
  @ApiResponse({ status: 200, description: 'The fallback images have been successfully added.' })
  @ApiResponse({ status: 404, description: 'Job offer category not found.' })
  public async addFallbackImages(
    @Param('id') categoryId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[]
  ): Promise<JobCategory> {
    // Get current category
    const currentCategory = await this.jobOfferCategoriesService.findOne(categoryId);
    if (!currentCategory) {
      throw new NotFoundException('Job offer category not found');
    }

    // Initialize fallbackImages array if it doesn't exist
    let fallbackImages = currentCategory.fallbackImages || [];
    
    if (files && files.length > 0) {
      // Upload each file and collect URLs
      for (const file of files) {
        const path = `job-offer-categories/fallback-images/${categoryId}/${Date.now()}-${file.originalname}`;
        const imageUrl = await this.firebaseStorageService.uploadFile(file, path);
        fallbackImages.push(imageUrl);
      }
    }
    
    // Update the category with the new fallback image URLs
    return this.jobOfferCategoriesService.update(categoryId, { fallbackImages });
  }

  @Patch(':id/fallback-images/remove')
  @ApiOperation({ summary: 'Remove a fallback image from a job offer category' })
  @ApiResponse({ status: 200, description: 'The fallback image has been successfully removed.' })
  @ApiResponse({ status: 404, description: 'Job offer category or image not found.' })
  public async removeFallbackImage(
    @Param('id') categoryId: string,
    @Body('imageUrl') imageUrl: string
  ): Promise<JobCategory> {

    if (!imageUrl) {
      throw new NotFoundException('imageUrl is required');
    }
    
    // Get current category
    const currentCategory = await this.jobOfferCategoriesService.findOne(categoryId);
    if (!currentCategory) {
      throw new NotFoundException('Job offer category not found');
    }
    
    // Check if the image exists in the category
    if (!currentCategory.fallbackImages || !currentCategory.fallbackImages.includes(imageUrl)) {
      throw new NotFoundException('Image not found in job offer category');
    }
    
    // Delete the image from Firebase Storage
    await this.firebaseStorageService.deleteFile(imageUrl);
    
    // Remove the URL from the category's fallbackImages array
    const updatedFallbackImages = currentCategory.fallbackImages.filter(url => url !== imageUrl);
    
    // Update the category
    return this.jobOfferCategoriesService.update(categoryId, { fallbackImages: updatedFallbackImages });
  }
} 