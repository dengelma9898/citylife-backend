import { Controller, Get, Param, NotFoundException, Logger } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { City } from './interfaces/city.interface';
import { Chatroom } from './interfaces/chatroom.interface';
import { Event } from './interfaces/event.interface';
import { Message } from './interfaces/message.interface';

@Controller('cities')
export class CitiesController {
  private readonly logger = new Logger(CitiesController.name);

  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  public async getAll(): Promise<City[]> {
    this.logger.log('GET /cities');
    return this.citiesService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<City> {
    this.logger.log(`GET /cities/${id}`);
    const city = await this.citiesService.getById(id);
    if (!city) {
      throw new NotFoundException('City not found');
    }
    return city;
  }



  @Get(':id/chatrooms')
  public async getCityChatrooms(@Param('id') id: string): Promise<Chatroom[]> {
    this.logger.log(`GET /cities/${id}/chatrooms`);
    return this.citiesService.getChatrooms(id);
  }


  @Get(':id/events')
  public async getCityEvents(@Param('id') id: string): Promise<Event[]> {
    this.logger.log(`GET /cities/${id}/events`);
    return this.citiesService.getEvents(id);
  }



  @Get(':cityId/chatrooms/:chatroomId/messages')
  public async getChatroomMessages(
    @Param('cityId') cityId: string,
    @Param('chatroomId') chatroomId: string,
  ): Promise<Message[]> {
    this.logger.log(`GET /cities/${cityId}/chatrooms/${chatroomId}/messages`);
    return this.citiesService.getChatroomMessages(cityId, chatroomId);
  }


} 