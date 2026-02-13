import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { EasterEggHuntService, FeatureStatus, EasterEggHuntStatistics } from '../services/easter-egg-hunt.service';
import { EasterEggService } from '../services/easter-egg.service';
import { CreateEasterEggDto } from '../../dto/create-easter-egg.dto';
import { UpdateEasterEggDto } from '../../dto/update-easter-egg.dto';
import { SetFeatureStatusDto } from '../../dto/set-feature-status.dto';
import { AddWinnerDto } from '../../dto/add-winner.dto';
import { EasterEggResponseDto } from '../../dto/easter-egg-response.dto';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { FileValidationPipe } from '../../../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';
import { EasterEggHuntEnabledGuard } from '../guards/easter-egg-hunt-enabled.guard';
import { EasterEgg } from '../../domain/entities/easter-egg.entity';

@ApiTags('easter-egg-hunt')
@Controller('easter-egg-hunt')
@UseGuards(RolesGuard)
export class EasterEggHuntController {
  private readonly logger = new Logger(EasterEggHuntController.name);

  constructor(
    private readonly easterEggHuntService: EasterEggHuntService,
    private readonly easterEggService: EasterEggService,
    private readonly firebaseStorageService: FirebaseStorageService,
  ) {}

  // --- Feature Status ---

  @Get('feature-status')
  @Roles('user', 'admin', 'super_admin', 'business')
  @ApiOperation({ summary: 'Gibt den Status des Easter Egg Hunt Features zurück' })
  @ApiResponse({ status: 200, description: 'Der Feature-Status' })
  async getFeatureStatus(): Promise<FeatureStatus> {
    this.logger.log('GET /easter-egg-hunt/feature-status');
    return this.easterEggHuntService.getFeatureStatus();
  }

  @Put('feature-status')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Aktiviert oder deaktiviert das Easter Egg Hunt Feature' })
  @ApiResponse({ status: 200, description: 'Feature-Status aktualisiert' })
  async setFeatureStatus(@Body() dto: SetFeatureStatusDto): Promise<FeatureStatus> {
    this.logger.log(`PUT /easter-egg-hunt/feature-status - active: ${dto.isFeatureActive}`);
    return this.easterEggHuntService.setFeatureStatus(dto.isFeatureActive, dto.startDate);
  }

  // --- Statistics (Admin) ---

  @Get('statistics')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Gibt Statistiken zur Ostereiersuche zurück' })
  @ApiResponse({ status: 200, description: 'Statistiken' })
  async getStatistics(): Promise<EasterEggHuntStatistics> {
    this.logger.log('GET /easter-egg-hunt/statistics');
    return this.easterEggHuntService.getStatistics();
  }

  // --- Easter Eggs CRUD ---

