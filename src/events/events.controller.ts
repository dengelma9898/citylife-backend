import { Controller, Get, Post, Put, Body, Param, NotFoundException, Logger, Patch, UseInterceptors, UploadedFile, Delete, UploadedFiles } from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from './interfaces/event.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';

@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly firebaseStorageService: FirebaseStorageService
  ) {}

  @Get()
  public async getAll(): Promise<Event[]> {
    this.logger.log('GET /events');
    return this.eventsService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<Event> {
    this.logger.log(`GET /events/${id}`);
    const event = await this.eventsService.getById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  @Post()
  public async create(@Body() createEventDto: CreateEventDto): Promise<Event> {
    this.logger.log('POST /events');
    return this.eventsService.create(createEventDto);
  }

  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Body() updateEventDto: Partial<Event>
  ): Promise<Event> {
    this.logger.log(`PATCH /events/${id}`);
    return this.eventsService.update(id, updateEventDto);
  }

  @Patch(':id/title-image')
  @UseInterceptors(FileInterceptor('file'))
  public async updateTitleImage(
    @Param('id') eventId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File
  ): Promise<Event> {
    this.logger.log(`PATCH /events/${eventId}/title-image`);

    // Get current event to check for existing title image
    const currentEvent = await this.eventsService.getById(eventId);
    if (!currentEvent) {
      throw new NotFoundException('Event not found');
    }

    // Delete old title image if it exists
    if (currentEvent.titleImageUrl) {
      this.logger.debug('Deleting old title image');
      await this.firebaseStorageService.deleteFile(currentEvent.titleImageUrl);
    }

    // Upload the new title image
    const path = `events/title-images/${eventId}/${Date.now()}-${file.originalname}`;
    const imageUrl = await this.firebaseStorageService.uploadFile(file, path);

    // Update the event with the new title image URL
    return this.eventsService.update(eventId, { titleImageUrl: imageUrl });
  }

  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /events/${id}`);
    
    // Get current event to check for existing images
    const currentEvent = await this.eventsService.getById(id);
    if (!currentEvent) {
      throw new NotFoundException('Event not found');
    }
    
    // Array to collect all delete promises
    const deletePromises: Promise<void>[] = [];
    
    // Delete title image if it exists
    if (currentEvent.titleImageUrl) {
      this.logger.debug(`Deleting title image: ${currentEvent.titleImageUrl}`);
      deletePromises.push(this.firebaseStorageService.deleteFile(currentEvent.titleImageUrl));
    }
    
    // Delete all additional images if they exist
    if (currentEvent.imageUrls && currentEvent.imageUrls.length > 0) {
      this.logger.debug(`Deleting ${currentEvent.imageUrls.length} additional images for event ${id}`);
      
      // Add each image deletion to the promises array
      currentEvent.imageUrls.forEach(imageUrl => {
        this.logger.debug(`Deleting image: ${imageUrl}`);
        deletePromises.push(this.firebaseStorageService.deleteFile(imageUrl));
      });
    }
    
    // Wait for all images to be deleted
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
    
    // Delete the event
    return this.eventsService.delete(id);
  }

  @Patch(':id/images')
  @UseInterceptors(FilesInterceptor('images'))
  public async addImages(
    @Param('id') eventId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[]
  ): Promise<Event> {
    this.logger.log(`PATCH /events/${eventId}/images`);

    // Get current event
    const currentEvent = await this.eventsService.getById(eventId);
    if (!currentEvent) {
      throw new NotFoundException('Event not found');
    }

    // Initialize imageUrls array if it doesn't exist
    let imageUrls = currentEvent.imageUrls || [];
    
    if (files && files.length > 0) {
      this.logger.debug(`Uploading ${files.length} new images for event ${eventId}`);
      
      // Upload each file and collect URLs
      for (const file of files) {
        const path = `events/images/${eventId}/${Date.now()}-${file.originalname}`;
        const imageUrl = await this.firebaseStorageService.uploadFile(file, path);
        imageUrls.push(imageUrl);
      }
    } else {
      this.logger.debug('No new images provided for event update');
    }
    
    // Update the event with the new image URLs
    return this.eventsService.update(eventId, { imageUrls });
  }

  @Patch(':id/images/remove')
  public async removeImage(
    @Param('id') eventId: string,
    @Body('imageUrl') imageUrl: string
  ): Promise<Event> {
    this.logger.log(`PATCH /events/${eventId}/images/remove`);
    
    if (!imageUrl) {
      throw new NotFoundException('imageUrl is required');
    }
    
    // Get current event
    const currentEvent = await this.eventsService.getById(eventId);
    if (!currentEvent) {
      throw new NotFoundException('Event not found');
    }
    
    // Check if the image exists in the event
    if (!currentEvent.imageUrls || !currentEvent.imageUrls.includes(imageUrl)) {
      throw new NotFoundException('Image not found in event');
    }
    
    // Delete the image from Firebase Storage
    await this.firebaseStorageService.deleteFile(imageUrl);
    
    // Remove the URL from the event's imageUrls array
    const updatedImageUrls = currentEvent.imageUrls.filter(url => url !== imageUrl);
    
    // Update the event
    return this.eventsService.update(eventId, { imageUrls: updatedImageUrls });
  }
} 