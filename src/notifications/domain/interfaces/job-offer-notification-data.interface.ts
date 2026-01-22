export interface JobOfferNotificationData {
  type: 'NEW_JOB_OFFER';
  jobOfferId: string;
  jobTitle: string;
  jobOfferCategoryId: string;
}
