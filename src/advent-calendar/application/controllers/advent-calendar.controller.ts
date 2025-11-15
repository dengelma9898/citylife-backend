import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Logger,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdventCalendarService } from '../services/advent-calendar.service';
import { CreateAdventCalendarEntryDto } from '../../dto/create-advent-calendar-entry.dto';
import { UpdateAdventCalendarEntryDto } from '../../dto/update-advent-calendar-entry.dto';
import { AdventCalendarEntryResponseDto } from '../../dto/advent-calendar-entry-response.dto';
import { AddWinnerDto } from '../../dto/add-winner.dto';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { FileValidationPipe } from '../../../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';

@ApiTags('advent-calendar')
@Controller('advent-calendar')
@UseGuards(RolesGuard)
export class AdventCalendarController {
  private readonly logger = new Logger(AdventCalendarController.name);

  constructor(
    private readonly adventCalendarService: AdventCalendarService,
    private readonly firebaseStorageService: FirebaseStorageService,
  ) {}

  @Get()
  @Roles('user', 'admin', 'super_admin', 'business_user')
  @ApiOperation({ summary: 'Gibt alle Adventskalender-Einträge zurück' })
  @ApiResponse({
    status: 200,
    description: 'Liste aller Adventskalender-Einträge',
    type: [AdventCalendarEntryResponseDto],
  })
  public async getAll(): Promise<AdventCalendarEntryResponseDto[]> {
    this.logger.log('GET /advent-calendar');
    const entries = await this.adventCalendarService.getAll();
    return entries.map(entry => entry.toJSON());
  }

  @Get(':id')
  @Roles('user', 'admin', 'super_admin', 'business_user')
  @ApiOperation({ summary: 'Gibt einen spezifischen Adventskalender-Eintrag zurück' })
  @ApiParam({ name: 'id', description: 'Die ID des Eintrags' })
  @ApiResponse({
    status: 200,
    description: 'Der Adventskalender-Eintrag',
    type: AdventCalendarEntryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Eintrag nicht gefunden' })
  public async getById(@Param('id') id: string): Promise<AdventCalendarEntryResponseDto> {
    this.logger.log(`GET /advent-calendar/${id}`);
    const entry = await this.adventCalendarService.getById(id);
    return entry.toJSON();
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Erstellt einen neuen Adventskalender-Eintrag' })
  @ApiResponse({
    status: 201,
    description: 'Der erstellte Adventskalender-Eintrag',
    type: AdventCalendarEntryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Ungültige Eingabedaten' })
  public async create(
    @Body() createDto: CreateAdventCalendarEntryDto,
  ): Promise<AdventCalendarEntryResponseDto> {
    this.logger.log('POST /advent-calendar');
    const entry = await this.adventCalendarService.create(createDto);
    return entry.toJSON();
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Aktualisiert einen Adventskalender-Eintrag' })
  @ApiParam({ name: 'id', description: 'Die ID des Eintrags' })
  @ApiResponse({
    status: 200,
    description: 'Der aktualisierte Adventskalender-Eintrag',
    type: AdventCalendarEntryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Eintrag nicht gefunden' })
  public async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAdventCalendarEntryDto,
  ): Promise<AdventCalendarEntryResponseDto> {
    this.logger.log(`PATCH /advent-calendar/${id}`);
    const entry = await this.adventCalendarService.update(id, updateDto);
    return entry.toJSON();
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Löscht einen Adventskalender-Eintrag' })
  @ApiParam({ name: 'id', description: 'Die ID des Eintrags' })
  @ApiResponse({ status: 204, description: 'Eintrag erfolgreich gelöscht' })
  @ApiResponse({ status: 404, description: 'Eintrag nicht gefunden' })
  public async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /advent-calendar/${id}`);
    await this.adventCalendarService.delete(id);
  }

  @Patch(':id/participate')
  @Roles('user', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Teilnahme an einem Adventskalender-Eintrag' })
  @ApiParam({ name: 'id', description: 'Die ID des Eintrags' })
  @ApiResponse({
    status: 200,
    description: 'Teilnahme erfolgreich',
    type: AdventCalendarEntryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Teilnahme nicht möglich oder bereits teilgenommen' })
  @ApiResponse({ status: 404, description: 'Eintrag nicht gefunden' })
  public async participate(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<AdventCalendarEntryResponseDto> {
    this.logger.log(`PATCH /advent-calendar/${id}/participate - User: ${userId}`);
    const entry = await this.adventCalendarService.participate(id, userId);
    return entry.toJSON();
  }

  @Patch(':id/winners')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Fügt einen Gewinner zu einem Adventskalender-Eintrag hinzu' })
  @ApiParam({ name: 'id', description: 'Die ID des Eintrags' })
  @ApiResponse({
    status: 200,
    description: 'Gewinner erfolgreich hinzugefügt',
    type: AdventCalendarEntryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Ungültige Eingabedaten' })
  @ApiResponse({ status: 404, description: 'Eintrag nicht gefunden' })
  public async addWinner(
    @Param('id') id: string,
    @Body() addWinnerDto: AddWinnerDto,
  ): Promise<AdventCalendarEntryResponseDto> {
    this.logger.log(`PATCH /advent-calendar/${id}/winners - Winner: ${addWinnerDto.userId}`);
    const entry = await this.adventCalendarService.addWinner(id, addWinnerDto.userId);
    return entry.toJSON();
  }

  @Post(':id/image')
  @Roles('admin', 'super_admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Lädt ein Bild für einen Adventskalender-Eintrag hoch' })
  @ApiParam({ name: 'id', description: 'Die ID des Eintrags' })
  @ApiResponse({
    status: 200,
    description: 'Bild erfolgreich hochgeladen',
    type: AdventCalendarEntryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Eintrag nicht gefunden' })
  public async uploadImage(
    @Param('id') entryId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File,
  ): Promise<AdventCalendarEntryResponseDto> {
    this.logger.log(`POST /advent-calendar/${entryId}/image`);

    const entry = await this.adventCalendarService.getById(entryId);
    if (!entry) {
      throw new NotFoundException('Advent calendar entry not found');
    }

    if (entry.imageUrl) {
      try {
        await this.firebaseStorageService.deleteFile(entry.imageUrl);
      } catch (error) {
        this.logger.error(`Failed to delete old image: ${error.message}`);
      }
    }

    const path = `advent-calendar/${entryId}/image/${Date.now()}-${file.originalname}`;
    const imageUrl = await this.firebaseStorageService.uploadFile(file, path);

    const updatedEntry = await this.adventCalendarService.update(entryId, { imageUrl });
    return updatedEntry.toJSON();
  }
}

