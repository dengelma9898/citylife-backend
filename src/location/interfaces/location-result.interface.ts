export interface LocationResult {
  title: string;
  id: string;
  resultType: string;
  address: {
    label: string;
    countryCode: string;
    countryName: string;
    state: string;
    county: string;
    city: string;
    district: string;
    street: string;
    postalCode: string;
  };
  position: {
    lat: number;
    lng: number;
  };
}
