export interface ChatroomProps {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdBy: string;
  /**
   * @deprecated Use participantCount instead. This property will be removed in a future version.
   */
  participants: string[];
  participantCount: number;
  lastMessage?: {
    content: string;
    authorId: string;
    sentAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class Chatroom {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly imageUrl?: string;
  readonly createdBy: string;
  /**
   * @deprecated Use participantCount instead. This property will be removed in a future version.
   */
  readonly participants: string[];
  readonly participantCount: number;
  readonly lastMessage?: {
    content: string;
    authorId: string;
    sentAt: string;
  };
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: ChatroomProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.imageUrl = props.imageUrl;
    this.createdBy = props.createdBy;
    this.participants = props.participants;
    this.participantCount = props.participantCount;
    this.lastMessage = props.lastMessage;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: Omit<ChatroomProps, 'id' | 'createdAt' | 'updatedAt' | 'participantCount'>): Chatroom {
    const participantCount = props.participants?.length || 0;
    return new Chatroom({
      id: crypto.randomUUID(),
      ...props,
      participantCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  static fromProps(props: ChatroomProps): Chatroom {
    return new Chatroom(props);
  }

  update(props: Partial<Omit<ChatroomProps, 'id' | 'createdAt'>>): Chatroom {
    return new Chatroom({
      ...this,
      ...props,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): ChatroomProps {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      imageUrl: this.imageUrl,
      createdBy: this.createdBy,
      participants: this.participants,
      participantCount: this.participantCount,
      lastMessage: this.lastMessage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
