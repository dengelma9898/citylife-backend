export interface Chatroom {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  participants: string[]; // Array of user IDs
  lastMessage?: {
    content: string;
    authorId: string;
    sentAt: string;
  };
  createdAt: string;
  updatedAt: string;
} 