import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { BusinessCategoriesService } from './business-categories.service';
import { BusinessCategory } from './interfaces/business-category.interface';

@Controller('business-categories')
export class BusinessCategoriesController {
  constructor(private readonly businessCategoriesService: BusinessCategoriesService) {}

  @Get()
  public async getAll(): Promise<BusinessCategory[]> {
    return this.businessCategoriesService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<BusinessCategory> {
    const category = await this.businessCategoriesService.getById(id);
    if (!category) {
      throw new NotFoundException('Business category not found');
    }
    return category;
  }
} 