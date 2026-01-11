export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface DirectChatNotificationData {
  type: 'DIRECT_CHAT_MESSAGE';
  chatId: string;
  senderId: string;
  senderName: string;
  messageId: string;
}
