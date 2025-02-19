import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Logger, UseGuards } from '@nestjs/common';
import { BusinessUsersService } from './business-users.service';
import { BusinessUser } from './interfaces/business-user.interface';
import { CreateBusinessUserDto } from './dto/create-business-user.dto';
import { AuthGuard } from '../core/guards/auth.guard';

@Controller('business-users')
@UseGuards(AuthGuard)
export class BusinessUsersController {
  private readonly logger = new Logger(BusinessUsersController.name);

  constructor(private readonly businessUsersService: BusinessUsersService) {}

  @Get()
  public async getAll(): Promise<BusinessUser[]> {
    this.logger.log('GET /business-users');
    return this.businessUsersService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<BusinessUser> {
    this.logger.log(`GET /business-users/${id}`);
    const user = await this.businessUsersService.getById(id);
    if (!user) {
      throw new NotFoundException('Business user not found');
    }
    return user;
  }

  @Post()
  public async create(@Body() createUserDto: CreateBusinessUserDto): Promise<BusinessUser> {
    this.logger.log('POST /business-users');
    return this.businessUsersService.create(createUserDto);
  }

  @Put(':id')
  public async update(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<CreateBusinessUserDto>
  ): Promise<BusinessUser> {
    this.logger.log(`PUT /business-users/${id}`);
    return this.businessUsersService.update(id, updateUserDto);
  }

  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /business-users/${id}`);
    return this.businessUsersService.delete(id);
  }
} 