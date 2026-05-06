import { BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import { VideoFileValidationPipe } from './video-file-validation.pipe';

describe('VideoFileValidationPipe', () => {
  let pipe: VideoFileValidationPipe;

  const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'clip.mp4',
    encoding: '7bit',
    mimetype: 'video/mp4',
    buffer: Buffer.from('x'),
    size: 1024,
    destination: '',
    filename: '',
    path: '',
    stream: new Readable(),
    ...overrides,
  });

  beforeEach(() => {
    pipe = new VideoFileValidationPipe({ optional: false });
  });

  it('should accept MP4 under 10MB', () => {
    const file = createMockFile({ mimetype: 'video/mp4', size: 9 * 1024 * 1024 });
    expect(pipe.transform(file, { type: 'custom' })).toBe(file);
  });

  it('should accept mime with codec suffix', () => {
    const file = createMockFile({ mimetype: 'video/mp4; codecs="avc1.42E01E"', size: 100 });
    expect(pipe.transform(file, { type: 'custom' })).toBe(file);
  });

  it('should accept WebM and QuickTime', () => {
    expect(
      pipe.transform(createMockFile({ mimetype: 'video/webm', size: 100 }), { type: 'custom' }),
    ).toBeDefined();
    expect(
      pipe.transform(createMockFile({ mimetype: 'video/quicktime', size: 100 }), {
        type: 'custom',
      }),
    ).toBeDefined();
  });

  it('should accept M4V', () => {
    const file = createMockFile({ mimetype: 'video/x-m4v', size: 100 });
    expect(pipe.transform(file, { type: 'custom' })).toBe(file);
  });

  it('should reject image mime', () => {
    const file = createMockFile({ mimetype: 'image/jpeg', size: 100 });
    expect(() => pipe.transform(file, { type: 'custom' })).toThrow(BadRequestException);
  });

  it('should reject file over 10MB', () => {
    const file = createMockFile({ mimetype: 'video/mp4', size: 10 * 1024 * 1024 + 1 });
    expect(() => pipe.transform(file, { type: 'custom' })).toThrow(BadRequestException);
  });

  it('should accept file exactly at 10MB', () => {
    const file = createMockFile({ mimetype: 'video/mp4', size: 10 * 1024 * 1024 });
    expect(pipe.transform(file, { type: 'custom' })).toBe(file);
  });

  it('should throw when file missing and not optional', () => {
    expect(() => pipe.transform(undefined as unknown as Express.Multer.File, { type: 'custom' })).toThrow(
      BadRequestException,
    );
  });

  it('should return undefined when file missing and optional', () => {
    const optionalPipe = new VideoFileValidationPipe({ optional: true });
    expect(optionalPipe.transform(undefined as unknown as Express.Multer.File, { type: 'custom' })).toBe(
      undefined,
    );
  });
});
