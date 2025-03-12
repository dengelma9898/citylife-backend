import { Injectable, Logger } from '@nestjs/common';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';


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
} 