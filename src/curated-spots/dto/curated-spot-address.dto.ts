import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

/** Structured spot address (same fields as partner `BusinessAddressDto`). */
export class CuratedSpotAddressDto {
  @IsString()
  @IsNotEmpty()
  readonly street: string;

  @IsString()
  @IsNotEmpty()
  readonly houseNumber: string;

  @IsString()
  @IsNotEmpty()
  readonly postalCode: string;

  @IsString()
  @IsNotEmpty()
  readonly city: string;

  @IsNumber()
  readonly latitude: number;

  @IsNumber()
  readonly longitude: number;
}
