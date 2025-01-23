import { Controller, Get, Param, NotFoundException, Logger, UseGuards } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { Business } from './interfaces/business.interface';
import { BusinessCategory } from './interfaces/business-category.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { AuthGuard } from '../core/guards/auth.guard';

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

  @Get('users')
  public async getAllBusinessUsers(): Promise<BusinessUser[]> {
    this.logger.log('GET /businesses/users');
    return this.businessesService.getAllBusinessUsers();
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
} 