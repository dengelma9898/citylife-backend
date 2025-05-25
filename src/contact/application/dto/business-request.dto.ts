import { IsString, IsOptional } from 'class-validator';

export class BusinessRequestDto {
  @IsString()
  userId: string;

  @IsString()
  message: string;


  @IsString()
  @IsOptional()
  businessId: string;
} 