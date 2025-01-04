import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { Business } from './interfaces/business.interface';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

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