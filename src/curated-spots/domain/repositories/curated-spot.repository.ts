import { CuratedSpot } from '../entities/curated-spot.entity';

export const CURATED_SPOT_REPOSITORY = 'CURATED_SPOT_REPOSITORY';

export interface CuratedSpotRepository {
  findAll(): Promise<CuratedSpot[]>;
  findById(id: string): Promise<CuratedSpot | null>;
  findAllActiveNotDeleted(): Promise<CuratedSpot[]>;
  findActiveNotDeletedByKeywordContains(keywordId: string): Promise<CuratedSpot[]>;
  findActiveNotDeletedByNameLowerPrefix(nameLowerPrefix: string): Promise<CuratedSpot[]>;
  create(spot: CuratedSpot): Promise<CuratedSpot>;
  update(id: string, spot: CuratedSpot): Promise<CuratedSpot>;
}
