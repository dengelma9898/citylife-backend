export interface Event {
  id: string;
  title: string;
  description: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  startDate: string;
  endDate: string;
  titleImageUrl?: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
  favoriteCount?: number;
  ticketsNeeded?: boolean;
  price?: number;
} 