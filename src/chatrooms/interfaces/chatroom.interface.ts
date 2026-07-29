export interface Chatroom {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdBy: string;
  /**
   * @deprecated Use participantCount instead. This property will be removed in a future version.
   */
  participants: string[];
  participantCount: number;
  lastMessage?: {
    content: string;
    authorId: string;
    sentAt: string;
  };
  createdAt: string;
  updatedAt: string;
}
