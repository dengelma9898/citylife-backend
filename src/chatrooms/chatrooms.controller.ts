import { Controller, Get, Post, Patch, Body, Param, NotFoundException, Logger } from '@nestjs/common';
import { ChatroomsService } from './chatrooms.service';
import { Chatroom } from './interfaces/chatroom.interface';
import { CreateChatroomDto } from './dto/create-chatroom.dto';

@Controller('chatrooms')
export class ChatroomsController {
  private readonly logger = new Logger(ChatroomsController.name);

  constructor(private readonly chatroomsService: ChatroomsService) {}

  @Get()
  public async getAll(): Promise<Chatroom[]> {
    this.logger.log('GET /chatrooms');
    return this.chatroomsService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<Chatroom> {
    this.logger.log(`GET /chatrooms/${id}`);
    const chatroom = await this.chatroomsService.getById(id);
    if (!chatroom) {
      throw new NotFoundException('Chatroom not found');
    }
    return chatroom;
  }

  @Post()
  public async create(@Body() createChatroomDto: CreateChatroomDto): Promise<Chatroom> {
    this.logger.log('POST /chatrooms');
    return this.chatroomsService.create(createChatroomDto);
  }

  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Body() updateChatroomDto: Partial<Chatroom>
  ): Promise<Chatroom> {
    this.logger.log(`PATCH /chatrooms/${id}`);
    return this.chatroomsService.update(id, updateChatroomDto);
  }
} 