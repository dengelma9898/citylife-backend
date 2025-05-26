import { ContactMessage } from './contact-message.entity';

export enum ContactRequestType {
  GENERAL = 'GENERAL',
  FEEDBACK = 'FEEDBACK',
  BUSINESS_CLAIM = 'BUSINESS_CLAIM',
  BUSINESS_REQUEST = 'BUSINESS_REQUEST',
}

export interface ContactRequestProps {
  id: string;
  type: ContactRequestType;
  businessId?: string; // Für BUSINESS_CLAIM und BUSINESS_REQUEST
  userId?: string; // ID des eingeloggten Benutzers, falls vorhanden
  messages: ContactMessage[];
  createdAt: string;
  updatedAt: string;
  isProcessed: boolean;
  responded: boolean; // Gibt an, ob ein Admin bereits auf die Anfrage reagiert hat
}

export class ContactRequest {
  readonly id: string;
  readonly type: ContactRequestType;
  readonly userId?: string;
  readonly businessId?: string;
  readonly messages: ContactMessage[];
  readonly responded: boolean;
  readonly isProcessed: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;

  private constructor(props: ContactRequestProps) {
    this.id = props.id;
    this.type = props.type;
    this.userId = props.userId;
    this.businessId = props.businessId;
    this.messages = props.messages;
    this.responded = props.responded;
    this.isProcessed = props.isProcessed;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<
      ContactRequestProps,
      'id' | 'responded' | 'isProcessed' | 'createdAt' | 'updatedAt'
    >,
  ): ContactRequest {
    const now = new Date().toISOString();
    return new ContactRequest({
      id: crypto.randomUUID(),
      ...props,
      createdAt: now,
      updatedAt: now,
      responded: false,
      isProcessed: false,
    });
  }

  static fromProps(props: ContactRequestProps): ContactRequest {
    return new ContactRequest(props);
  }

  update(props: Partial<Omit<ContactRequestProps, 'id' | 'updatedAt'>>): ContactRequest {
    return new ContactRequest({
      ...this,
      ...props,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): ContactRequestProps {
    return {
      id: this.id,
      type: this.type,
      userId: this.userId,
      businessId: this.businessId,
      messages: this.messages,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isProcessed: this.isProcessed,
      responded: this.responded,
    };
  }
}
