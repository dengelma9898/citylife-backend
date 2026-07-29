import { FeatureRequestStatus } from '../domain/enums/feature-request-status.enum';

export interface FeatureRequestVote {
  userId: string;
  votedAt: string;
}

export interface FeatureRequestCompletion {
  completedBy: string;
  completedAt: string;
  comment: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  authorId: string;
  status: FeatureRequestStatus;
  votes: FeatureRequestVote[];
  completion: FeatureRequestCompletion | null;
  createdAt: string;
  updatedAt: string;
}

export function getFeatureRequestVoteCount(request: FeatureRequest): number {
  return request.votes.length;
}

export function hasUserVotedForFeatureRequest(request: FeatureRequest, userId: string): boolean {
  return request.votes.some(vote => vote.userId === userId);
}

export function addFeatureRequestVote(request: FeatureRequest, userId: string): FeatureRequest {
  if (hasUserVotedForFeatureRequest(request, userId)) {
    return request;
  }
  return {
    ...request,
    votes: [...request.votes, { userId, votedAt: new Date().toISOString() }],
    updatedAt: new Date().toISOString(),
  };
}

export function removeFeatureRequestVote(request: FeatureRequest, userId: string): FeatureRequest {
  return {
    ...request,
    votes: request.votes.filter(vote => vote.userId !== userId),
    updatedAt: new Date().toISOString(),
  };
}

export function setFeatureRequestInProgress(request: FeatureRequest): FeatureRequest {
  return {
    ...request,
    status: FeatureRequestStatus.IN_PROGRESS,
    updatedAt: new Date().toISOString(),
  };
}

export function completeFeatureRequest(
  request: FeatureRequest,
  completedBy: string,
  comment: string,
): FeatureRequest {
  return {
    ...request,
    status: FeatureRequestStatus.COMPLETED,
    completion: {
      completedBy,
      completedAt: new Date().toISOString(),
      comment,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function rejectFeatureRequest(
  request: FeatureRequest,
  completedBy: string,
  comment: string,
): FeatureRequest {
  return {
    ...request,
    status: FeatureRequestStatus.REJECTED,
    completion: {
      completedBy,
      completedAt: new Date().toISOString(),
      comment,
    },
    updatedAt: new Date().toISOString(),
  };
}
