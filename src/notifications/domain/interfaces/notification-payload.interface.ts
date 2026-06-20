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

export interface DirectChatRequestNotificationData {
  type: 'DIRECT_CHAT_REQUEST';
  chatId: string;
  senderId: string;
  senderName: string;
}

export interface ContactRequestResponseNotificationData {
  type: 'CONTACT_REQUEST_RESPONSE';
  contactRequestId: string;
  requestType: 'GENERAL' | 'FEEDBACK' | 'BUSINESS_CLAIM' | 'BUSINESS_REQUEST';
}

export interface BusinessNotificationData {
  type: 'NEW_BUSINESS';
  businessId: string;
  businessName: string;
}

export interface BusinessActivatedNotificationData {
  type: 'BUSINESS_ACTIVATED';
  businessId: string;
  businessName: string;
  previousStatus: 'PENDING';
  newStatus: 'ACTIVE';
}

export interface BusinessContactRequestResponseNotificationData {
  type: 'BUSINESS_CONTACT_REQUEST_RESPONSE';
  contactRequestId: string;
  requestType: 'BUSINESS_CLAIM' | 'BUSINESS_REQUEST';
  businessId?: string;
  businessName?: string;
}

export interface EventNotificationData {
  type: 'NEW_EVENT';
  eventId: string;
  eventTitle: string;
  categoryId: string;
}

export interface FavEventUpdateNotificationData {
  type: 'FAV_EVENT_UPDATE';
  eventId: string;
  eventTitle: string;
  updateType: 'TIME' | 'LOCATION' | 'DESCRIPTION' | 'OTHER';
}

export interface JobOfferNotificationData {
  type: 'NEW_JOB_OFFER';
  jobOfferId: string;
  jobTitle: string;
  jobOfferCategoryId: string;
}

export interface NewsNotificationData {
  type: 'NEW_NEWS';
  newsId: string;
  newsTitle: string;
  categoryId?: string;
}

export interface SurveyNotificationData {
  type: 'NEW_SURVEY';
  surveyId: string;
  surveyTitle: string;
  categoryId?: string;
}

export interface EasterEggHuntWinnerNotificationData {
  type: 'EASTER_EGG_HUNT_WINNER';
  eggId: string;
  eggTitle: string;
  prizeDescription: string;
}

export type NotificationData =
  | DirectChatNotificationData
  | DirectChatRequestNotificationData
  | ContactRequestResponseNotificationData
  | BusinessNotificationData
  | BusinessActivatedNotificationData
  | BusinessContactRequestResponseNotificationData
  | EventNotificationData
  | FavEventUpdateNotificationData
  | JobOfferNotificationData
  | NewsNotificationData
  | SurveyNotificationData
  | EasterEggHuntWinnerNotificationData;
