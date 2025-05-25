import { IsString } from 'class-validator';

export class BusinessClaimRequestDto {
  @IsString()
  userId: string;

  @IsString()
  message: string;

  
  @IsString()
  businessId: string;
} 