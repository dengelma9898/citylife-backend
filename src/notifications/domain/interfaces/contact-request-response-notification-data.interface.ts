export interface ContactRequestResponseNotificationData {
  type: 'CONTACT_REQUEST_RESPONSE';
  contactRequestId: string;
  requestType: 'GENERAL' | 'FEEDBACK' | 'BUSINESS_CLAIM' | 'BUSINESS_REQUEST';
}
