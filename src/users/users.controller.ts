import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserProfile } from './interfaces/user-profile.interface';
import { UserProfileDto } from './dto/user-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  public async getAll(): Promise<UserProfile[]> {
    return this.usersService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<UserProfile> {
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
    const { id: _, ...profile } = userProfileDto;
    return this.usersService.create(id, profile);
  }

  @Put(':id')
  public async update(
    @Param('id') id: string,
    @Body() userProfileDto: Partial<UserProfileDto>
  ): Promise<UserProfile> {
    return this.usersService.update(id, userProfileDto);
  }

  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<void> {
    return this.usersService.delete(id);
  }
} 