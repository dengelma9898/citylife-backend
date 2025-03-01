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
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
} 