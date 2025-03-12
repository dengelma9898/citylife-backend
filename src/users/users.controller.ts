import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Logger, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserProfile } from './interfaces/user-profile.interface';
import { UserProfileDto } from './dto/user-profile.dto';
import { BusinessUser } from './interfaces/business-user.interface';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { CreateBusinessUserDto } from './dto/create-business-user.dto';
import { UserType } from './enums/user-type.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { FileValidationPipe } from '../core/pipes/file-validation.pipe';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly firebaseStorageService: FirebaseStorageService
  ) {}

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

  @Post(':id/profile/picture')
  @UseInterceptors(FileInterceptor('file'))
  public async uploadProfilePicture(
    @Param('id') userId: string,
    @UploadedFile(FileValidationPipe) file: Express.Multer.File
  ): Promise<UserProfile> {
    this.logger.log(`POST /users/${userId}/profile/picture`);

    // Get current profile to check for existing picture
    const currentProfile = await this.usersService.getUserProfile(userId);
    if (currentProfile?.profilePictureUrl) {
      this.logger.debug('Deleting old profile picture');
      await this.firebaseStorageService.deleteFile(currentProfile.profilePictureUrl);
    }

    const path = `profile-pictures/${userId}/${Date.now()}-${file.originalname}`;
    const imageUrl = await this.firebaseStorageService.uploadFile(file, path);

    return this.usersService.update(userId, { profilePictureUrl: imageUrl });
  }
} 