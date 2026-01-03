import { BadRequestException } from '@nestjs/common';
import { NewsFileValidationPipe } from './news-file-validation.pipe';
import { Readable } from 'stream';

describe('NewsFileValidationPipe', () => {
  let pipe: NewsFileValidationPipe;

  const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: 'images',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('test'),
    size: 1024,
    destination: '',
    filename: '',
    path: '',
    stream: new Readable(),
    ...overrides,
  });

  beforeEach(() => {
    pipe = new NewsFileValidationPipe();
  });

  describe('file validation', () => {
    it('should accept valid JPEG file under 5MB', () => {
      const file = createMockFile({
        mimetype: 'image/jpeg',
        size: 4 * 1024 * 1024, // 4MB
      });

      const result = pipe.transform(file, { type: 'body' });

      expect(result).toBe(file);
    });

    it('should accept valid PNG file under 5MB', () => {
      const file = createMockFile({
        mimetype: 'image/png',
        size: 3 * 1024 * 1024, // 3MB
      });

      const result = pipe.transform(file, { type: 'body' });

      expect(result).toBe(file);
    });

    it('should accept file exactly at 5MB limit', () => {
      const file = createMockFile({
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024, // exactly 5MB
      });

      const result = pipe.transform(file, { type: 'body' });

      expect(result).toBe(file);
    });

    it('should reject file larger than 5MB', () => {
      const file = createMockFile({
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024 + 1, // 5MB + 1 byte
      });

      expect(() => pipe.transform(file, { type: 'body' })).toThrow(BadRequestException);
      expect(() => pipe.transform(file, { type: 'body' })).toThrow('File too large. Maximum size is 5MB');
    });

    it('should reject file with invalid mime type', () => {
      const file = createMockFile({
        mimetype: 'application/pdf',
        size: 1024,
      });

      expect(() => pipe.transform(file, { type: 'body' })).toThrow(BadRequestException);
      expect(() => pipe.transform(file, { type: 'body' })).toThrow('Invalid file type. Only JPG and PNG allowed');
    });

    it('should reject GIF files', () => {
      const file = createMockFile({
        mimetype: 'image/gif',
        size: 1024,
      });

      expect(() => pipe.transform(file, { type: 'body' })).toThrow(BadRequestException);
    });

    it('should reject WebP files', () => {
      const file = createMockFile({
        mimetype: 'image/webp',
        size: 1024,
      });

      expect(() => pipe.transform(file, { type: 'body' })).toThrow(BadRequestException);
    });
  });

  describe('optional file handling', () => {
    it('should throw BadRequestException when no file provided and not optional', () => {
      const pipeRequired = new NewsFileValidationPipe({ optional: false });

      expect(() => pipeRequired.transform(undefined as any, { type: 'body' })).toThrow(BadRequestException);
      expect(() => pipeRequired.transform(undefined as any, { type: 'body' })).toThrow('No file provided');
    });

    it('should return undefined when no file provided but optional', () => {
      const pipeOptional = new NewsFileValidationPipe({ optional: true });

      const result = pipeOptional.transform(undefined as any, { type: 'body' });

      expect(result).toBeUndefined();
    });

    it('should return file with undefined originalname when optional', () => {
      const pipeOptional = new NewsFileValidationPipe({ optional: true });
      const file = createMockFile({ originalname: undefined as any });

      const result = pipeOptional.transform(file, { type: 'body' });

      expect(result).toBe(file);
    });
  });

  describe('5MB limit comparison with original 1MB pipe', () => {
    it('should accept 2MB file (would fail in original 1MB pipe)', () => {
      const file = createMockFile({
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024, // 2MB
      });

      const result = pipe.transform(file, { type: 'body' });

      expect(result).toBe(file);
    });

    it('should accept 4.9MB file (would fail in original 1MB pipe)', () => {
      const file = createMockFile({
        mimetype: 'image/jpeg',
        size: 4.9 * 1024 * 1024, // 4.9MB
      });

      const result = pipe.transform(file, { type: 'body' });

      expect(result).toBe(file);
    });
  });
});

