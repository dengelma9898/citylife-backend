export interface Chatroom {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdBy: string; // User ID des Erstellers
  participants: string[]; // Array of user IDs
  lastMessage?: {
    content: string;
    authorId: string;
    sentAt: string;
  };
  createdAt: string;
  updatedAt: string;
}
