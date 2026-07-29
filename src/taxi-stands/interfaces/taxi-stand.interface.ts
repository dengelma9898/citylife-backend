export interface TaxiStandLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface TaxiStand {
  id: string;
  title?: string;
  description?: string;
  numberOfTaxis?: number;
  phoneNumber: string;
  location: TaxiStandLocation;
  phoneClickTimestamps: string[];
  createdAt: string;
  updatedAt: string;
}
