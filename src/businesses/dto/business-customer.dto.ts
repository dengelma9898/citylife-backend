import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber } from 'class-validator';

export class BusinessCustomerDto {
  @IsString()
  @IsNotEmpty()
  public readonly customerId: string;

  @IsString()
  @IsNotEmpty()
  public readonly userId: string;

  @IsOptional()
  @IsNumber()
  public readonly price?: number;

  @IsOptional()
  @IsNumber()
  public readonly numberOfPeople?: number;

  @IsOptional()
  @IsString()
  public readonly additionalInfo?: string;

} 