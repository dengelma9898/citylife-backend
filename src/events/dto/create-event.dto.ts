import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsBoolean, IsEmail, IsUrl, Matches } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  public readonly title: string;

  @IsString()
  @IsNotEmpty()
  public readonly description: string;

  @IsString()
  @IsNotEmpty()
  public readonly address: string;

  @IsNumber()
  public readonly latitude: number;

  @IsNumber()
  public readonly longitude: number;

  @IsDateString()
  public readonly startDate: string;

  @IsDateString()
  public readonly endDate: string;

  @IsOptional()
  @IsBoolean()
  public readonly ticketsNeeded?: boolean;

  @IsOptional()
  @IsNumber()
  public readonly price?: number;

  @IsString()
  @IsNotEmpty()
  public readonly categoryId: string;

  @IsOptional()
  @IsEmail()
  public readonly contactEmail?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, {
    message: 'Ungültiges Telefonnummer-Format'
  })
  public readonly contactPhone?: string;

  @IsOptional()
  @IsUrl()
  public readonly website?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._]{1,30}$/, {
    message: 'Ungültiges Instagram-Format'
  })
  public readonly instagram?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9.]{5,50}$/, {
    message: 'Ungültiges Facebook-Format'
  })
  public readonly facebook?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9._]{2,24}$/, {
    message: 'Ungültiges TikTok-Format'
  })
  public readonly tiktok?: string;
} 