import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVersionChangelogDto {
  @ApiProperty({
    description: 'App version in format X.Y.Z',
    example: '1.2.3',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+\.\d+\.\d+$/, {
    message: 'Version must be in format X.Y.Z (e.g., 1.2.3)',
  })
  version: string;

  @ApiProperty({
    description: 'Changelog content in Markdown format',
    example: '# Version 1.2.3\n\n- New feature A\n- Bug fix B',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
