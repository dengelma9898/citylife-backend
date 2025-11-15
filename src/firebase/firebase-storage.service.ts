import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseStorageService {
  private readonly logger = new Logger(FirebaseStorageService.name);
  private bucket: any;

  constructor(private configService: ConfigService) {}

  private getBucket(): any {
    if (!this.bucket) {
      const storageBucket = this.configService.get<string>('FIREBASE_STORAGE_BUCKET');
      if (!storageBucket) {
        throw new Error('FIREBASE_STORAGE_BUCKET environment variable is not set');
      }
      this.bucket = admin.storage().bucket(storageBucket);
    }
    return this.bucket;
  }

  public async uploadFile(file: Express.Multer.File, path: string): Promise<string> {
    try {
      this.logger.debug(`Uploading file to ${path}`);
      const bucket = this.getBucket();
      const fileRef = bucket.file(path);

      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
        },
      });

      // Make file publicly accessible and get download URL
      await fileRef.makePublic();
      const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

      this.logger.debug(`File uploaded successfully, URL: ${downloadUrl}`);
      return downloadUrl;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  public async deleteFile(url: string): Promise<void> {
    try {
      this.logger.debug(`Deleting file from URL: ${url}`);

      // Extract path from URL
      // URL formats:
      // - https://storage.googleapis.com/bucket-name/path/to/file
      // - https://firebasestorage.googleapis.com/v0/b/bucket-name/o/path%2Fto%2Ffile?alt=media&token=...
      let path: string;

      if (url.includes('storage.googleapis.com')) {
        // Format: https://storage.googleapis.com/bucket-name/path/to/file
        const urlParts = url.split('/');
        const bucketIndex = urlParts.findIndex(part => part.includes('.googleapis.com'));

        if (bucketIndex === -1) {
          throw new Error('Invalid storage URL format');
        }

        path = urlParts.slice(bucketIndex + 1).join('/');
      } else if (url.includes('firebasestorage.googleapis.com')) {
        // Format: https://firebasestorage.googleapis.com/v0/b/bucket-name/o/path%2Fto%2Ffile?alt=media&token=...
        const match = url.match(/\/o\/([^?]+)/);
        if (!match) {
          throw new Error('Invalid Firebase Storage URL format');
        }
        path = decodeURIComponent(match[1]);
      } else {
        // Assume it's already a path
        path = url;
      }

      const bucket = this.getBucket();
      const fileRef = bucket.file(path);
      await fileRef.delete();
      this.logger.debug('File deleted successfully');
    } catch (error: any) {
      // If file doesn't exist, that's okay - don't throw error
      if (error.code === 404 || error.code === 'storage/object-not-found') {
        this.logger.debug('File not found, skipping deletion');
        return;
      }
      this.logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }
}
