import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class BusinessAddressDto {
  @IsString()
  @IsNotEmpty()
  public readonly street: string;

  @IsString()
  @IsNotEmpty()
  public readonly houseNumber: string;

  @IsString()
  @IsNotEmpty()
  public readonly postalCode: string;

  @IsString()
  @IsNotEmpty()
  public readonly city: string;

  @IsNumber()
  public readonly latitude: number;

  @IsNumber()
  public readonly longitude: number;
}
