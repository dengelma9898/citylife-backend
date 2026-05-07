/**
 * Persisted-only legacy values in Firestore. Normalized to {@link SpecialPollStatus.ACTIVE} on read.
 */
export const LEGACY_SPECIAL_POLL_STATUS_CLOSED = 'CLOSED' as const;

export const LEGACY_SPECIAL_POLL_STATUS_PENDING = 'PENDING' as const;

export type SpecialPollStoredStatus =
  | SpecialPollStatus
  | typeof LEGACY_SPECIAL_POLL_STATUS_CLOSED
  | typeof LEGACY_SPECIAL_POLL_STATUS_PENDING;

export enum SpecialPollStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface SpecialPollResponse {
  readonly id: string;
  readonly userId: string;
  readonly userName: string;
  readonly response: string;
  readonly createdAt: string;
  readonly upvotedUserIds: readonly string[];
}

export interface SpecialPoll {
  readonly id: string;
  readonly title: string;
  readonly responses: readonly SpecialPollResponse[];
  readonly status: SpecialPollStatus;
  readonly isHighlighted: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
