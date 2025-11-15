export interface AdventCalendarEntryProps {
  id: string;
  number: number;
  canParticipate: boolean;
  isActive: boolean;
  date: string;
  isSpecial: boolean;
  imageUrl?: string;
  description: string;
  linkUrl?: string;
  participants: string[];
  winners: string[];
  createdAt: string;
  updatedAt: string;
}

export class AdventCalendarEntry {
  readonly id: string;
  readonly number: number;
  readonly canParticipate: boolean;
  readonly isActive: boolean;
  readonly date: string;
  readonly isSpecial: boolean;
  readonly imageUrl?: string;
  readonly description: string;
  readonly linkUrl?: string;
  readonly participants: string[];
  readonly winners: string[];
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: AdventCalendarEntryProps) {
    this.id = props.id;
    this.number = props.number;
    this.canParticipate = props.canParticipate;
    this.isActive = props.isActive;
    this.date = props.date;
    this.isSpecial = props.isSpecial;
    this.imageUrl = props.imageUrl;
    this.description = props.description;
    this.linkUrl = props.linkUrl;
    this.participants = props.participants;
    this.winners = props.winners;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<AdventCalendarEntryProps, 'id' | 'createdAt' | 'updatedAt' | 'participants' | 'winners' | 'imageUrl'>,
  ): AdventCalendarEntry {
    const now = new Date().toISOString();
    return new AdventCalendarEntry({
      id: crypto.randomUUID(),
      ...props,
      participants: [],
      winners: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromProps(props: AdventCalendarEntryProps): AdventCalendarEntry {
    return new AdventCalendarEntry(props);
  }

  update(props: Partial<Omit<AdventCalendarEntryProps, 'id' | 'createdAt'>>): AdventCalendarEntry {
    return new AdventCalendarEntry({
      ...this,
      ...props,
      updatedAt: new Date().toISOString(),
    });
  }

  addParticipant(userId: string): AdventCalendarEntry {
    if (this.participants.includes(userId)) {
      return this;
    }
    return new AdventCalendarEntry({
      ...this,
      participants: [...this.participants, userId],
      updatedAt: new Date().toISOString(),
    });
  }

  addWinner(userId: string): AdventCalendarEntry {
    if (this.winners.includes(userId)) {
      return this;
    }
    return new AdventCalendarEntry({
      ...this,
      winners: [...this.winners, userId],
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): AdventCalendarEntryProps {
    return {
      id: this.id,
      number: this.number,
      canParticipate: this.canParticipate,
      isActive: this.isActive,
      date: this.date,
      isSpecial: this.isSpecial,
      imageUrl: this.imageUrl,
      description: this.description,
      linkUrl: this.linkUrl,
      participants: this.participants,
      winners: this.winners,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

