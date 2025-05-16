export interface Reaction {
  userId: string;
  type: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  reactions?: Reaction[];
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  editedByAdmin?: boolean;
} 