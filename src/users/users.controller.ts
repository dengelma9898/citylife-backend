import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Logger, UseInterceptors, UploadedFile, Patch, BadRequestException, UnauthorizedException } from '@nestjs/common';
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
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

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

  @Get('business-users/needs-review')
  public async getBusinessUsersNeedsReview(): Promise<BusinessUser[]> {
    this.logger.log('GET /users/business-users/needs-review');
    return this.usersService.getBusinessUsersNeedsReview();
  }

  @Get('business-users/needs-review/count')
  public async getPendingBusinessUserReviewsCount(): Promise<{ count: number }> {
    this.logger.log('GET /users/business-users/needs-review/count');
    
    const count = await this.usersService.getBusinessUsersNeedsReviewCount();
    
    return { count };
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

  @Patch(':id/profile')
  public async updateProfile(
    @Param('id') id: string,
    @Body() userProfileDto: Partial<UserProfileDto>
  ): Promise<UserProfile> {
    this.logger.log(`PATCH /users/${id}/profile`);
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

  @Patch(':id/business-profile/needs-review')
  public async updateNeedsReview(
    @Param('id') id: string,
    @Body('needsReview') needsReview: boolean
  ): Promise<BusinessUser> {
    this.logger.log(`PATCH /users/${id}/business-profile/needs-review`);
    
    if (needsReview === undefined) {
      throw new BadRequestException('needsReview field is required');
    }
    
    const businessUser = await this.usersService.getBusinessUser(id);
    if (!businessUser) {
      throw new NotFoundException('Business user not found');
    }
    
    return this.usersService.updateBusinessUser(id, { needsReview });
  }

  @Delete(':id/business-profile')
  public async deleteBusinessUser(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /users/${id}/business-profile`);
    return this.usersService.deleteBusinessUser(id);
  }

  @Patch(':id/favorites/events/:eventId')
  public async toggleFavoriteEvent(
    @Param('id') userId: string,
    @Param('eventId') eventId: string
  ): Promise<{ added: boolean }> {
    this.logger.log(`PATCH /users/${userId}/favorites/events/${eventId}`);
    
    const userProfile = await this.usersService.getUserProfile(userId);
    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }
    
    const added = await this.usersService.toggleFavoriteEvent(userId, eventId);
    return { added };
  }
  
  @Patch(':id/favorites/businesses/:businessId')
  public async toggleFavoriteBusiness(
    @Param('id') userId: string,
    @Param('businessId') businessId: string
  ): Promise<{ added: boolean }> {
    this.logger.log(`PATCH /users/${userId}/favorites/businesses/${businessId}`);
    
    const userProfile = await this.usersService.getUserProfile(userId);
    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }
    
    const added = await this.usersService.toggleFavoriteBusiness(userId, businessId);
    return { added };
  }

  @Get(':id/favorites/events')
  public async getFavoriteEvents(@Param('id') userId: string): Promise<string[]> {
    this.logger.log(`GET /users/${userId}/favorites/events`);
    
    const userProfile = await this.usersService.getUserProfile(userId);
    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }
    
    return userProfile.favoriteEventIds || [];
  }
  
  @Get(':id/favorites/businesses')
  public async getFavoriteBusinesses(@Param('id') userId: string): Promise<string[]> {
    this.logger.log(`GET /users/${userId}/favorites/businesses`);
    
    const userProfile = await this.usersService.getUserProfile(userId);
    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }
    
    return userProfile.favoriteBusinessIds || [];
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

  @Get(':id/type-of-user')
  public async getTypeOfUser(@Param('id') id: string): Promise<string> {
    this.logger.log(`GET /users/${id}/type-of-user`);
    try {
      const userProfile = await this.usersService.getUserProfile(id);
      if (userProfile) {
        return userProfile.userType;
      }

      const businessUser = await this.usersService.getBusinessUser(id);
      if (businessUser) {
        return UserType.BUSINESS;
      }

      throw new NotFoundException('Benutzer nicht gefunden');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Fehler beim Abrufen des Benutzertyps: ${error.message}`);
      throw new BadRequestException('Fehler beim Abrufen des Benutzertyps');
    }
  }

  @Post(':id/profile/picture')
  @UseInterceptors(FileInterceptor('file'))
  public async uploadProfilePicture(
    @Param('id') userId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File
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

  @Get(':userId/business-users')
  @ApiOperation({ summary: 'Gibt alle Business-User zurück (nur für SUPER_ADMIN)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste aller Business-User',
    isArray: true
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Nicht autorisiert - Nur SUPER_ADMINs können diese Resource aufrufen'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID des anfragenden Benutzers (muss SUPER_ADMIN sein)'
  })
  public async getAllBusinessUsers(
    @Param('userId') userId: string
  ): Promise<BusinessUser[]> {
    this.logger.log(`GET /users/${userId}/business-users`);
    
    // Überprüfe, ob der Benutzer ein SUPER_ADMIN ist
    const requestingUser = await this.usersService.getUserProfile(userId);
    if (!requestingUser || requestingUser.userType !== UserType.SUPER_ADMIN) {
      throw new UnauthorizedException('Nur SUPER_ADMINs können diese Resource aufrufen');
    }

    return this.usersService.getAllBusinessUsers();
  }

  @Post(':userId/business-user/businesses/:businessId')
  @ApiOperation({ summary: 'Fügt ein Business zu einem Business-User hinzu' })
  @ApiResponse({ 
    status: 200, 
    description: 'Das Business wurde erfolgreich dem User zugeordnet'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Business-User oder Business wurde nicht gefunden'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Business ist bereits dem User zugeordnet'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID des Business-Users'
  })
  @ApiParam({
    name: 'businessId',
    description: 'ID des Businesses, das hinzugefügt werden soll'
  })
  public async addBusinessToUser(
    @Param('userId') userId: string,
    @Param('businessId') businessId: string
  ): Promise<BusinessUser> {
    this.logger.log(`POST /users/${userId}/business-user/businesses/${businessId}`);
    return this.usersService.addBusinessIdToUser(userId, businessId);
  }
} 