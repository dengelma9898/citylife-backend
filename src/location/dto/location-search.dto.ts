import { IsNotEmpty, IsString } from 'class-validator';

export class LocationSearchDto {
  @IsNotEmpty()
  @IsString()
  query: string;
} 