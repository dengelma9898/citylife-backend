import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Roles } from '../core/decorators/roles.decorator';
import { RolesGuard } from '../core/guards/roles.guard';
import { LegalDocumentService } from './application/services/legal-document.service';
import { CreateLegalDocumentDto } from './application/dto/create-legal-document.dto';
import { LegalDocumentResponseDto } from './application/dto/legal-document-response.dto';
import { LegalDocument, LegalDocumentType } from './domain/entities/legal-document.entity';
import { CurrentUser } from '../core/decorators/current-user.decorator';

@ApiTags('legal-documents')
@Controller('legal-documents')
@UseGuards(RolesGuard)
export class LegalDocumentsController {
  private readonly logger = new Logger(LegalDocumentsController.name);

  constructor(private readonly legalDocumentService: LegalDocumentService) {}

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Erstellt ein neues Rechtsdokument (nur für SUPER_ADMIN)' })
  @ApiResponse({
    status: 201,
    description: 'Rechtsdokument wurde erfolgreich erstellt',
    type: LegalDocumentResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Nicht autorisiert - Nur SUPER_ADMINs können diese Resource aufrufen',
  })
  public async create(
    @Body() createDto: CreateLegalDocumentDto,
    @CurrentUser() userId: string,
  ): Promise<LegalDocument> {
    this.logger.log(`POST /legal-documents - Creating ${createDto.type}`);
    return this.legalDocumentService.create(createDto.type, createDto.content, userId);
  }

  @Get('type/:type/latest')
  @ApiOperation({ summary: 'Gibt das neueste Rechtsdokument eines bestimmten Typs zurück' })
  @ApiResponse({
    status: 200,
    description: 'Neuestes Rechtsdokument des Typs',
    type: LegalDocumentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Kein Rechtsdokument für diesen Typ gefunden',
  })
  @ApiParam({
    name: 'type',
    description: 'Typ des Rechtsdokuments',
    enum: LegalDocumentType,
  })
  public async getLatestByType(@Param('type') type: LegalDocumentType): Promise<LegalDocument> {
    this.logger.log(`GET /legal-documents/type/${type}/latest`);
    return this.legalDocumentService.getLatestByType(type);
  }

  @Get('type/:type')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Gibt alle Rechtsdokumente eines bestimmten Typs zurück (nur für SUPER_ADMIN)' })
  @ApiResponse({
    status: 200,
    description: 'Liste aller Rechtsdokumente des Typs',
    type: [LegalDocumentResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Nicht autorisiert - Nur SUPER_ADMINs können diese Resource aufrufen',
  })
  @ApiParam({
    name: 'type',
    description: 'Typ des Rechtsdokuments',
    enum: LegalDocumentType,
  })
  public async getAllByType(@Param('type') type: LegalDocumentType): Promise<LegalDocument[]> {
    this.logger.log(`GET /legal-documents/type/${type}`);
    return this.legalDocumentService.getAllByType(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Gibt ein Rechtsdokument anhand der ID zurück' })
  @ApiResponse({
    status: 200,
    description: 'Rechtsdokument',
    type: LegalDocumentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Rechtsdokument nicht gefunden',
  })
  @ApiParam({
    name: 'id',
    description: 'ID des Rechtsdokuments',
  })
  public async getById(@Param('id') id: string): Promise<LegalDocument> {
    this.logger.log(`GET /legal-documents/${id}`);
    return this.legalDocumentService.getById(id);
  }
}

