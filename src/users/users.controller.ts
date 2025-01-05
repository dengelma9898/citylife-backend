import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserProfile } from './interfaces/user-profile.interface';
import { UserProfileDto } from './dto/user-profile.dto';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  public async getAll(): Promise<UserProfile[]> {
    this.logger.log('GET /users');
    return this.usersService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<UserProfile> {
    this.logger.log(`GET /users/${id}`);
    const user = await this.usersService.getById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Post(':id')
  public async create(
    @Param('id') id: string,
    @Body() userProfileDto: UserProfileDto
  ): Promise<UserProfile> {
    this.logger.log(`POST /users/${id}`);
    const { id: _, ...profile } = userProfileDto;
    return this.usersService.create(id, profile);
  }

  @Put(':id')
  public async update(
    @Param('id') id: string,
    @Body() userProfileDto: Partial<UserProfileDto>
  ): Promise<UserProfile> {
    this.logger.log(`PUT /users/${id}`);
    return this.usersService.update(id, userProfileDto);
  }

  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /users/${id}`);
    return this.usersService.delete(id);
  }
} 