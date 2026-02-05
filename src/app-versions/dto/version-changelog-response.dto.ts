import { ApiProperty } from '@nestjs/swagger';

export class VersionChangelogResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the changelog',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'App version in format X.Y.Z',
    example: '1.2.3',
  })
  version: string;

  @ApiProperty({
    description: 'Changelog content in Markdown format',
    example: '# Version 1.2.3\n\n- New feature A\n- Bug fix B',
  })
  content: string;

  @ApiProperty({
    description: 'Creation timestamp in ISO 8601 format',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp in ISO 8601 format',
    example: '2024-01-20T14:45:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'User ID of the creator',
    example: 'user123',
  })
  createdBy: string;
}
