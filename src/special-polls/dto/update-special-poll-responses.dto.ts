import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SpecialPollResponseDto } from './special-poll-response.dto';

export class UpdateSpecialPollResponsesDto {
  @ApiProperty({
    description: 'Die aktualisierte Liste der Antworten',
    type: [SpecialPollResponseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecialPollResponseDto)
  readonly responses: SpecialPollResponseDto[];
}
