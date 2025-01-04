export interface Message {
  id: string;
  cityId: string;
  chatroomId: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  editedAt: string | null;
  readBy: string[];
} 