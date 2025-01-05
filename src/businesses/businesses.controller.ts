import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { Business } from './interfaces/business.interface';
import { BusinessCategory } from './interfaces/business-category.interface';
import { BusinessUser } from './interfaces/business-user.interface';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get('categories')
  public async getAllCategories(): Promise<BusinessCategory[]> {
    return this.businessesService.getAllCategories();
  }

  @Get('users')
  public async getAllBusinessUsers(): Promise<BusinessUser[]> {
    return this.businessesService.getAllBusinessUsers();
  }

  @Get()
  public async getAll(): Promise<Business[]> {
    return this.businessesService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<Business> {
    const business = await this.businessesService.getById(id);
    if (!business) {
      throw new NotFoundException('Business not found');
    }
    return business;
  }
} 