import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  NotFoundException,
  Logger,
  UploadedFile,
} from '@nestjs/common';
import { JobOffersService } from './application/services/job-offers.service';
import { CreateJobOfferDto } from './dto/create-job-offer.dto';
import { JobOffer } from './domain/entities/job-offer.entity';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Job Offers')
@Controller('job-offers')
export class JobOffersController {
  private readonly logger = new Logger(JobOffersController.name);

  constructor(
    private readonly jobOffersService: JobOffersService,
    private readonly firebaseStorageService: FirebaseStorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job offer' })
  @ApiResponse({ status: 201, description: 'The job offer has been successfully created.' })
  create(@Body() createJobOfferDto: CreateJobOfferDto): Promise<JobOffer> {
    this.logger.log('POST /job-offers');
    return this.jobOffersService.create(createJobOfferDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all job offers' })
  @ApiResponse({ status: 200, description: 'Return all job offers.' })
  findAll(): Promise<JobOffer[]> {
    this.logger.log('GET /job-offers');
    return this.jobOffersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job offer by id' })
  @ApiResponse({ status: 200, description: 'Return the job offer.' })
  @ApiResponse({ status: 404, description: 'Job offer not found.' })
  findOne(@Param('id') id: string): Promise<JobOffer> {
    this.logger.log(`GET /job-offers/${id}`);
    return this.jobOffersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job offer' })
  @ApiResponse({ status: 200, description: 'The job offer has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Job offer not found.' })
  update(
    @Param('id') id: string,
    @Body() updateJobOfferDto: Partial<CreateJobOfferDto>,
  ): Promise<JobOffer> {
    this.logger.log(`PATCH /job-offers/${id}`);
    return this.jobOffersService.update(id, updateJobOfferDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job offer' })
  @ApiResponse({ status: 200, description: 'The job offer has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Job offer not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /job-offers/${id}`);

    const currentJobOffer = await this.jobOffersService.findOne(id);
    if (!currentJobOffer) {
      throw new NotFoundException('Job offer not found');
    }

    const deletePromises: Promise<void>[] = [];

    // Delete company logo
    if (currentJobOffer.companyLogo) {
      this.logger.debug(`Deleting company logo: ${currentJobOffer.companyLogo}`);
      deletePromises.push(this.firebaseStorageService.deleteFile(currentJobOffer.companyLogo));
    }

    // Delete all images
    if (currentJobOffer.images && currentJobOffer.images.length > 0) {
      this.logger.debug(`Deleting ${currentJobOffer.images.length} images for job offer ${id}`);
      currentJobOffer.images.forEach(imageUrl => {
        this.logger.debug(`Deleting image: ${imageUrl}`);
        deletePromises.push(this.firebaseStorageService.deleteFile(imageUrl));
      });
    }

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }

    return this.jobOffersService.remove(id);
  }

  @Patch(':id/company-logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Update company logo' })
  @ApiResponse({ status: 200, description: 'The company logo has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Job offer not found.' })
  public async updateCompanyLogo(
    @Param('id') jobOfferId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File,
  ): Promise<JobOffer> {
    this.logger.log(`PATCH /job-offers/${jobOfferId}/company-logo`);

    const currentJobOffer = await this.jobOffersService.findOne(jobOfferId);
    if (!currentJobOffer) {
      throw new NotFoundException('Job offer not found');
    }

    if (currentJobOffer.companyLogo) {
      await this.firebaseStorageService.deleteFile(currentJobOffer.companyLogo);
    }

    const path = `job-offers/company-logos/${jobOfferId}/${Date.now()}-${file.originalname}`;
    const imageUrl = await this.firebaseStorageService.uploadFile(file, path);

    return this.jobOffersService.update(jobOfferId, { companyLogo: imageUrl });
  }

  @Patch(':id/images')
  @UseInterceptors(FilesInterceptor('images'))
  @ApiOperation({ summary: 'Add images to job offer' })
  @ApiResponse({ status: 200, description: 'The images have been successfully added.' })
  @ApiResponse({ status: 404, description: 'Job offer not found.' })
  async addImages(
    @Param('id') jobOfferId: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[],
  ): Promise<JobOffer> {
    this.logger.log(`PATCH /job-offers/${jobOfferId}/images`);

    const currentJobOffer = await this.jobOffersService.findOne(jobOfferId);
    if (!currentJobOffer) {
      throw new NotFoundException('Job offer not found');
    }

    let images = currentJobOffer.images || [];

    if (files && files.length > 0) {
      this.logger.debug(`Uploading ${files.length} new images for job offer ${jobOfferId}`);

      for (const file of files) {
        const path = `job-offers/images/${jobOfferId}/${Date.now()}-${file.originalname}`;
        const imageUrl = await this.firebaseStorageService.uploadFile(file, path);
        images.push(imageUrl);
      }
    }

    return this.jobOffersService.update(jobOfferId, { images });
  }

  @Patch(':id/images/remove')
  @ApiOperation({ summary: 'Remove an image from job offer' })
  @ApiResponse({ status: 200, description: 'The image has been successfully removed.' })
  @ApiResponse({ status: 404, description: 'Job offer or image not found.' })
  async removeImage(
    @Param('id') jobOfferId: string,
    @Body('imageUrl') imageUrl: string,
  ): Promise<JobOffer> {
    this.logger.log(`PATCH /job-offers/${jobOfferId}/images/remove`);

    if (!imageUrl) {
      throw new NotFoundException('imageUrl is required');
    }

    const currentJobOffer = await this.jobOffersService.findOne(jobOfferId);
    if (!currentJobOffer) {
      throw new NotFoundException('Job offer not found');
    }

    if (!currentJobOffer.images || !currentJobOffer.images.includes(imageUrl)) {
      throw new NotFoundException('Image not found in job offer');
    }

    await this.firebaseStorageService.deleteFile(imageUrl);

    const updatedImages = currentJobOffer.images.filter(url => url !== imageUrl);

    return this.jobOffersService.update(jobOfferId, { images: updatedImages });
  }
}
