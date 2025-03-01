import { Controller, Get, Post, Put, Body, Param, NotFoundException, Logger, Patch } from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from './interfaces/event.interface';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly eventsService: EventsService) {}

  @Get()
  public async getAll(): Promise<Event[]> {
    this.logger.log('GET /events');
    return this.eventsService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<Event> {
    this.logger.log(`GET /events/${id}`);
    const event = await this.eventsService.getById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  @Post()
  public async create(@Body() createEventDto: CreateEventDto): Promise<Event> {
    this.logger.log('POST /events');
    return this.eventsService.create(createEventDto);
  }

  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Body() updateEventDto: Partial<Event>
  ): Promise<Event> {
    this.logger.log(`PATCH /events/${id}`);
    return this.eventsService.update(id, updateEventDto);
  }
} 