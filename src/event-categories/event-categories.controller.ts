import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  UseInterceptors,
  UploadedFiles,
  NotFoundException,
} from '@nestjs/common';
import { EventCategoriesService } from './services/event-categories.service';
import { CreateEventCategoryDto } from './dto/create-event-category.dto';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto';
import { EventCategory } from './interfaces/event-category.interface';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';

@ApiTags('Event Categories')
@Controller('event-categories')
export class EventCategoriesController {
  constructor(
    private readonly eventCategoriesService: EventCategoriesService,
    private readonly firebaseStorageService: FirebaseStorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new event category' })
  @ApiResponse({ status: 201, description: 'The event category has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(
    @Body(ValidationPipe) createEventCategoryDto: CreateEventCategoryDto,
  ): Promise<EventCategory> {
    return this.eventCategoriesService.create(createEventCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all event categories' })
  @ApiResponse({ status: 200, description: 'Return all event categories.' })
  findAll(): Promise<EventCategory[]> {
    return this.eventCategoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an event category by id' })
  @ApiResponse({ status: 200, description: 'Return the event category.' })
  @ApiResponse({ status: 404, description: 'Event category not found.' })
  findOne(@Param('id') id: string): Promise<EventCategory | null> {
    return this.eventCategoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an event category' })
  @ApiResponse({ status: 200, description: 'The event category has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Event category not found.' })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEventCategoryDto: UpdateEventCategoryDto,
  ): Promise<EventCategory | null> {
    return this.eventCategoriesService.update(id, updateEventCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an event category' })
  @ApiResponse({ status: 200, description: 'The event category has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Event category not found.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.eventCategoriesService.remove(id);
  }

  @Patch(':id/fallback-images')
  @UseInterceptors(FilesInterceptor('images'))
  @ApiOperation({ summary: 'Add fallback images to an event category' })
  @ApiResponse({ status: 200, description: 'The fallback images have been successfully added.' })
  @ApiResponse({ status: 404, description: 'Event category not found.' })
  public async addFallbackImages(
    @Param('id') categoryId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[],
  ): Promise<EventCategory> {
    // Get current category
    const currentCategory = await this.eventCategoriesService.findOne(categoryId);
    if (!currentCategory) {
      throw new NotFoundException('Event category not found');
    }

    // Initialize fallbackImages array if it doesn't exist
    let fallbackImages = currentCategory.fallbackImages || [];

    if (files && files.length > 0) {
      // Upload each file and collect URLs
      for (const file of files) {
        const path = `event-categories/fallback-images/${categoryId}/${Date.now()}-${file.originalname}`;
        const imageUrl = await this.firebaseStorageService.uploadFile(file, path);
        fallbackImages.push(imageUrl);
      }
    }

    // Update the category with the new fallback image URLs
    return this.eventCategoriesService.update(categoryId, { fallbackImages });
  }

  @Patch(':id/fallback-images/remove')
  @ApiOperation({ summary: 'Remove a fallback image from an event category' })
  @ApiResponse({ status: 200, description: 'The fallback image has been successfully removed.' })
  @ApiResponse({ status: 404, description: 'Event category or image not found.' })
  public async removeFallbackImage(
    @Param('id') categoryId: string,
    @Body('imageUrl') imageUrl: string,
  ): Promise<EventCategory> {
    if (!imageUrl) {
      throw new NotFoundException('imageUrl is required');
    }

    // Get current category
    const currentCategory = await this.eventCategoriesService.findOne(categoryId);
    if (!currentCategory) {
      throw new NotFoundException('Event category not found');
    }

    // Check if the image exists in the category
    if (!currentCategory.fallbackImages || !currentCategory.fallbackImages.includes(imageUrl)) {
      throw new NotFoundException('Image not found in event category');
    }

    // Delete the image from Firebase Storage
    await this.firebaseStorageService.deleteFile(imageUrl);

    // Remove the URL from the category's fallbackImages array
    const updatedFallbackImages = currentCategory.fallbackImages.filter(url => url !== imageUrl);

    // Update the category
    return this.eventCategoriesService.update(categoryId, {
      fallbackImages: updatedFallbackImages,
    });
  }
}
