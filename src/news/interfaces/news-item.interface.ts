export interface Reaction {
  userId: string;
  type: string;
}

export interface BaseNewsItem {
  id: string;
  type: 'text' | 'image' | 'poll' | 'audio' | 'survey';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  authorName?: string;
  authorImageUrl?: string;
  reactions?: Reaction[];
  views?: number;
}

export interface TextNewsItem extends BaseNewsItem {
  type: 'text';
  content: string;
}

export interface ImageNewsItem extends BaseNewsItem {
  type: 'image';
  imageUrls: string[];
  content: string;
}

export interface PollOption {
  id: string;
  text: string;
  voters: string[]; // Array of user IDs who voted for this option
}

export interface PollNewsItem extends BaseNewsItem {
  type: 'poll';
  question: string;
  options: PollOption[];
  expiresAt?: string; // ISO date string for when the poll expires
  allowMultipleAnswers: boolean;
  votes: number;
}

// Union type for all news item types
export type NewsItem = TextNewsItem | ImageNewsItem | PollNewsItem; 