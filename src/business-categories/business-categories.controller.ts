import { Controller, Get, Post, Patch, Delete, Body, Param, NotFoundException, Logger } from '@nestjs/common';
import { BusinessCategoriesService } from './business-categories.service';
import { BusinessCategory } from './interfaces/business-category.interface';
import { CreateBusinessCategoryDto } from './dto/create-business-category.dto';
import { UpdateBusinessCategoryDto } from './dto/update-business-category.dto';

@Controller('business-categories')
export class BusinessCategoriesController {
  private readonly logger = new Logger(BusinessCategoriesController.name);

  constructor(private readonly businessCategoriesService: BusinessCategoriesService) {}

  @Get()
  public async getAll(): Promise<BusinessCategory[]> {
    this.logger.log('GET /business-categories');
    return this.businessCategoriesService.getAll();
  }

  /**
   * Temporärer Endpunkt, der Business-Kategorien inklusive ihrer Keywords zurückgibt
   * @deprecated Dieser Endpunkt ist temporär und wird in Zukunft entfernt
   */
  @Get('with-keywords')
  public async getAllWithKeywords(): Promise<BusinessCategory[]> {
    this.logger.log('GET /business-categories/with-keywords');
    return this.businessCategoriesService.getAllWithKeywords();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<BusinessCategory> {
    this.logger.log(`GET /business-categories/${id}`);
    const category = await this.businessCategoriesService.getById(id);
    if (!category) {
      throw new NotFoundException('Business category not found');
    }
    return category;
  }

  @Post()
  public async create(@Body() createCategoryDto: CreateBusinessCategoryDto): Promise<BusinessCategory> {
    this.logger.log('POST /business-categories');
    return this.businessCategoriesService.create(createCategoryDto);
  }

  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateBusinessCategoryDto
  ): Promise<BusinessCategory> {
    this.logger.log(`PATCH /business-categories/${id}`);
    return this.businessCategoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /business-categories/${id}`);
    return this.businessCategoriesService.delete(id);
  }


} 