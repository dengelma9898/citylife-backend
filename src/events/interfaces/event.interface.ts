/**
 * Täglicher Zeitslot für ein Event
 */
export interface DailyTimeSlot {
  /**
   * Datum im ISO-Format (YYYY-MM-DD)
   */
  date: string;
  /**
   * Optionale Startzeit (HH:mm)
   */
  from?: string;
  /**
   * Optionale Endzeit (HH:mm)
   */
  to?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  startDate?: string;
  endDate?: string;
  titleImageUrl?: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
  favoriteCount?: number;
  ticketsNeeded?: boolean;
  price?: number;
  categoryId: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  isPromoted?: boolean;
  dailyTimeSlots?: DailyTimeSlot[];
}
