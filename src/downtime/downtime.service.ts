import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class DowntimeService {
  private readonly logger = new Logger(DowntimeService.name);
  private readonly DOWNTIME_DOC_ID = 'status';

  constructor(private readonly firebaseService: FirebaseService) {}

  public async setIsDowntime(isDowntime: boolean): Promise<{ isDowntime: boolean }> {
    this.logger.log(`Setting downtime status to: ${isDowntime}`);
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection('downtime').doc(this.DOWNTIME_DOC_ID);
    await docRef.set(
      {
        isDowntime,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    this.logger.log(`Downtime status successfully set to: ${isDowntime}`);
    return { isDowntime };
  }

  public async getIsDowntime(): Promise<boolean> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection('downtime').doc(this.DOWNTIME_DOC_ID);
    const doc = await docRef.get();
    if (!doc.exists) {
      return false;
    }
    const data = doc.data();
    return data?.isDowntime || false;
  }
}

