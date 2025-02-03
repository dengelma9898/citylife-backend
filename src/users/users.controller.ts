import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserProfile } from './interfaces/user-profile.interface';
import { UserProfileDto } from './dto/user-profile.dto';
import { City } from './interfaces/city.interface';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  public async getAll(): Promise<UserProfile[]> {
    this.logger.log('GET /users');
    return this.usersService.getAll();
  }

  @Get(':id/profile')
  public async getProfile(@Param('id') id: string): Promise<UserProfile> {
    this.logger.log(`GET /users/${id}/profile`);
    const user = await this.usersService.getById(id);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  @Post(':id/profile')
  public async createProfile(
    @Param('id') id: string,
    @Body() userProfileDto: UserProfileDto
  ): Promise<UserProfile> {
    this.logger.log(`POST /users/${id}/profile`);
    const { id: _, ...profile } = userProfileDto;
    return this.usersService.create(id, profile);
  }

  @Put(':id/profile')
  public async updateProfile(
    @Param('id') id: string,
    @Body() userProfileDto: Partial<UserProfileDto>
  ): Promise<UserProfile> {
    this.logger.log(`PUT /users/${id}/profile`);
    return this.usersService.update(id, userProfileDto);
  }

  @Delete(':id/profile')
  public async deleteProfile(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /users/${id}/profile`);
    return this.usersService.delete(id);
  }

  @Get(':id/current-city')
  public async getCurrentCity(@Param('id') userId: string): Promise<City> {
    this.logger.log(`GET /users/${userId}/current-city`);
    return this.usersService.getCurrentCity(userId);
  }

  @Put(':id/current-city')
  public async setCurrentCity(
    @Param('id') userId: string,
    @Body('cityId') cityId: string
  ): Promise<City> {
    this.logger.log(`PUT /users/${userId}/current-city`);
    return this.usersService.setCurrentCity(userId, cityId);
  }
} 