export type DirectChatStatus = 'pending' | 'active';

export interface LastMessage {
  content: string;
  senderId: string;
  sentAt: string;
}

export interface DirectChat {
  id: string;
  creatorId: string;
  invitedUserId: string;
  creatorConfirmed: boolean;
  invitedConfirmed: boolean;
  status: DirectChatStatus;
  lastMessage?: LastMessage;
  mutedBy?: string[];
  createdAt: string;
  updatedAt: string;
}
