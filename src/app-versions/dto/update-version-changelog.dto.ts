import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVersionChangelogDto {
  @ApiProperty({
    description: 'Changelog content in Markdown format',
    example: '# Version 1.2.3\n\n- New feature A\n- Bug fix B\n- Additional change C',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
