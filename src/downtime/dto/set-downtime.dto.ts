import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetDowntimeDto {
  @ApiProperty({
    description: 'Gibt an, ob aktuell eine Downtime aktiv ist',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  readonly isDowntime: boolean;
}

