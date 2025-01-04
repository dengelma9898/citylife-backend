import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  public readonly name: string;

  @IsEmail()
  public readonly email: string;

  @IsString()
  @MinLength(6)
  public readonly password: string;
} 