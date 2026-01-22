export type DirectChatStatus = 'pending' | 'active';

export interface LastMessage {
  content: string;
  senderId: string;
  sentAt: string;
}

export interface DirectChatProps {
  id: string;
  creatorId: string;
  invitedUserId: string;
  creatorConfirmed: boolean;
  invitedConfirmed: boolean;
  status: DirectChatStatus;
  lastMessage?: LastMessage;
  mutedBy?: string[];
  createdAt: string;
  updatedAt: string;
}

export class DirectChat {
  readonly id: string;
  readonly creatorId: string;
  readonly invitedUserId: string;
  readonly creatorConfirmed: boolean;
  readonly invitedConfirmed: boolean;
  readonly status: DirectChatStatus;
  readonly lastMessage?: LastMessage;
  readonly mutedBy?: string[];
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: DirectChatProps) {
    this.id = props.id;
    this.creatorId = props.creatorId;
    this.invitedUserId = props.invitedUserId;
    this.creatorConfirmed = props.creatorConfirmed;
    this.invitedConfirmed = props.invitedConfirmed;
    this.status = props.status;
    this.lastMessage = props.lastMessage;
    this.mutedBy = props.mutedBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<
      DirectChatProps,
      'id' | 'createdAt' | 'updatedAt' | 'creatorConfirmed' | 'invitedConfirmed' | 'status'
    >,
  ): DirectChat {
    return new DirectChat({
      id: crypto.randomUUID(),
      ...props,
      creatorConfirmed: true,
      invitedConfirmed: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  static fromProps(props: DirectChatProps): DirectChat {
    return new DirectChat(props);
  }

  update(props: Partial<Omit<DirectChatProps, 'id' | 'createdAt'>>): DirectChat {
    return new DirectChat({
      ...this,
      ...props,
      updatedAt: new Date().toISOString(),
    });
  }

  confirm(): DirectChat {
    return new DirectChat({
      ...this,
      invitedConfirmed: true,
      status: 'active',
      updatedAt: new Date().toISOString(),
    });
  }

  isParticipant(userId: string): boolean {
    return this.creatorId === userId || this.invitedUserId === userId;
  }

  getOtherParticipantId(userId: string): string | null {
    if (this.creatorId === userId) return this.invitedUserId;
    if (this.invitedUserId === userId) return this.creatorId;
    return null;
  }

  toJSON(): DirectChatProps {
    return {
      id: this.id,
      creatorId: this.creatorId,
      invitedUserId: this.invitedUserId,
      creatorConfirmed: this.creatorConfirmed,
      invitedConfirmed: this.invitedConfirmed,
      status: this.status,
      lastMessage: this.lastMessage,
      mutedBy: this.mutedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
