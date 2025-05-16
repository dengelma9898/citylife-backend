import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SpecialPollStatus } from '../interfaces/special-poll.interface';

export class UpdateSpecialPollStatusDto {
  @ApiProperty({
    description: 'Der neue Status der Umfrage',
    enum: SpecialPollStatus,
    example: SpecialPollStatus.ACTIVE
  })
  @IsEnum(SpecialPollStatus)
  @IsNotEmpty()
  readonly status: SpecialPollStatus;
} 