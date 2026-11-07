/**
 * A seasonal Christmas market as stored in Firestore (`christmasMarkets`)
 * and returned by the API. Dates are ISO strings in API responses.
 */
export interface ChristmasMarket {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly place: string;
  readonly description: string;
  readonly periodLabel: string;
  readonly openingHoursLabel: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly imageUrl?: string;
  readonly highlights: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
}
