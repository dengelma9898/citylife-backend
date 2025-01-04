import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { City } from './interfaces/city.interface';
import { Chatroom } from './interfaces/chatroom.interface';
import { Event } from './interfaces/event.interface';
import { Message } from './interfaces/message.interface';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  public async getAll(): Promise<City[]> {
    return this.citiesService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<City> {
    const city = await this.citiesService.getById(id);
    if (!city) {
      throw new NotFoundException('City not found');
    }
    return city;
  }

  @Get(':id/:subcollection')
  public async getSubcollection(
    @Param('id') id: string,
    @Param('subcollection') subcollection: string,
  ): Promise<any[]> {
    return this.citiesService.getSubcollectionData(id, subcollection);
  }

  @Get('subcollections/:name')
  public async getAllFromSubcollection(@Param('name') name: string): Promise<any[]> {
    return this.citiesService.queryAllSubcollections(name);
  }

  @Get(':id/chatrooms')
  public async getCityChatrooms(@Param('id') id: string): Promise<Chatroom[]> {
    return this.citiesService.getChatrooms(id);
  }

  @Get('chatrooms/all')
  public async getAllChatrooms(): Promise<Chatroom[]> {
    return this.citiesService.getAllChatrooms();
  }

  @Get(':id/events')
  public async getCityEvents(@Param('id') id: string): Promise<Event[]> {
    return this.citiesService.getEvents(id);
  }

  @Get('events/all')
  public async getAllEvents(): Promise<Event[]> {
    return this.citiesService.getAllEvents();
  }

  @Get(':cityId/chatrooms/:chatroomId/messages')
  public async getChatroomMessages(
    @Param('cityId') cityId: string,
    @Param('chatroomId') chatroomId: string,
  ): Promise<Message[]> {
    return this.citiesService.getChatroomMessages(cityId, chatroomId);
  }

  @Get('messages/all')
  public async getAllMessages(): Promise<Message[]> {
    return this.citiesService.getAllMessages();
  }
} 