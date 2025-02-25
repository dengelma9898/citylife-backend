import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class BusinessCustomerDto {
  @IsString()
  @IsNotEmpty()
  public readonly customerId: string;

  @IsString()
  @IsNotEmpty()
  public readonly userId: string;

} 