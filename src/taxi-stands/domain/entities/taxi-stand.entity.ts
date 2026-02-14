export interface TaxiStandLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface TaxiStandProps {
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

export class TaxiStand {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
  readonly numberOfTaxis?: number;
  readonly phoneNumber: string;
  readonly location: TaxiStandLocation;
  readonly phoneClickTimestamps: string[];
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: TaxiStandProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.numberOfTaxis = props.numberOfTaxis;
    this.phoneNumber = props.phoneNumber;
    this.location = props.location;
    this.phoneClickTimestamps = props.phoneClickTimestamps;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<TaxiStandProps, 'id' | 'createdAt' | 'updatedAt' | 'phoneClickTimestamps'>,
  ): TaxiStand {
    const now = new Date().toISOString();
    return new TaxiStand({
      id: crypto.randomUUID(),
      ...props,
      phoneClickTimestamps: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromProps(props: TaxiStandProps): TaxiStand {
    return new TaxiStand(props);
  }

  update(props: Partial<Omit<TaxiStandProps, 'id' | 'createdAt'>>): TaxiStand {
    return new TaxiStand({
      ...this,
      ...props,
      updatedAt: new Date().toISOString(),
    });
  }

  addPhoneClick(): TaxiStand {
    return new TaxiStand({
      ...this,
      phoneClickTimestamps: [...this.phoneClickTimestamps, new Date().toISOString()],
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): TaxiStandProps {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      numberOfTaxis: this.numberOfTaxis,
      phoneNumber: this.phoneNumber,
      location: this.location,
      phoneClickTimestamps: this.phoneClickTimestamps,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
