import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LegalDocumentType } from '../../domain/entities/legal-document.entity';

export class CreateLegalDocumentDto {
  @ApiProperty({
    description: 'Type of legal document',
    enum: LegalDocumentType,
    example: LegalDocumentType.IMPRESSUM,
  })
  @IsEnum(LegalDocumentType)
  @IsNotEmpty()
  type: LegalDocumentType;

  @ApiProperty({
    description: 'Content of the legal document in Markdown format',
    example: '# Impressum\n\nDies ist der Inhalt...',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
