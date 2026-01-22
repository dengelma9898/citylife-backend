import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class RegisterFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  public readonly token: string;

  @IsString()
  @IsNotEmpty()
  public readonly deviceId: string;

  @IsIn(['ios', 'android', 'web'])
  public readonly platform: 'ios' | 'android' | 'web';
}
