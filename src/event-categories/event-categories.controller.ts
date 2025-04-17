import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe } from '@nestjs/common';
import { EventCategoriesService } from './services/event-categories.service';
import { CreateEventCategoryDto } from './dto/create-event-category.dto';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto';
import { EventCategory } from './interfaces/event-category.interface';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Event Categories')
@Controller('event-categories')
export class EventCategoriesController {
  constructor(private readonly eventCategoriesService: EventCategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new event category' })
  @ApiResponse({ status: 201, description: 'The event category has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body(ValidationPipe) createEventCategoryDto: CreateEventCategoryDto): Promise<EventCategory> {
    return this.eventCategoriesService.create(createEventCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all event categories' })
  @ApiResponse({ status: 200, description: 'Return all event categories.' })
  findAll(): Promise<EventCategory[]> {
    return this.eventCategoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an event category by id' })
  @ApiResponse({ status: 200, description: 'Return the event category.' })
  @ApiResponse({ status: 404, description: 'Event category not found.' })
  findOne(@Param('id') id: string): Promise<EventCategory | null> {
    return this.eventCategoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an event category' })
  @ApiResponse({ status: 200, description: 'The event category has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Event category not found.' })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEventCategoryDto: UpdateEventCategoryDto
  ): Promise<EventCategory | null> {
    return this.eventCategoriesService.update(id, updateEventCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an event category' })
  @ApiResponse({ status: 200, description: 'The event category has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Event category not found.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.eventCategoriesService.remove(id);
  }
} 