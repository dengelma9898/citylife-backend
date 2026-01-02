export interface Reaction {
  userId: string;
  type: string;
}

export interface DirectMessageProps {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  imageUrl?: string;
  isEditable: boolean;
  reactions?: Reaction[];
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
}

export class DirectMessage {
  readonly id: string;
  readonly chatId: string;
  readonly senderId: string;
  readonly senderName: string;
  readonly content: string;
  readonly imageUrl?: string;
  readonly isEditable: boolean;
  readonly reactions?: Reaction[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly editedAt?: string;

  private constructor(props: DirectMessageProps) {
    this.id = props.id;
    this.chatId = props.chatId;
    this.senderId = props.senderId;
    this.senderName = props.senderName;
    this.content = props.content;
    this.imageUrl = props.imageUrl;
    this.isEditable = props.isEditable;
    this.reactions = props.reactions;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.editedAt = props.editedAt;
  }

  static create(props: Omit<DirectMessageProps, 'id' | 'createdAt' | 'updatedAt' | 'isEditable'>): DirectMessage {
    return new DirectMessage({
      id: crypto.randomUUID(),
      ...props,
      isEditable: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  static fromProps(props: DirectMessageProps): DirectMessage {
    return new DirectMessage(props);
  }

  update(props: Partial<Omit<DirectMessageProps, 'id' | 'createdAt' | 'chatId' | 'senderId'>>): DirectMessage {
    return new DirectMessage({
      ...this,
      ...props,
      editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  isOwnedBy(userId: string): boolean {
    return this.senderId === userId;
  }

  toJSON(): DirectMessageProps {
    return {
      id: this.id,
      chatId: this.chatId,
      senderId: this.senderId,
      senderName: this.senderName,
      content: this.content,
      imageUrl: this.imageUrl,
      isEditable: this.isEditable,
      reactions: this.reactions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      editedAt: this.editedAt,
    };
  }
}


