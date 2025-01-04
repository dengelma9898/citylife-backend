import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { BusinessUsersService } from './business-users.service';
import { BusinessUser } from './interfaces/business-user.interface';

@Controller('business-users')
export class BusinessUsersController {
  constructor(private readonly businessUsersService: BusinessUsersService) {}

  @Get()
  public async getAll(): Promise<BusinessUser[]> {
    return this.businessUsersService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<BusinessUser> {
    const user = await this.businessUsersService.getById(id);
    if (!user) {
      throw new NotFoundException('Business user not found');
    }
    return user;
  }
} 