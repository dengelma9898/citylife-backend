import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateEventCategoryDto } from './create-event-category.dto';

export class UpdateEventCategoryDto extends PartialType(CreateEventCategoryDto) {
  @ApiProperty({ required: false, description: 'The name of the event category' })
  name?: string;

  @ApiProperty({ required: false, description: 'The description of the event category' })
  description?: string;

  @ApiProperty({ required: false, description: 'The icon of the event category' })
  icon?: string;
} 