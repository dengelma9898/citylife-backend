import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SpecialPollResponseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly userName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly response: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly createdAt: string;
}
