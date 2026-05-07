import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SpecialPollStatus } from '../interfaces/special-poll.interface';

export class UpdateSpecialPollStatusDto {
  @ApiProperty({
    description: 'Der neue Status der Umfrage (ACTIVE sichtbar, INACTIVE ausgeblendet für App-Nutzer)',
    enum: SpecialPollStatus,
    example: SpecialPollStatus.INACTIVE,
  })
  @IsEnum(SpecialPollStatus)
  @IsNotEmpty()
  readonly status: SpecialPollStatus;
}
