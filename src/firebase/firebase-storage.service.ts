import { Injectable, Logger } from '@nestjs/common';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

@Injectable()
export class FirebaseStorageService {
  private readonly logger = new Logger(FirebaseStorageService.name);

  public async uploadFile(file: Express.Multer.File, path: string): Promise<string> {
    this.logger.debug(`Uploading file to ${path}`);
    const storage = getStorage();
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file.buffer);
    const downloadUrl = await getDownloadURL(storageRef);

    this.logger.debug(`File uploaded successfully, URL: ${downloadUrl}`);
    return downloadUrl;
  }

  public async deleteFile(url: string): Promise<void> {
    try {
      this.logger.debug(`Deleting file from URL: ${url}`);
      const storage = getStorage();
      console.log(storage);
      const fileRef = ref(storage, url);
      console.log(fileRef);
      await deleteObject(fileRef);
      this.logger.debug('File deleted successfully');
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
    }
  }
}
