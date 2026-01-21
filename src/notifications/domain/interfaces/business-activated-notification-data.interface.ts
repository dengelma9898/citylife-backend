export interface BusinessActivatedNotificationData {
  type: 'BUSINESS_ACTIVATED';
  businessId: string;
  businessName: string;
  previousStatus: 'PENDING';
  newStatus: 'ACTIVE';
}
