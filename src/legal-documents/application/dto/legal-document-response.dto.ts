import { ApiProperty } from '@nestjs/swagger';
import { LegalDocumentType } from '../../domain/entities/legal-document.entity';

export class LegalDocumentResponseDto {
  @ApiProperty({
    description: 'Eindeutige ID des Rechtsdokuments',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  readonly id: string;

  @ApiProperty({
    description: 'Typ des Rechtsdokuments',
    enum: LegalDocumentType,
    example: LegalDocumentType.IMPRESSUM,
  })
  readonly type: LegalDocumentType;

  @ApiProperty({
    description: 'Inhalt des Rechtsdokuments im Markdown Format',
    example: '# Impressum\n\nDies ist der Inhalt...',
  })
  readonly content: string;

  @ApiProperty({
    description: 'Versionsnummer des Rechtsdokuments',
    example: 1,
  })
  readonly version: number;

  @ApiProperty({
    description: 'Erstellungsdatum (ISO 8601 Format)',
    example: '2024-11-01T10:00:00.000Z',
  })
  readonly createdAt: string;

  @ApiProperty({
    description: 'ID des Benutzers, der das Dokument erstellt hat',
    example: 'user123',
  })
  readonly createdBy: string;

  @ApiProperty({
    description: 'Gibt an, ob dieses Dokument aktiv ist',
    example: true,
  })
  readonly isActive: boolean;
}
