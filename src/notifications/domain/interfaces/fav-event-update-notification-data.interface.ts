export interface FavEventUpdateNotificationData {
  type: 'FAV_EVENT_UPDATE';
  eventId: string;
  eventTitle: string;
  updateType: 'TIME' | 'LOCATION' | 'DESCRIPTION' | 'OTHER';
}
