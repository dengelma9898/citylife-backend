import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetFeatureActiveDto {
  @ApiProperty({
    description: 'Gibt an, ob das Adventskalender-Feature aktiviert ist',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  readonly isFeatureActive: boolean;
}

