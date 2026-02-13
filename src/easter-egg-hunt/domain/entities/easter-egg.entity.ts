export interface EasterEggLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface EasterEggProps {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  prizeDescription?: string;
  numberOfWinners?: number;
  startDate: string;
  endDate?: string;
  location: EasterEggLocation;
  participants: string[];
  winners: string[];
  createdAt: string;
  updatedAt: string;
}

export class EasterEgg {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrl?: string;
  readonly prizeDescription?: string;
  readonly numberOfWinners?: number;
  readonly startDate: string;
  readonly endDate?: string;
  readonly location: EasterEggLocation;
  readonly participants: string[];
  readonly winners: string[];
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: EasterEggProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.imageUrl = props.imageUrl;
    this.prizeDescription = props.prizeDescription;
    this.numberOfWinners = props.numberOfWinners;
    this.startDate = props.startDate;
    this.endDate = props.endDate;
    this.location = props.location;
    this.participants = props.participants;
    this.winners = props.winners;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<EasterEggProps, 'id' | 'createdAt' | 'updatedAt' | 'participants' | 'winners'>,
  ): EasterEgg {
    const now = new Date().toISOString();
    return new EasterEgg({
      id: crypto.randomUUID(),
      ...props,
      participants: [],
      winners: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromProps(props: EasterEggProps): EasterEgg {
    return new EasterEgg(props);
  }

  update(props: Partial<Omit<EasterEggProps, 'id' | 'createdAt'>>): EasterEgg {
    return new EasterEgg({
      ...this,
      ...props,
      updatedAt: new Date().toISOString(),
    });
  }

  addParticipant(userId: string): EasterEgg {
    if (this.participants.includes(userId)) {
      return this;
    }
    return new EasterEgg({
      ...this,
      participants: [...this.participants, userId],
      updatedAt: new Date().toISOString(),
    });
  }

  addWinner(userId: string): EasterEgg {
    if (this.winners.includes(userId)) {
      return this;
    }
    return new EasterEgg({
      ...this,
      winners: [...this.winners, userId],
      updatedAt: new Date().toISOString(),
    });
  }

  isActive(): boolean {
    const now = new Date().toISOString().split('T')[0];
    if (now < this.startDate) {
      return false;
    }
    if (this.endDate && now > this.endDate) {
      return false;
    }
    return true;
  }

  toJSON(): EasterEggProps {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      imageUrl: this.imageUrl,
      prizeDescription: this.prizeDescription,
      numberOfWinners: this.numberOfWinners,
      startDate: this.startDate,
      endDate: this.endDate,
      location: this.location,
      participants: this.participants,
      winners: this.winners,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
