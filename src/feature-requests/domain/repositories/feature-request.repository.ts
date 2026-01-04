import { FeatureRequest } from '../entities/feature-request.entity';
import { FeatureRequestStatus } from '../enums/feature-request-status.enum';

export const FEATURE_REQUEST_REPOSITORY = 'FEATURE_REQUEST_REPOSITORY';

export interface FeatureRequestRepository {
  findAll(): Promise<FeatureRequest[]>;
  findById(id: string): Promise<FeatureRequest | null>;
  findByStatus(status: FeatureRequestStatus): Promise<FeatureRequest[]>;
  findByAuthorId(authorId: string): Promise<FeatureRequest[]>;
  create(featureRequest: FeatureRequest): Promise<FeatureRequest>;
  update(id: string, featureRequest: FeatureRequest): Promise<FeatureRequest>;
  delete(id: string): Promise<void>;
}

