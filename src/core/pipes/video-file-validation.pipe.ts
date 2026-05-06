import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';

export interface VideoFileValidationOptions {
  optional?: boolean;
}

/**
 * Validates multipart video uploads (MIME whitelist and max size).
 */
@Injectable()
export class VideoFileValidationPipe implements PipeTransform {
  private readonly logger = new Logger(VideoFileValidationPipe.name);
  private readonly maxFileSizeBytes = 10 * 1024 * 1024;
  private readonly allowedMimeTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v',
  ];
  private readonly options: VideoFileValidationOptions;

  constructor(options: VideoFileValidationOptions = {}) {
    this.options = options;
  }

  transform(file: Express.Multer.File, _metadata: ArgumentMetadata) {
    this.logger.debug(`Validating video file: ${file?.originalname}`);
    if (!file || file.originalname === undefined) {
      if (this.options.optional) {
        this.logger.debug('No video file provided, but file is optional');
        return file;
      }
      this.logger.error('Video validation failed: No file provided');
      throw new BadRequestException('No file provided');
    }
    const mimePrimary = String(file.mimetype ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    this.logger.debug(`Video file type: ${mimePrimary}, size: ${file.size} bytes`);
    if (!this.allowedMimeTypes.includes(mimePrimary)) {
      this.logger.error(`Video validation failed: Invalid mime type ${mimePrimary}`);
      throw new BadRequestException(
        'Invalid file type. Allowed video types: MP4, WebM, QuickTime (MOV), M4V',
      );
    }
    if (file.size > this.maxFileSizeBytes) {
      this.logger.error(
        `Video validation failed: File size ${file.size} exceeds limit of ${this.maxFileSizeBytes}`,
      );
      throw new BadRequestException('File too large. Maximum size is 10MB');
    }
    this.logger.debug('Video file validation successful');
    return file;
  }
}
