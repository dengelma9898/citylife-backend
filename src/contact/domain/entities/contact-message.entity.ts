export interface ContactMessageProps {
    userId: string;
    message: string;
    createdAt: string;
    isAdminResponse: boolean;
  } 

export class ContactMessage {
  readonly userId: string;
  readonly message: string;
  readonly createdAt: string;
  readonly isAdminResponse: boolean;

  private constructor(props: ContactMessageProps) {
    this.userId = props.userId;
    this.message = props.message;
    this.createdAt = props.createdAt;
    this.isAdminResponse = props.isAdminResponse;
  }

  static create(props: Omit<ContactMessageProps, 'createdAt'>): ContactMessage {
    const now = new Date().toISOString();
    return new ContactMessage({
      userId: props.userId,
      message: props.message,
      createdAt: now,
      isAdminResponse: props.isAdminResponse
    });
  }

  static fromProps(props: ContactMessageProps): ContactMessage {
    return new ContactMessage(props);
  }

  toJSON(): ContactMessageProps {
    return {
      userId: this.userId,
      message: this.message,
      createdAt: this.createdAt,
      isAdminResponse: this.isAdminResponse
    };
  }
} 