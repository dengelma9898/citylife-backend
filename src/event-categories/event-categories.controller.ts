import { Controller, Get, Post, Body, Patch, Param, Delete, ValidationPipe } from '@nestjs/common';
import { EventCategoriesService } from './services/event-categories.service';
import { CreateEventCategoryDto } from './dto/create-event-category.dto';
import { EventCategory } from './interfaces/event-category.interface';

@Controller('business-categories')
export class EventCategoriesController {
  constructor(private readonly eventCategoriesService: EventCategoriesService) {}

  @Post()
  create(@Body(ValidationPipe) createEventCategoryDto: CreateEventCategoryDto): Promise<EventCategory> {
    return this.eventCategoriesService.create(createEventCategoryDto);
  }

  @Get()
  findAll(): Promise<EventCategory[]> {
    return this.eventCategoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<EventCategory | null> {
    return this.eventCategoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateEventCategoryDto: Partial<CreateEventCategoryDto>
  ): Promise<EventCategory | null> {
    return this.eventCategoriesService.update(id, updateEventCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.eventCategoriesService.remove(id);
  }
} 