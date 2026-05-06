import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CuratedSpotsService } from '../services/curated-spots.service';
import { CuratedSpot } from '../../domain/entities/curated-spot.entity';
import { CreateCuratedSpotDto } from '../../dto/create-curated-spot.dto';
import { UpdateCuratedSpotDto } from '../../dto/update-curated-spot.dto';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';
import { FileValidationPipe } from '../../../core/pipes/file-validation.pipe';
import { VideoFileValidationPipe } from '../../../core/pipes/video-file-validation.pipe';

@ApiTags('curated-spots')
@ApiBearerAuth()
@Controller('curated-spots')
@UseGuards(RolesGuard)
export class CuratedSpotsController {
  private readonly logger = new Logger(CuratedSpotsController.name);

  constructor(
    private readonly curatedSpotsService: CuratedSpotsService,
    private readonly firebaseStorageService: FirebaseStorageService,
  ) {}

  @Get('admin')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'List all non-deleted curated spots (admin)' })
  public async listAdmin(): Promise<CuratedSpot[]> {
    this.logger.log('GET /curated-spots/admin');
    return this.curatedSpotsService.listAllForAdmin();
  }

  @Get('admin/:id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get curated spot by id including non-active (admin)' })
  public async getByIdAdmin(@Param('id') id: string): Promise<CuratedSpot> {
    this.logger.log(`GET /curated-spots/admin/${id}`);
    return this.curatedSpotsService.getByIdForAdmin(id);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search active curated spots by optional name prefix and keyword IDs (AND)',
  })
  public async search(
    @Query('namePrefix') namePrefix?: string,
    @Query('keywordIds') keywordIds?: string | string[],
  ): Promise<CuratedSpot[]> {
    this.logger.log('GET /curated-spots/search');
    const ids = CuratedSpotsService.parseKeywordIdsFromQuery(keywordIds);
    return this.curatedSpotsService.searchActive(namePrefix, ids);
  }

  @Get()
  @ApiOperation({ summary: 'List all active curated spots' })
  public async listActive(): Promise<CuratedSpot[]> {
    this.logger.log('GET /curated-spots');
    return this.curatedSpotsService.listActiveForApp();
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create curated spot (admin)' })
  public async create(
    @Body() dto: CreateCuratedSpotDto,
    @CurrentUser() userId: string,
  ): Promise<CuratedSpot> {
    this.logger.log('POST /curated-spots');
    return this.curatedSpotsService.create(dto, userId);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update curated spot (admin)' })
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateCuratedSpotDto,
  ): Promise<CuratedSpot> {
    this.logger.log(`PATCH /curated-spots/${id}`);
    return this.curatedSpotsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Soft-delete curated spot (admin)' })
  public async softDelete(@Param('id') id: string): Promise<CuratedSpot> {
    this.logger.log(`DELETE /curated-spots/${id}`);
    return this.curatedSpotsService.softDelete(id);
  }

  @Post(':id/images')
  @Roles('admin', 'super_admin')
  @UseInterceptors(FilesInterceptor('images', 20))
  @ApiOperation({ summary: 'Upload images for curated spot (admin)' })
  public async uploadImages(
    @Param('id') spotId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[],
  ): Promise<CuratedSpot> {
    this.logger.log(`POST /curated-spots/${spotId}/images`);
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    await this.curatedSpotsService.getByIdForAdmin(spotId);
    const uploadPromises = files.map(file => {
      const path = `curated-spots/${spotId}/images/${Date.now()}-${file.originalname}`;
      return this.firebaseStorageService.uploadFile(file, path);
    });
    const urls = await Promise.all(uploadPromises);
    return this.curatedSpotsService.appendImageUrls(spotId, urls);
  }

  @Post(':id/video')
  @Roles('admin', 'super_admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a single video file for curated spot (admin); stores resulting URL',
  })
  public async uploadVideo(
    @Param('id') spotId: string,
    @UploadedFile(new VideoFileValidationPipe({ optional: false })) file: Express.Multer.File,
  ): Promise<CuratedSpot> {
    this.logger.log(`POST /curated-spots/${spotId}/video`);
    await this.curatedSpotsService.getByIdForAdmin(spotId);
    const path = `curated-spots/${spotId}/video/${Date.now()}-${file.originalname}`;
    const videoUrl = await this.firebaseStorageService.uploadFile(file, path);
    return this.curatedSpotsService.update(spotId, { videoUrl });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get active curated spot by id (app)' })
  public async getById(@Param('id') id: string): Promise<CuratedSpot> {
    this.logger.log(`GET /curated-spots/${id}`);
    return this.curatedSpotsService.getByIdForApp(id);
  }
}