  @Get('eggs')
  @Roles('user', 'admin', 'super_admin', 'business')
  @UseGuards(EasterEggHuntEnabledGuard)
  @ApiOperation({ summary: 'Gibt alle Ostereier zurück' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Nur aktive Eier' })
  @ApiResponse({ status: 200, description: 'Liste der Ostereier', type: [EasterEggResponseDto] })
  async getAll(
    @Query('activeOnly') activeOnly?: string,
    @CurrentUser() userId?: string,
  ): Promise<EasterEggResponseDto[]> {
    this.logger.log(`GET /easter-egg-hunt/eggs?activeOnly=${activeOnly}`);
    const shouldFilterActive = activeOnly === undefined || activeOnly === 'true';
    const eggs = shouldFilterActive
      ? await this.easterEggService.getActive()
      : await this.easterEggService.getAll();
    return eggs.map(egg => this.toResponseDto(egg, userId));
  }

  @Get('eggs/:id')
  @Roles('user', 'admin', 'super_admin', 'business')
  @UseGuards(EasterEggHuntEnabledGuard)
  @ApiOperation({ summary: 'Gibt ein einzelnes Osterei zurück' })
  @ApiParam({ name: 'id', description: 'Die ID des Ostereis' })
  @ApiResponse({ status: 200, description: 'Das Osterei', type: EasterEggResponseDto })
  @ApiResponse({ status: 404, description: 'Osterei nicht gefunden' })
  async getById(
    @Param('id') id: string,
    @CurrentUser() userId?: string,
  ): Promise<EasterEggResponseDto> {
    this.logger.log(`GET /easter-egg-hunt/eggs/${id}`);
    const egg = await this.easterEggService.getById(id);
    return this.toResponseDto(egg, userId);
  }

  @Post('eggs')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Erstellt ein neues Osterei' })
  @ApiResponse({ status: 201, description: 'Das erstellte Osterei', type: EasterEggResponseDto })
  async create(@Body() dto: CreateEasterEggDto): Promise<EasterEggResponseDto> {
    this.logger.log('POST /easter-egg-hunt/eggs');
    const egg = await this.easterEggService.create(dto);
    return this.toResponseDto(egg);
  }

  @Patch('eggs/:id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Aktualisiert ein Osterei' })
  @ApiParam({ name: 'id', description: 'Die ID des Ostereis' })
  @ApiResponse({ status: 200, description: 'Das aktualisierte Osterei', type: EasterEggResponseDto })
  @ApiResponse({ status: 404, description: 'Osterei nicht gefunden' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEasterEggDto,
  ): Promise<EasterEggResponseDto> {
    this.logger.log(`PATCH /easter-egg-hunt/eggs/${id}`);
    const egg = await this.easterEggService.update(id, dto);
    return this.toResponseDto(egg);
  }

  @Delete('eggs/:id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Löscht ein Osterei' })
  @ApiParam({ name: 'id', description: 'Die ID des Ostereis' })
  @ApiResponse({ status: 204, description: 'Osterei erfolgreich gelöscht' })
  @ApiResponse({ status: 404, description: 'Osterei nicht gefunden' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /easter-egg-hunt/eggs/${id}`);
    await this.easterEggService.delete(id);
  }

  // --- Image Upload ---

  @Post('eggs/:id/image')
  @Roles('admin', 'super_admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Lädt ein Bild für ein Osterei hoch' })
  @ApiParam({ name: 'id', description: 'Die ID des Ostereis' })
  @ApiResponse({ status: 200, description: 'Bild erfolgreich hochgeladen', type: EasterEggResponseDto })
  @ApiResponse({ status: 404, description: 'Osterei nicht gefunden' })
  async uploadImage(
    @Param('id') eggId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File,
  ): Promise<EasterEggResponseDto> {
    this.logger.log(`POST /easter-egg-hunt/eggs/${eggId}/image`);
    const egg = await this.easterEggService.getById(eggId);
    if (egg.imageUrl) {
      try {
        await this.firebaseStorageService.deleteFile(egg.imageUrl);
      } catch (error) {
        this.logger.error(`Failed to delete old image: ${error.message}`);
      }
    }
    const path = `easter-eggs/${eggId}/image/${Date.now()}-${file.originalname}`;
    const imageUrl = await this.firebaseStorageService.uploadFile(file, path);
    const updatedEgg = await this.easterEggService.updateImageUrl(eggId, imageUrl);
    return this.toResponseDto(updatedEgg);
  }

  // --- Participation ---

  @Patch('eggs/:id/participate')
  @Roles('user', 'admin')
  @UseGuards(EasterEggHuntEnabledGuard)
  @ApiOperation({ summary: 'Teilnahme an einem Osterei' })
  @ApiParam({ name: 'id', description: 'Die ID des Ostereis' })
  @ApiResponse({ status: 200, description: 'Teilnahme erfolgreich', type: EasterEggResponseDto })
  @ApiResponse({ status: 400, description: 'Teilnahme nicht möglich' })
  @ApiResponse({ status: 403, description: 'Nur registrierte User dürfen teilnehmen' })
  @ApiResponse({ status: 404, description: 'Osterei nicht gefunden' })
  async participate(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<EasterEggResponseDto> {
    this.logger.log(`PATCH /easter-egg-hunt/eggs/${id}/participate - User: ${userId}`);
    const egg = await this.easterEggHuntService.participate(id, userId);
    return this.toResponseDto(egg, userId);
  }

  // --- Winners (Admin) ---

  @Post('eggs/:id/draw-winners')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Gewinner für ein Osterei auslosen' })
  @ApiParam({ name: 'id', description: 'Die ID des Ostereis' })
  @ApiResponse({ status: 200, description: 'Gewinner ausgelost', type: EasterEggResponseDto })
  @ApiResponse({ status: 400, description: 'Auslosung nicht möglich' })
  @ApiResponse({ status: 404, description: 'Osterei nicht gefunden' })
  async drawWinners(@Param('id') id: string): Promise<EasterEggResponseDto> {
    this.logger.log(`POST /easter-egg-hunt/eggs/${id}/draw-winners`);
    const egg = await this.easterEggHuntService.drawWinners(id);
    return this.toResponseDto(egg);
  }

  @Patch('eggs/:id/winners')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Fügt einen Gewinner zu einem Osterei hinzu' })
  @ApiParam({ name: 'id', description: 'Die ID des Ostereis' })
  @ApiResponse({ status: 200, description: 'Gewinner hinzugefügt', type: EasterEggResponseDto })
  @ApiResponse({ status: 400, description: 'Ungültige Eingabedaten' })
  @ApiResponse({ status: 404, description: 'Osterei nicht gefunden' })
  async addWinner(
    @Param('id') id: string,
    @Body() dto: AddWinnerDto,
  ): Promise<EasterEggResponseDto> {
    this.logger.log(`PATCH /easter-egg-hunt/eggs/${id}/winners - Winner: ${dto.userId}`);
    const egg = await this.easterEggHuntService.addWinner(id, dto.userId);
    return this.toResponseDto(egg);
  }

  @Get('eggs/:id/participants')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Gibt die Teilnehmerliste eines Ostereis zurück' })
  @ApiParam({ name: 'id', description: 'Die ID des Ostereis' })
  @ApiResponse({ status: 200, description: 'Liste der Teilnehmer-IDs' })
  @ApiResponse({ status: 404, description: 'Osterei nicht gefunden' })
  async getParticipants(@Param('id') id: string): Promise<string[]> {
    this.logger.log(`GET /easter-egg-hunt/eggs/${id}/participants`);
    return this.easterEggHuntService.getParticipants(id);
  }

  // --- Helper ---

  private toResponseDto(egg: EasterEgg, userId?: string): EasterEggResponseDto {
    return {
      id: egg.id,
      title: egg.title,
      description: egg.description,
      imageUrl: egg.imageUrl,
      prizeDescription: egg.prizeDescription,
      numberOfWinners: egg.numberOfWinners,
      startDate: egg.startDate,
      endDate: egg.endDate,
      location: egg.location,
      participantCount: egg.participants.length,
      winnerCount: egg.winners.length,
      hasParticipated: userId ? egg.participants.includes(userId) : false,
      createdAt: egg.createdAt,
      updatedAt: egg.updatedAt,
    };
  }
}
