import { EventLocation } from './event-location.interface';

export interface Event {
  id: string;
  cityId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: EventLocation;
  imageUrls: string[];
  titleImageUrl: string;
} 