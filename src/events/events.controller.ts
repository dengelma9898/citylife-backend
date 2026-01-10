import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  Logger,
  Patch,
  UseInterceptors,
  UploadedFile,
  Delete,
  UploadedFiles,
  Inject,
  forwardRef,
  Query,
  ParseEnumPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { Event } from './interfaces/event.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { UsersService } from '../users/users.service';
import { BusinessesService } from '../businesses/application/services/businesses.service';
import { ScraperService } from './infrastructure/scraping/scraper.service';
import {
  ScraperOptions,
  ScraperType,
  ScraperResult,
} from './infrastructure/scraping/base-scraper.interface';
import { HybridExtractorService } from './infrastructure/llm/hybrid-extractor.service';
import { CostTrackerService } from './infrastructure/llm/cost-tracker.service';
import { LlmScrapeDto } from './dto/llm-scrape.dto';

@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly firebaseStorageService: FirebaseStorageService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly businessesService: BusinessesService,
    private readonly scraperService: ScraperService,
    private readonly hybridExtractor: HybridExtractorService,
    private readonly costTracker: CostTrackerService,
  ) {
    this.logger.log('EventsController initialized');
  }

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
    @Body() updateEventDto: Partial<Event>,
  ): Promise<Event> {
    this.logger.log(`PATCH /events/${id}`);
    return this.eventsService.update(id, updateEventDto);
  }

  @Patch(':id/title-image')
  @UseInterceptors(FileInterceptor('file'))
  public async updateTitleImage(
    @Param('id') eventId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File,
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
      this.logger.debug(
        `Deleting ${currentEvent.imageUrls.length} additional images for event ${id}`,
      );

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
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[],
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
    @Body('imageUrl') imageUrl: string,
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

  /**
   * Erstellt ein neues Event für einen bestimmten Business-User
   *
   * @param userId - Die ID des Business-Users, für den das Event erstellt werden soll
   * @param createEventDto - Die Daten für das neue Event
   * @returns Das erstellte Event
   */
  @Post('users/:id')
  public async createEventForUser(
    @Param('id') userId: string,
    @Body() createEventDto: CreateEventDto,
  ): Promise<Event> {
    this.logger.log(`POST /events/users/${userId}`);

    // Überprüfen, ob der User existiert
    const businessUser = await this.usersService.getBusinessUser(userId);
    if (!businessUser) {
      throw new NotFoundException(`Geschäftsbenutzer mit ID ${userId} wurde nicht gefunden`);
    }

    // Event erstellen
    const createdEvent = await this.eventsService.create(createEventDto);

    // Event-ID zum User hinzufügen
    await this.usersService.addEventToUser(userId, createdEvent.id);

    return createdEvent;
  }

  /**
   * Gibt alle Events eines Business-Users zurück
   *
   * @param userId - Die ID des Business-Users
   * @returns Array von Events, die dem Business-User zugeordnet sind
   */
  @Get('users/:id')
  public async getEventsByUserId(@Param('id') userId: string): Promise<Event[]> {
    this.logger.log(`GET /events/users/${userId}`);

    // Überprüfen, ob der User existiert
    const businessUser = await this.usersService.getBusinessUser(userId);
    if (!businessUser) {
      throw new NotFoundException(`Geschäftsbenutzer mit ID ${userId} wurde nicht gefunden`);
    }

    // Wenn keine Events vorhanden sind, geben wir ein leeres Array zurück
    if (!businessUser.eventIds || businessUser.eventIds.length === 0) {
      return [];
    }

    // Events basierend auf den IDs im Benutzer-Dokument abrufen
    return this.eventsService.getByIds(businessUser.eventIds);
  }

  /**
   * Gibt Events basierend auf einer Liste von IDs zurück
   *
   * @param ids - Durch Komma getrennte Liste von Event-IDs
   * @returns Array von Events, die den angegebenen IDs entsprechen
   */
  @Get('by-ids')
  public async getByIds(@Query('ids') idsString: string): Promise<Event[]> {
    this.logger.log(`GET /events/by-ids?ids=${idsString}`);

    if (!idsString) {
      return [];
    }

    // Durch Komma getrennte IDs in ein Array umwandeln
    const ids = idsString
      .split(',')
      .map(id => id.trim())
      .filter(id => id);

    if (ids.length === 0) {
      return [];
    }

    return this.eventsService.getByIds(ids);
  }

  /**
   * Erstellt ein neues Event für ein bestimmtes Business
   *
   * @param businessId - Die ID des Businesses, für das das Event erstellt werden soll
   * @param createEventDto - Die Daten für das neue Event
   * @returns Das erstellte Event
   */
  @Post('businesses/:id')
  public async createEventForBusiness(
    @Param('id') businessId: string,
    @Body() createEventDto: CreateEventDto,
  ): Promise<Event> {
    this.logger.log(`POST /events/businesses/${businessId}`);

    // Überprüfen, ob das Business existiert
    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException(`Business mit ID ${businessId} wurde nicht gefunden`);
    }

    // Event erstellen
    const createdEvent = await this.eventsService.create(createEventDto);

    // Event-ID zum Business hinzufügen
    const eventIds = [...(business.eventIds || []), createdEvent.id];
    await this.businessesService.update(businessId, { eventIds });

    return createdEvent;
  }

  /**
   * Gibt alle Events eines Businesses zurück
   *
   * @param businessId - Die ID des Businesses
   * @returns Array von Events, die dem Business zugeordnet sind
   */
  @Get('businesses/:id')
  public async getEventsByBusinessId(@Param('id') businessId: string): Promise<Event[]> {
    this.logger.log(`GET /events/businesses/${businessId}`);

    // Überprüfen, ob das Business existiert
    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException(`Business mit ID ${businessId} wurde nicht gefunden`);
    }

    // Wenn keine Events vorhanden sind, geben wir ein leeres Array zurück
    if (!business.eventIds || business.eventIds.length === 0) {
      return [];
    }

    // Events basierend auf den IDs im Business-Dokument abrufen
    return this.eventsService.getByIds(business.eventIds);
  }

  /**
   * Gibt alle aktiven Scraper zurück
   */
  @Get('scrape/active')
  public async getActiveScrapers(): Promise<ScraperType[]> {
    this.logger.log('GET /events/scrape/active');
    return this.scraperService.getActiveScrapers();
  }

  /**
   * LLM-basierte Event-Extraktion von einer URL
   * Nutzt Mistral Small 3.2 für semantische Extraktion mit Fallback zu Puppeteer
   *
   * @param dto - DTO mit URL und Fallback-Option
   * @returns ScraperResult mit extrahierten Events
   */
  @Post('scrape/llm')
  @ApiOperation({
    summary: 'Extrahiert Events von einer URL mit LLM-basierter Extraktion',
    description:
      'Nutzt Mistral Small 3.2 für semantische Event-Extraktion. Bei Fehlern erfolgt automatisch Fallback zu Puppeteer-Scrapers.',
  })
  @ApiBody({ type: LlmScrapeDto })
  @ApiResponse({
    status: 200,
    description: 'Events erfolgreich extrahiert',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: { $ref: '#/components/schemas/Event' },
        },
        hasMorePages: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Ungültige URL' })
  @ApiResponse({ status: 500, description: 'Fehler bei der Extraktion' })
  public async scrapeEventsWithLlm(@Body() dto: LlmScrapeDto): Promise<ScraperResult> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'events.controller.ts:467',message:'scrapeEventsWithLlm entry',data:{url:dto.url,useFallback:dto.useFallback},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    this.logger.log(
      `POST /events/scrape/llm - URL: ${dto.url}, Fallback: ${dto.useFallback ?? true}`,
    );

    if (!dto.url) {
      throw new Error('URL ist erforderlich');
    }

    const result = await this.hybridExtractor.scrapeEventsFromUrl(dto.url, { useFallback: dto.useFallback ?? true } as any);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'events.controller.ts:477',message:'scrapeEventsWithLlm exit',data:{eventsCount:result.events.length,hasMorePages:result.hasMorePages},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    this.logger.log(`LLM-Scraping abgeschlossen: ${result.events.length} Events gefunden`);

    return result;
  }

  /**
   * Gibt monatliche Kosten-Statistiken für LLM-Extraktion zurück
   */
  @Get('scrape/llm/costs')
  @ApiOperation({
    summary: 'Gibt monatliche Kosten-Statistiken für LLM-Extraktion zurück',
  })
  @ApiResponse({
    status: 200,
    description: 'Kosten-Statistiken',
    schema: {
      type: 'object',
      additionalProperties: { type: 'number' },
      example: { 'mistral-small-latest': 0.15 },
    },
  })
  public async getLlmCosts(): Promise<Record<string, number>> {
    this.logger.log('GET /events/scrape/llm/costs');
    return this.costTracker.getMonthlyCosts();
  }

  /**
   * Gibt Token-Verbrauch für LLM-Extraktion zurück
   */
  @Get('scrape/llm/tokens')
  @ApiOperation({
    summary: 'Gibt Token-Verbrauch für LLM-Extraktion zurück',
  })
  @ApiResponse({
    status: 200,
    description: 'Token-Verbrauch',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          input: { type: 'number' },
          output: { type: 'number' },
        },
      },
      example: { 'mistral-small-latest': { input: 500000, output: 100000 } },
    },
  })
  public async getLlmTokenUsage(): Promise<Record<string, { input: number; output: number }>> {
    this.logger.log('GET /events/scrape/llm/tokens');
    return this.costTracker.getTokenUsage();
  }
}
