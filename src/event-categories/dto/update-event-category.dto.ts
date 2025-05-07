import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateEventCategoryDto } from './create-event-category.dto';

export class UpdateEventCategoryDto extends PartialType(CreateEventCategoryDto) {
  @ApiProperty({ required: false, description: 'The name of the event category' })
  name?: string;

  @ApiProperty({ required: false, description: 'The description of the event category' })
  description?: string;

  @ApiProperty({ required: false, description: 'The color code of the event category' })
  colorCode?: string;

  @ApiProperty({ required: false, description: 'The icon name of the event category' })
  iconName?: string;

  @ApiProperty({ required: false, description: 'The fallback images of the event category' })
  fallbackImages?: string[];
} 