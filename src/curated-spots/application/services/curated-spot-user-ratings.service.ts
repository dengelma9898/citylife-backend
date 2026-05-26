import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { CuratedSpotStatus } from '../../domain/enums/curated-spot-status.enum';

export interface CuratedSpotUserRatingView {
  readonly score: number;
  readonly ratedAt: string;
}

/**
 * Persists one user rating per spot (subcollection) and updates aggregate fields on the spot document.
 */
@Injectable()
export class CuratedSpotUserRatingsService {
  private readonly spotsCollection = 'curatedSpots';
  private readonly userRatingsSubcollection = 'userRatings';

  constructor(private readonly firebaseService: FirebaseService) {}

  public async getMyRating(
    spotId: string,
    userId: string,
  ): Promise<CuratedSpotUserRatingView | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db
      .collection(this.spotsCollection)
      .doc(spotId)
      .collection(this.userRatingsSubcollection)
      .doc(userId)
      .get();
    if (!doc.exists) {
      return null;
    }
    const raw = doc.data() as Record<string, unknown>;
    return {
      score: Number(raw.score),
      ratedAt: String(raw.ratedAt ?? ''),
    };
  }

  public async submitOnce(
    spotId: string,
    userId: string,
    score: number,
  ): Promise<CuratedSpotUserRatingView> {
    const ratedAt = new Date().toISOString();
    const db = this.firebaseService.getFirestore();
    const spotRef = db.collection(this.spotsCollection).doc(spotId);
    const userRatingRef = spotRef.collection(this.userRatingsSubcollection).doc(userId);
    await db.runTransaction(async transaction => {
      const spotSnap = await transaction.get(spotRef);
      const ratingSnap = await transaction.get(userRatingRef);
      if (!spotSnap.exists) {
        throw new NotFoundException('Curated spot not found');
      }
      const spotData = spotSnap.data() as Record<string, unknown>;
      if (spotData.isDeleted === true || spotData.status !== CuratedSpotStatus.ACTIVE) {
        throw new NotFoundException('Curated spot not found');
      }
      if (ratingSnap.exists) {
        throw new ConflictException('User rating already submitted for this spot');
      }
      const countRaw = spotData.userRatingCount;
      const count = typeof countRaw === 'number' ? countRaw : Number(countRaw) || 0;
      const avgRaw = spotData.userRatingAverage;
      const avg =
        avgRaw === null || avgRaw === undefined
          ? null
          : typeof avgRaw === 'number'
            ? avgRaw
            : Number(avgRaw);
      const newCount = count + 1;
      const newAvg =
        count === 0 || avg === null || Number.isNaN(avg) ? score : (avg * count + score) / newCount;
      transaction.set(userRatingRef, { score, ratedAt });
      transaction.update(spotRef, {
        userRatingAverage: newAvg,
        userRatingCount: newCount,
        updatedAt: ratedAt,
      });
    });
    return { score, ratedAt };
  }
}
