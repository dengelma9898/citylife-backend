export interface Reaction {
  userId: string;
  type: string;
}

export interface ChatMessageProps {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  reactions?: Reaction[];
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  editedByAdmin?: boolean;
}

export class ChatMessage {
  readonly id: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly content: string;
  readonly reactions?: Reaction[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly editedAt?: string;
  readonly editedByAdmin?: boolean;

  private constructor(props: ChatMessageProps) {
    this.id = props.id;
    this.senderId = props.senderId;
    this.senderName = props.senderName;
    this.content = props.content;
    this.reactions = props.reactions;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.editedAt = props.editedAt;
    this.editedByAdmin = props.editedByAdmin;
  }

  static create(props: Omit<ChatMessageProps, 'id' | 'createdAt' | 'updatedAt'>): ChatMessage {
    return new ChatMessage({
      id: crypto.randomUUID(),
      ...props,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  static fromProps(props: ChatMessageProps): ChatMessage {
    return new ChatMessage(props);
  }

  update(props: Partial<Omit<ChatMessageProps, 'id' | 'createdAt'>>): ChatMessage {
    return new ChatMessage({
      ...this,
      ...props,
      updatedAt: new Date().toISOString()
    });
  }

  toJSON(): ChatMessageProps {
    return {
      id: this.id,
      senderId: this.senderId,
      senderName: this.senderName,
      content: this.content,
      reactions: this.reactions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      editedAt: this.editedAt,
      editedByAdmin: this.editedByAdmin
    };
  }
} 