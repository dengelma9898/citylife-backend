export interface DirectChatRequestNotificationData {
  type: 'DIRECT_CHAT_REQUEST';
  chatId: string;
  senderId: string;
  senderName: string;
}
