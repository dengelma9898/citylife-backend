import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FeatureRequestsService } from '../services/feature-requests.service';
import { CreateFeatureRequestDto } from '../../dto/create-feature-request.dto';
import { CompleteFeatureRequestDto, CompletionAction } from '../../dto/complete-feature-request.dto';
import { FeatureRequestDto } from '../../dto/feature-request.dto';
import { FeatureRequestStatus } from '../../domain/enums/feature-request-status.enum';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Roles } from '../../../core/decorators/roles.decorator';
import { RolesGuard } from '../../../core/guards/roles.guard';
import { FileValidationPipe } from '../../../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';

@Controller('feature-requests')
export class FeatureRequestsController {
  private readonly logger = new Logger(FeatureRequestsController.name);

  constructor(
    private readonly featureRequestsService: FeatureRequestsService,
    private readonly firebaseStorageService: FirebaseStorageService,
  ) {}

  @Get()
  public async getAll(@CurrentUser() userId: string): Promise<FeatureRequestDto[]> {
    this.logger.log('GET /feature-requests');
    return this.featureRequestsService.getAll(userId);
  }

  @Get('my')
  public async getMyFeatureRequests(@CurrentUser() userId: string): Promise<FeatureRequestDto[]> {
    this.logger.log('GET /feature-requests/my');
    return this.featureRequestsService.getMyFeatureRequests(userId);
  }

  @Get('status/:status')
  public async getByStatus(
    @Param('status') status: FeatureRequestStatus,
    @CurrentUser() userId: string,
  ): Promise<FeatureRequestDto[]> {
    this.logger.log(`GET /feature-requests/status/${status}`);
    return this.featureRequestsService.getByStatus(status, userId);
  }

  @Get(':id')
  public async getById(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<FeatureRequestDto> {
    this.logger.log(`GET /feature-requests/${id}`);
    return this.featureRequestsService.getById(id, userId);
  }

  @Post()
  public async create(
    @Body() dto: CreateFeatureRequestDto,
    @CurrentUser() userId: string,
  ): Promise<FeatureRequestDto> {
    this.logger.log('POST /feature-requests');
    return this.featureRequestsService.create(dto, userId);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 3))
  public async uploadImages(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @UploadedFiles(new FileValidationPipe({ optional: false })) files: Express.Multer.File[],
  ): Promise<FeatureRequestDto> {
    this.logger.log(`POST /feature-requests/${id}/images`);
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    if (files.length > 3) {
      throw new BadRequestException('Maximum 3 images allowed');
    }
    const uploadPromises = files.map(file => {
      const path = `feature-requests/${id}/images/${Date.now()}-${file.originalname}`;
      return this.firebaseStorageService.uploadFile(file, path);
    });
    const imageUrls = await Promise.all(uploadPromises);
    return this.featureRequestsService.addImages(id, imageUrls, userId);
  }

  @Delete(':id/images')
  public async removeImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string,
    @CurrentUser() userId: string,
  ): Promise<FeatureRequestDto> {
    this.logger.log(`DELETE /feature-requests/${id}/images`);
    if (!imageUrl) {
      throw new BadRequestException('Image URL is required');
    }
    try {
      await this.firebaseStorageService.deleteFile(imageUrl);
    } catch (error) {
      this.logger.error(`Failed to delete image from storage: ${error.message}`);
    }
    return this.featureRequestsService.removeImage(id, imageUrl, userId);
  }

  @Post(':id/vote')
  public async vote(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<FeatureRequestDto> {
    this.logger.log(`POST /feature-requests/${id}/vote`);
    return this.featureRequestsService.vote(id, userId);
  }

  @Delete(':id/vote')
  public async removeVote(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<FeatureRequestDto> {
    this.logger.log(`DELETE /feature-requests/${id}/vote`);
    return this.featureRequestsService.removeVote(id, userId);
  }

  @Post(':id/in-progress')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  public async setInProgress(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<FeatureRequestDto> {
    this.logger.log(`POST /feature-requests/${id}/in-progress`);
    return this.featureRequestsService.setInProgress(id, userId);
  }

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  public async complete(
    @Param('id') id: string,
    @Body() dto: CompleteFeatureRequestDto,
    @CurrentUser() userId: string,
  ): Promise<FeatureRequestDto> {
    this.logger.log(`POST /feature-requests/${id}/complete`);
    if (dto.action === CompletionAction.COMPLETE) {
      return this.featureRequestsService.complete(id, userId, dto.comment);
    }
    return this.featureRequestsService.reject(id, userId, dto.comment);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  public async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    this.logger.log(`DELETE /feature-requests/${id}`);
    await this.featureRequestsService.delete(id);
    return { success: true };
  }
}

