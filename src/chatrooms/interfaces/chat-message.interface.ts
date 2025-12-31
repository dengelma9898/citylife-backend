export interface Reaction {
  userId: string;
  type: string;
}

export interface ChatMessage {
  id: string;
  /**
   * @deprecated Use isEditable instead. This property will be removed in a future version.
   */
  senderId: string;
  senderName: string;
  content: string;
  isEditable: boolean; // Indicates if the current user can edit this message
  reactions?: Reaction[];
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  editedByAdmin?: boolean;
}
