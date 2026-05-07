import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSpecialPollHighlightDto {
  @ApiProperty({ description: 'Ob die Umfrage hervorgehoben wird' })
  @IsBoolean()
  @IsNotEmpty()
  readonly isHighlighted: boolean;
}
