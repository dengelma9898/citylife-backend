import { FeatureRequestStatus } from '../domain/enums/feature-request-status.enum';

export interface FeatureRequestVoteDto {
  userId: string;
  votedAt: string;
}

export interface FeatureRequestCompletionDto {
  completedBy: string;
  completedAt: string;
  comment: string;
}

export class FeatureRequestDto {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  authorId: string;
  status: FeatureRequestStatus;
  voteCount: number;
  hasUserVoted: boolean;
  completion: FeatureRequestCompletionDto | null;
  createdAt: string;
  updatedAt: string;
}

