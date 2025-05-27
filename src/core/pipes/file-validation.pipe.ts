import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';

export interface FileValidationOptions {
  optional?: boolean;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly logger = new Logger(FileValidationPipe.name);
  private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
  private readonly options: FileValidationOptions;

  constructor(options: FileValidationOptions = {}) {
    this.options = options;
  }

  transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
    this.logger.debug(`Validating file: ${file}`);
    this.logger.debug(`Validating file: ${file?.originalname}`);

    if (!file || file.originalname === undefined) {
      if (this.options.optional) {
        this.logger.debug('No file provided, but file is optional');
        return file;
      }

      this.logger.error('File validation failed: No file provided');
      throw new BadRequestException('No file provided');
    }

    this.logger.debug(`File type: ${file.mimetype}, size: ${file.size} bytes`);

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      this.logger.error(`File validation failed: Invalid mime type ${file.mimetype}`);
      throw new BadRequestException('Invalid file type. Only JPG and PNG allowed');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      this.logger.error(
        `File validation failed: File size ${file.size} exceeds limit of ${this.MAX_FILE_SIZE}`,
      );
      throw new BadRequestException('File too large. Maximum size is 1MB');
    }

    this.logger.debug('File validation successful');
    return file;
  }
}
