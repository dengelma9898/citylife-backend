export interface Reaction {
  userId: string;
  type: string;
}

export interface DirectMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  imageUrl?: string;
  isEditable: boolean;
  reactions?: Reaction[];
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
}
