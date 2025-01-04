import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  public async createUser(@Body() createUserDto: CreateUserDto): Promise<{ uid: string }> {
    return this.usersService.createUser(createUserDto);
  }

  @Get(':id')
  public async getUser(@Param('id') id: string): Promise<any> {
    return this.usersService.getUserById(id);
  }
} 