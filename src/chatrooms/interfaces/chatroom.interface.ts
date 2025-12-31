export interface Chatroom {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdBy: string; // User ID des Erstellers
  /**
   * @deprecated Use participantCount instead. This property will be removed in a future version.
   */
  participants: string[]; // Array of user IDs
  participantCount: number; // Number of participants in the chatroom
  lastMessage?: {
    content: string;
    authorId: string;
    sentAt: string;
  };
  createdAt: string;
  updatedAt: string;
}
