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
  Req,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { EventsService } from './events.service';
import { Event } from './interfaces/event.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { UsersService } from '../users/users.service';
import { BusinessesService } from '../businesses/application/services/businesses.service';
import { CsvImportService } from './application/services/csv-import.service';
import { CsvImportResult } from './dto/csv-import-result.dto';
import { CsvFileValidationPipe } from '../core/pipes/csv-file-validation.pipe';
import { UserType } from '../users/enums/user-type.enum';
import { EventStatus } from './enums/event-status.enum';
import { RolesGuard } from '../core/guards/roles.guard';
import { Roles } from '../core/decorators/roles.decorator';

function isFirebaseAnonymousUser(
  user?: { firebase?: { sign_in_provider?: string } },
): boolean {
  return user?.firebase?.sign_in_provider === 'anonymous';
}

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly firebaseStorageService: FirebaseStorageService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly businessesService: BusinessesService,
    private readonly csvImportService: CsvImportService,
  ) {
    this.logger.log('EventsController initialized');
  }

  private assertNotAnonymous(req: Request): void {
    if (isFirebaseAnonymousUser(req.user)) {
      throw new ForbiddenException('Anonymous users cannot create or modify events');
    }
  }

  private async isActorAdmin(actorUid: string): Promise<boolean> {
    const profile = await this.usersService.getUserProfile(actorUid);
    return (
      profile?.userType === UserType.ADMIN || profile?.userType === UserType.SUPER_ADMIN
    );
  }

  /**
   * Admin-created events are ACTIVE immediately; all other registered users get PENDING.
   */
  private async resolveInitialEventStatus(actorUid: string): Promise<EventStatus> {
    if (await this.isActorAdmin(actorUid)) {
      return EventStatus.ACTIVE;
    }
    return EventStatus.PENDING;
  }

  private async userOwnsEvent(actorUid: string, eventId: string): Promise<boolean> {
    const profile = await this.usersService.getUserProfile(actorUid);
    if (profile?.createdEventIds?.includes(eventId)) {
      return true;
    }
    const businessUser = await this.usersService.getBusinessUser(actorUid);
    if (businessUser?.eventIds?.includes(eventId)) {
      return true;
    }
    if (businessUser?.businessIds?.length) {
      for (const bid of businessUser.businessIds) {
        const business = await this.businessesService.getById(bid);
        if (business?.eventIds?.includes(eventId)) {
          return true;
        }
      }
    }
    return false;
  }

  private async assertCanModifyIfPending(actorUid: string, event: Event): Promise<void> {
    if (event.status !== EventStatus.PENDING) {
      return;
    }
    if (await this.isActorAdmin(actorUid)) {
      return;
    }
    if (await this.userOwnsEvent(actorUid, event.id)) {
      return;
    }
    throw new ForbiddenException('Not allowed to modify this event');
  }

  private async canManageBusinessEvents(actorUid: string, businessId: string): Promise<boolean> {
    if (await this.isActorAdmin(actorUid)) {
      return true;
    }
    const businessUser = await this.usersService.getBusinessUser(actorUid);
    return businessUser?.businessIds?.includes(businessId) ?? false;
  }

  @Get()
  public async getAll(): Promise<Event[]> {
    this.logger.log('GET /events');
    return this.eventsService.getAll();
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  public async getPendingEvents(): Promise<Event[]> {
    this.logger.log('GET /events/pending');
    return this.eventsService.getPendingEvents();
  }

  @Get('by-ids')
  public async getByIdsQuery(@Query('ids') idsString: string): Promise<Event[]> {
    this.logger.log(`GET /events/by-ids?ids=${idsString}`);
    if (!idsString) {
      return [];
    }
    const ids = idsString
      .split(',')
      .map(id => id.trim())
      .filter(id => id);
    if (ids.length === 0) {
      return [];
    }
    return this.eventsService.getByIds(ids, { includeAllStatuses: false });
  }

  @Get('users/:id')
  public async getEventsByUserId(
    @Param('id') userId: string,
    @Req() req: Request,
  ): Promise<Event[]> {
    this.logger.log(`GET /events/users/${userId}`);
    const actorUid = req.user?.uid;
    if (!actorUid) {
      throw new ForbiddenException();
    }
    if (userId !== actorUid && !(await this.isActorAdmin(actorUid))) {
      throw new ForbiddenException();
    }
    const businessUser = await this.usersService.getBusinessUser(userId);
    const profile = await this.usersService.getUserProfile(userId);
    if (!businessUser && !profile) {
      throw new NotFoundException(`Benutzer mit ID ${userId} wurde nicht gefunden`);
    }
    const fromBusiness = businessUser?.eventIds || [];
    const fromProfile = profile?.createdEventIds || [];
    const uniqueIds = [...new Set([...fromBusiness, ...fromProfile])];
    if (uniqueIds.length === 0) {
      return [];
    }
    return this.eventsService.getByIds(uniqueIds, { includeAllStatuses: true });
  }

  @Get('businesses/:id')
  public async getEventsByBusinessId(
    @Param('id') businessId: string,
    @Req() req: Request,
  ): Promise<Event[]> {
    this.logger.log(`GET /events/businesses/${businessId}`);
    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException(`Business mit ID ${businessId} wurde nicht gefunden`);
    }
    if (!business.eventIds || business.eventIds.length === 0) {
      return [];
    }
    const uid = req.user?.uid;
    const includeAll = uid ? await this.canManageBusinessEvents(uid, businessId) : false;
    return this.eventsService.getByIds(business.eventIds, {
      includeAllStatuses: includeAll,
    });
  }

  @Get(':id')
  public async getById(@Param('id') id: string, @Req() req: Request): Promise<Event> {
    this.logger.log(`GET /events/${id}`);
    const uid = req.user?.uid;
    const allowPending = uid ? await this.isActorAdmin(uid) : false;
    const event = await this.eventsService.getById(id, { includePendingInResult: allowPending });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  @Post()
  public async create(
    @Req() req: Request,
    @Body() createEventDto: CreateEventDto,
  ): Promise<Event> {
    this.logger.log('POST /events');
    this.assertNotAnonymous(req);
    const actorUid = req.user!.uid;
    const initialStatus = await this.resolveInitialEventStatus(actorUid);
    return this.eventsService.create(createEventDto, initialStatus);
  }

  @Post('users/:id')
  public async createEventForUser(
    @Param('id') userId: string,
    @Req() req: Request,
    @Body() createEventDto: CreateEventDto,
  ): Promise<Event> {
    this.logger.log(`POST /events/users/${userId}`);
    this.assertNotAnonymous(req);
    const actorUid = req.user!.uid;
    if (userId !== actorUid && !(await this.isActorAdmin(actorUid))) {
      throw new ForbiddenException();
    }
    const businessUser = await this.usersService.getBusinessUser(userId);
    const profile = await this.usersService.getUserProfile(userId);
    if (!businessUser && !profile) {
      throw new NotFoundException(`Benutzer mit ID ${userId} wurde nicht gefunden`);
    }
    const initialStatus = await this.resolveInitialEventStatus(actorUid);
    const createdEvent = await this.eventsService.create(createEventDto, initialStatus);
    if (businessUser) {
      await this.usersService.addEventToUser(userId, createdEvent.id);
    } else if (profile) {
      await this.usersService.addCreatedEventToUserProfile(userId, createdEvent.id);
    }
    return createdEvent;
  }

  @Post('businesses/:id')
  public async createEventForBusiness(
    @Param('id') businessId: string,
    @Req() req: Request,
    @Body() createEventDto: CreateEventDto,
  ): Promise<Event> {
    this.logger.log(`POST /events/businesses/${businessId}`);
    this.assertNotAnonymous(req);
    const actorUid = req.user!.uid;
    const business = await this.businessesService.getById(businessId);
    if (!business) {
      throw new NotFoundException(`Business mit ID ${businessId} wurde nicht gefunden`);
    }
    if (!(await this.canManageBusinessEvents(actorUid, businessId))) {
      throw new ForbiddenException();
    }
    const initialStatus = await this.resolveInitialEventStatus(actorUid);
    const createdEvent = await this.eventsService.create(createEventDto, initialStatus);
    const eventIds = [...(business.eventIds || []), createdEvent.id];
    await this.businessesService.update(businessId, { eventIds });
    return createdEvent;
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  public async approveEvent(@Param('id') id: string): Promise<Event> {
    this.logger.log(`PATCH /events/${id}/approve`);
    return this.eventsService.approveEvent(id);
  }

  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() updateEventDto: Partial<Event>,
  ): Promise<Event> {
    this.logger.log(`PATCH /events/${id}`);
    this.assertNotAnonymous(req);
    const actorUid = req.user!.uid;
    const current = await this.eventsService.getById(id, { includePendingInResult: true });
    if (!current) {
      throw new NotFoundException('Event not found');
    }
    await this.assertCanModifyIfPending(actorUid, current);
    return this.eventsService.update(id, updateEventDto);
  }

  @Patch(':id/title-image')
  @UseInterceptors(FileInterceptor('file'))
  public async updateTitleImage(
    @Param('id') eventId: string,
    @Req() req: Request,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File,
  ): Promise<Event> {
    this.logger.log(`PATCH /events/${eventId}/title-image`);
    this.assertNotAnonymous(req);
    const actorUid = req.user!.uid;
    const currentEvent = await this.eventsService.getById(eventId, { includePendingInResult: true });
    if (!currentEvent) {
      throw new NotFoundException('Event not found');
    }
    await this.assertCanModifyIfPending(actorUid, currentEvent);
    if (currentEvent.titleImageUrl) {
      this.logger.debug('Deleting old title image');
      await this.firebaseStorageService.deleteFile(currentEvent.titleImageUrl);
    }
    const path = `events/title-images/${eventId}/${Date.now()}-${file.originalname}`;
    const imageUrl = await this.firebaseStorageService.uploadFile(file, path);
    return this.eventsService.update(eventId, { titleImageUrl: imageUrl });
  }

  @Delete(':id')
  public async delete(@Param('id') id: string, @Req() req: Request): Promise<void> {
    this.logger.log(`DELETE /events/${id}`);
    this.assertNotAnonymous(req);
    const actorUid = req.user!.uid;
    const currentEvent = await this.eventsService.getById(id, { includePendingInResult: true });
    if (!currentEvent) {
      throw new NotFoundException('Event not found');
    }
    await this.assertCanModifyIfPending(actorUid, currentEvent);
    const deletePromises: Promise<void>[] = [];
    if (currentEvent.titleImageUrl) {
      this.logger.debug(`Deleting title image: ${currentEvent.titleImageUrl}`);
      deletePromises.push(this.firebaseStorageService.deleteFile(currentEvent.titleImageUrl));
    }
    if (currentEvent.imageUrls && currentEvent.imageUrls.length > 0) {
      this.logger.debug(
        `Deleting ${currentEvent.imageUrls.length} additional images for event ${id}`,
      );
      currentEvent.imageUrls.forEach(imageUrl => {
        this.logger.debug(`Deleting image: ${imageUrl}`);
        deletePromises.push(this.firebaseStorageService.deleteFile(imageUrl));
      });
    }
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
    return this.eventsService.delete(id);
  }

  @Patch(':id/images')
  @UseInterceptors(FilesInterceptor('images'))
  public async addImages(
    @Param('id') eventId: string,
    @Req() req: Request,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[],
  ): Promise<Event> {
    this.logger.log(`PATCH /events/${eventId}/images`);
    this.assertNotAnonymous(req);
    const actorUid = req.user!.uid;
    const currentEvent = await this.eventsService.getById(eventId, { includePendingInResult: true });
    if (!currentEvent) {
      throw new NotFoundException('Event not found');
    }
    await this.assertCanModifyIfPending(actorUid, currentEvent);
    let imageUrls = currentEvent.imageUrls || [];
    if (files && files.length > 0) {
      this.logger.debug(`Uploading ${files.length} new images for event ${eventId}`);
      for (const file of files) {
        const path = `events/images/${eventId}/${Date.now()}-${file.originalname}`;
        const imageUrl = await this.firebaseStorageService.uploadFile(file, path);
        imageUrls.push(imageUrl);
      }
    } else {
      this.logger.debug('No new images provided for event update');
    }
    return this.eventsService.update(eventId, { imageUrls });
  }

  @Patch(':id/images/remove')
  public async removeImage(
    @Param('id') eventId: string,
    @Req() req: Request,
    @Body('imageUrl') imageUrl: string,
  ): Promise<Event> {
    this.logger.log(`PATCH /events/${eventId}/images/remove`);
    if (!imageUrl) {
      throw new NotFoundException('imageUrl is required');
    }
    this.assertNotAnonymous(req);
    const actorUid = req.user!.uid;
    const currentEvent = await this.eventsService.getById(eventId, { includePendingInResult: true });
    if (!currentEvent) {
      throw new NotFoundException('Event not found');
    }
    await this.assertCanModifyIfPending(actorUid, currentEvent);
    if (!currentEvent.imageUrls || !currentEvent.imageUrls.includes(imageUrl)) {
      throw new NotFoundException('Image not found in event');
    }
    await this.firebaseStorageService.deleteFile(imageUrl);
    const updatedImageUrls = currentEvent.imageUrls.filter(url => url !== imageUrl);
    return this.eventsService.update(eventId, { imageUrls: updatedImageUrls });
  }

  /**
   * Importiert Events aus einer CSV-Datei
   */
  @Post('import/csv')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Importiert Events aus einer CSV-Datei',
    description:
      'Parst eine CSV-Datei, löst Locations via HERE API auf, mappt Kategorien und erstellt Events. Duplikate werden erkannt und übersprungen. Fehler brechen den Import nicht ab.',
  })
  @ApiResponse({
    status: 200,
    description: 'Import abgeschlossen (auch bei teilweisen Fehlern)',
  })
  @ApiResponse({ status: 400, description: 'Ungültige CSV-Datei' })
  public async importFromCsv(
    @Req() req: Request,
    @UploadedFile(new CsvFileValidationPipe()) file: Express.Multer.File,
  ): Promise<CsvImportResult> {
    this.logger.log('POST /events/import/csv');
    this.assertNotAnonymous(req);
    return this.csvImportService.importFromCsv(file);
  }
}
