export interface BusinessContactRequestResponseNotificationData {
  type: 'BUSINESS_CONTACT_REQUEST_RESPONSE';
  contactRequestId: string;
  requestType: 'BUSINESS_CLAIM' | 'BUSINESS_REQUEST';
  businessId?: string;
  businessName?: string;
}
