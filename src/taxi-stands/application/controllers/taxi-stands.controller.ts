import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Logger,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TaxiStandsFeatureService, FeatureStatus } from '../services/taxi-stands-feature.service';
import { TaxiStandService } from '../services/taxi-stand.service';
import { CreateTaxiStandDto } from '../../dto/create-taxi-stand.dto';
import { UpdateTaxiStandDto } from '../../dto/update-taxi-stand.dto';
import { SetTaxiStandsFeatureStatusDto } from '../../dto/set-feature-status.dto';
import { TaxiStandResponseDto } from '../../dto/taxi-stand-response.dto';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { TaxiStandsEnabledGuard } from '../guards/taxi-stands-enabled.guard';
import { TaxiStand } from '../../domain/entities/taxi-stand.entity';

@ApiTags('taxi-stands')
@Controller('taxi-stands')
@UseGuards(RolesGuard)
export class TaxiStandsController {
  private readonly logger = new Logger(TaxiStandsController.name);

  constructor(
    private readonly taxiStandsFeatureService: TaxiStandsFeatureService,
    private readonly taxiStandService: TaxiStandService,
  ) {}

  // --- Feature Status ---

  @Get('feature-status')
  @ApiOperation({ summary: 'Gibt den Status des Taxistandorte Features zurück' })
  @ApiResponse({ status: 200, description: 'Der Feature-Status' })
  async getFeatureStatus(): Promise<FeatureStatus> {
    this.logger.log('GET /taxi-stands/feature-status');
    return this.taxiStandsFeatureService.getFeatureStatus();
  }

  @Put('feature-status')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Aktiviert oder deaktiviert das Taxistandorte Feature' })
  @ApiResponse({ status: 200, description: 'Feature-Status aktualisiert' })
  async setFeatureStatus(@Body() dto: SetTaxiStandsFeatureStatusDto): Promise<FeatureStatus> {
    this.logger.log(`PUT /taxi-stands/feature-status - active: ${dto.isFeatureActive}`);
    return this.taxiStandsFeatureService.setFeatureStatus(dto.isFeatureActive, dto.startDate);
  }

  // --- Taxi Stands CRUD ---

  @Get()
  @UseGuards(TaxiStandsEnabledGuard)
  @ApiOperation({ summary: 'Gibt alle Taxistandorte zurück' })
  @ApiResponse({ status: 200, description: 'Liste der Taxistandorte', type: [TaxiStandResponseDto] })
  async getAll(): Promise<TaxiStandResponseDto[]> {
    this.logger.log('GET /taxi-stands');
    const taxiStands = await this.taxiStandService.getAll();
    return taxiStands.map(taxiStand => this.toResponseDto(taxiStand));
  }

  @Get(':id')
  @UseGuards(TaxiStandsEnabledGuard)
  @ApiOperation({ summary: 'Gibt einen einzelnen Taxistandort zurück' })
  @ApiParam({ name: 'id', description: 'Die ID des Taxistandorts' })
  @ApiResponse({ status: 200, description: 'Der Taxistandort', type: TaxiStandResponseDto })
  @ApiResponse({ status: 404, description: 'Taxistandort nicht gefunden' })
  async getById(@Param('id') id: string): Promise<TaxiStandResponseDto> {
    this.logger.log(`GET /taxi-stands/${id}`);
    const taxiStand = await this.taxiStandService.getById(id);
    return this.toResponseDto(taxiStand);
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Erstellt einen neuen Taxistandort' })
  @ApiResponse({ status: 201, description: 'Der erstellte Taxistandort', type: TaxiStandResponseDto })
  async create(@Body() dto: CreateTaxiStandDto): Promise<TaxiStandResponseDto> {
    this.logger.log('POST /taxi-stands');
    const taxiStand = await this.taxiStandService.create(dto);
    return this.toResponseDto(taxiStand);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Aktualisiert einen Taxistandort' })
  @ApiParam({ name: 'id', description: 'Die ID des Taxistandorts' })
  @ApiResponse({ status: 200, description: 'Der aktualisierte Taxistandort', type: TaxiStandResponseDto })
  @ApiResponse({ status: 404, description: 'Taxistandort nicht gefunden' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaxiStandDto,
  ): Promise<TaxiStandResponseDto> {
    this.logger.log(`PATCH /taxi-stands/${id}`);
    const taxiStand = await this.taxiStandService.update(id, dto);
    return this.toResponseDto(taxiStand);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Löscht einen Taxistandort' })
  @ApiParam({ name: 'id', description: 'Die ID des Taxistandorts' })
  @ApiResponse({ status: 204, description: 'Taxistandort erfolgreich gelöscht' })
  @ApiResponse({ status: 404, description: 'Taxistandort nicht gefunden' })
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /taxi-stands/${id}`);
    await this.taxiStandService.delete(id);
  }

  // --- Phone Click Tracking ---

  @Post(':id/phone-click')
  @UseGuards(TaxiStandsEnabledGuard)
  @ApiOperation({ summary: 'Trackt einen Telefon-Klick auf einen Taxistandort' })
  @ApiParam({ name: 'id', description: 'Die ID des Taxistandorts' })
  @ApiResponse({ status: 200, description: 'Telefon-Klick erfolgreich getrackt', type: TaxiStandResponseDto })
  @ApiResponse({ status: 404, description: 'Taxistandort nicht gefunden' })
  async trackPhoneClick(@Param('id') id: string): Promise<TaxiStandResponseDto> {
    this.logger.log(`POST /taxi-stands/${id}/phone-click`);
    const taxiStand = await this.taxiStandsFeatureService.trackPhoneClick(id);
    return this.toResponseDto(taxiStand);
  }

  // --- Helper ---

  private toResponseDto(taxiStand: TaxiStand): TaxiStandResponseDto {
    return {
      id: taxiStand.id,
      title: taxiStand.title,
      description: taxiStand.description,
      numberOfTaxis: taxiStand.numberOfTaxis,
      phoneNumber: taxiStand.phoneNumber,
      location: taxiStand.location,
      phoneClickTimestamps: taxiStand.phoneClickTimestamps,
      createdAt: taxiStand.createdAt,
      updatedAt: taxiStand.updatedAt,
    };
  }
}
