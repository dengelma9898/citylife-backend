import { Controller, Get, Param, NotFoundException, Logger, UseGuards, Post, Body, Put, Patch } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { Business } from './interfaces/business.interface';
import { BusinessCategory } from './interfaces/business-category.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { AuthGuard } from '../core/guards/auth.guard';
import { CreateBusinessDto } from './dto/create-business.dto';

@Controller('businesses')
@UseGuards(AuthGuard)
export class BusinessesController {
  private readonly logger = new Logger(BusinessesController.name);

  constructor(private readonly businessesService: BusinessesService) {}

  @Get('categories')
  public async getAllCategories(): Promise<BusinessCategory[]> {
    this.logger.log('GET /businesses/categories');
    return this.businessesService.getAllCategories();
  }

  @Get()
  public async getAll(): Promise<Business[]> {
    this.logger.log('GET /businesses');
    return this.businessesService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<Business> {
    this.logger.log(`GET /businesses/${id}`);
    const business = await this.businessesService.getById(id);
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }

  @Post()
  public async create(@Body() createBusinessDto: CreateBusinessDto): Promise<Business> {
    this.logger.log('POST /businesses');
    return this.businessesService.create(createBusinessDto);
  }

  @Put(':id')
  public async update(
    @Param('id') id: string,
    @Body() updateBusinessDto: Partial<CreateBusinessDto>
  ): Promise<Business> {
    this.logger.log(`PUT /businesses/${id}`);
    return this.businessesService.update(id, updateBusinessDto);
  }

  @Patch(':id')
  public async patchBusiness(
    @Param('id') id: string,
    @Body() patchData: Partial<Business>
  ): Promise<Business> {
    this.logger.log(`PATCH /businesses/${id}`);
    return this.businessesService.patch(id, patchData);
  }
} 