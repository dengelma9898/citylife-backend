import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserProfile } from './interfaces/user-profile.interface';
import { UserProfileDto } from './dto/user-profile.dto';
import { City } from '../cities/interfaces/city.interface';
import { BusinessUser } from './interfaces/business-user.interface';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { CreateBusinessUserDto } from './dto/create-business-user.dto';
import { UserType } from './enums/user-type.enum';

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
  public async getProfile(@Param('id') id: string): Promise<UserProfile | BusinessUser> {
    this.logger.log(`GET /users/${id}/profile`);
    const user = await this.usersService.getById(id);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return user;
  }

  @Post(':id/profile')
  public async createUserProfile(
    @Param('id') id: string,
    @Body() userProfileDto: CreateUserProfileDto
  ): Promise<UserProfile> {
    this.logger.log(`POST /users/${id}/profile`);
    return this.usersService.createUserProfile(id, userProfileDto);
  }

  @Post(':id/business-profile')
  public async createBusinessProfile(
    @Param('id') id: string,
    @Body() businessUserDto: CreateBusinessUserDto
  ): Promise<BusinessUser> {
    this.logger.log(`POST /users/${id}/business-profile`);
    return this.usersService.createBusinessUser(businessUserDto);
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

  @Put(':id/current-city/:cityId')
  public async setCurrentCity(
    @Param('id') userId: string,
    @Param('cityId') cityId: string
  ): Promise<City> {
    this.logger.log(`PUT /users/${userId}/current-city/${cityId}`);
    return this.usersService.setCurrentCity(userId, cityId);
  }

  @Post(':id/business-profile')
  public async createBusinessUser(@Body() createUserDto: CreateBusinessUserDto): Promise<BusinessUser> {
    this.logger.log('POST /users/business-profile');
    return this.usersService.createBusinessUser(createUserDto);
  }

  @Put(':id/business-profile')
  public async updateBusinessUser(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<BusinessUser>
  ): Promise<BusinessUser> {
    this.logger.log(`PUT /users/${id}/business-profile`);
    return this.usersService.updateBusinessUser(id, updateUserDto);
  }

  @Delete(':id/business-profile')
  public async deleteBusinessUser(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /users/${id}/business-profile`);
    return this.usersService.deleteBusinessUser(id);
  }

  @Get(':id/type')
  public async getUserType(@Param('id') id: string): Promise<{ userType: UserType }> {
    this.logger.log(`GET /users/${id}/type`);
    const userProfile = await this.usersService.getUserProfile(id);
    if (userProfile) {
      return { userType: userProfile.userType };
    }

    const businessUser = await this.usersService.getBusinessUser(id);
    if (businessUser) {
      return { userType: UserType.BUSINESS };
    }

    throw new NotFoundException('User not found');
  }
} 