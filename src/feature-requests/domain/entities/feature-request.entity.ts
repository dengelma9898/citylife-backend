import { FeatureRequestStatus } from '../enums/feature-request-status.enum';

export interface FeatureRequestVoteProps {
  userId: string;
  votedAt: string;
}

export interface FeatureRequestCompletionProps {
  completedBy: string;
  completedAt: string;
  comment: string;
}

export interface FeatureRequestProps {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  authorId: string;
  status: FeatureRequestStatus;
  votes: FeatureRequestVoteProps[];
  completion: FeatureRequestCompletionProps | null;
  createdAt: string;
  updatedAt: string;
}

export class FeatureRequest {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrls: string[];
  readonly authorId: string;
  readonly status: FeatureRequestStatus;
  readonly votes: FeatureRequestVoteProps[];
  readonly completion: FeatureRequestCompletionProps | null;
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: FeatureRequestProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.imageUrls = props.imageUrls;
    this.authorId = props.authorId;
    this.status = props.status;
    this.votes = props.votes;
    this.completion = props.completion;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<FeatureRequestProps, 'id' | 'createdAt' | 'updatedAt' | 'votes' | 'completion' | 'status'>,
  ): FeatureRequest {
    const now = new Date().toISOString();
    return new FeatureRequest({
      id: crypto.randomUUID(),
      ...props,
      status: FeatureRequestStatus.OPEN,
      votes: [],
      completion: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromProps(props: FeatureRequestProps): FeatureRequest {
    return new FeatureRequest(props);
  }

  update(props: Partial<Omit<FeatureRequestProps, 'id' | 'createdAt'>>): FeatureRequest {
    return new FeatureRequest({
      ...this,
      ...props,
      updatedAt: new Date().toISOString(),
    });
  }

  addVote(userId: string): FeatureRequest {
    const hasVoted = this.votes.some(vote => vote.userId === userId);
    if (hasVoted) {
      return this;
    }
    const newVote: FeatureRequestVoteProps = {
      userId,
      votedAt: new Date().toISOString(),
    };
    return this.update({
      votes: [...this.votes, newVote],
    });
  }

  removeVote(userId: string): FeatureRequest {
    const filteredVotes = this.votes.filter(vote => vote.userId !== userId);
    return this.update({
      votes: filteredVotes,
    });
  }

  hasUserVoted(userId: string): boolean {
    return this.votes.some(vote => vote.userId === userId);
  }

  get voteCount(): number {
    return this.votes.length;
  }

  complete(completedBy: string, comment: string): FeatureRequest {
    return this.update({
      status: FeatureRequestStatus.COMPLETED,
      completion: {
        completedBy,
        completedAt: new Date().toISOString(),
        comment,
      },
    });
  }

  reject(completedBy: string, comment: string): FeatureRequest {
    return this.update({
      status: FeatureRequestStatus.REJECTED,
      completion: {
        completedBy,
        completedAt: new Date().toISOString(),
        comment,
      },
    });
  }

  setInProgress(): FeatureRequest {
    return this.update({
      status: FeatureRequestStatus.IN_PROGRESS,
    });
  }

  toJSON(): FeatureRequestProps {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      imageUrls: this.imageUrls,
      authorId: this.authorId,
      status: this.status,
      votes: this.votes,
      completion: this.completion,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

