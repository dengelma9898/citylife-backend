import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FirebaseStorageService } from './firebase-storage.service';

const mockDelete = jest.fn();
const mockFile = jest.fn().mockReturnValue({ delete: mockDelete });
const mockBucket = jest.fn().mockReturnValue({ name: 'test-bucket', file: mockFile });

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({
    bucket: mockBucket,
  })),
}));

describe('FirebaseStorageService', () => {
  let service: FirebaseStorageService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-bucket'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FirebaseStorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();
    service = module.get<FirebaseStorageService>(FirebaseStorageService);
    jest.clearAllMocks();
    mockDelete.mockResolvedValue(undefined);
  });

  describe('deleteFile', () => {
    it('should extract path from storage.googleapis.com URL without bucket name', async () => {
      await service.deleteFile('https://storage.googleapis.com/test-bucket/images/logo.png');
      expect(mockFile).toHaveBeenCalledWith('images/logo.png');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should extract path from firebasestorage.googleapis.com URL', async () => {
      await service.deleteFile(
        'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/profile-pictures%2Fuser1%2Fpic.jpg?alt=media&token=abc',
      );
      expect(mockFile).toHaveBeenCalledWith('profile-pictures/user1/pic.jpg');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should use raw path when URL is already a storage path', async () => {
      await service.deleteFile('businesses/business1/logo/file.png');
      expect(mockFile).toHaveBeenCalledWith('businesses/business1/logo/file.png');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should throw for invalid storage.googleapis.com URL', async () => {
      await expect(service.deleteFile('https://storage.googleapis.com/')).rejects.toThrow(
        'Invalid storage URL format',
      );
    });

    it('should not throw when file does not exist (404)', async () => {
      mockDelete.mockRejectedValue({ code: 404 });
      await expect(
        service.deleteFile('https://storage.googleapis.com/test-bucket/missing.png'),
      ).resolves.toBeUndefined();
    });
  });
});
