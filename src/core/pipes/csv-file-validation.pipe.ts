import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';

/**
 * Validation Pipe für CSV-Datei-Uploads
 * Prüft MIME-Type und Dateigröße
 */
@Injectable()
export class CsvFileValidationPipe implements PipeTransform {
  private readonly logger = new Logger(CsvFileValidationPipe.name);
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIME_TYPES = [
    'text/csv',
    'application/vnd.ms-excel',
    'text/plain',
  ];

  transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
    this.logger.debug(`Validating CSV file: ${file?.originalname}`);
    if (!file || file.originalname === undefined) {
      this.logger.error('CSV file validation failed: No file provided');
      throw new BadRequestException('Keine CSV-Datei hochgeladen');
    }
    if (!this.isValidMimeType(file)) {
      this.logger.error(`CSV file validation failed: Invalid mime type ${file.mimetype}`);
      throw new BadRequestException(
        'Ungültiger Dateityp. Nur CSV-Dateien sind erlaubt (.csv)',
      );
    }
    if (file.size > this.MAX_FILE_SIZE) {
      this.logger.error(
        `CSV file validation failed: File size ${file.size} exceeds limit of ${this.MAX_FILE_SIZE}`,
      );
      throw new BadRequestException('Datei zu groß. Maximale Größe ist 5MB');
    }
    this.logger.debug('CSV file validation successful');
    return file;
  }

  private isValidMimeType(file: Express.Multer.File): boolean {
    if (this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return true;
    }
    // Fallback: Prüfe Dateiendung, da MIME-Types bei CSV nicht immer korrekt sind
    return file.originalname?.toLowerCase().endsWith('.csv') ?? false;
  }
}
