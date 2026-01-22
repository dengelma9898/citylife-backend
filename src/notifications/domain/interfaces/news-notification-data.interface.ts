export interface NewsNotificationData {
  type: 'NEW_NEWS';
  newsId: string;
  newsTitle: string;
  categoryId?: string;
}
