import { ContactMessage } from './contact-message.interface';

export enum ContactRequestType {
  GENERAL = 'GENERAL',
  FEEDBACK = 'FEEDBACK',
  BUSINESS_CLAIM = 'BUSINESS_CLAIM',
  BUSINESS_REQUEST = 'BUSINESS_REQUEST',
}

export interface ContactRequest {
  id: string;
  type: ContactRequestType;
  businessId?: string;
  userId?: string;
  messages: ContactMessage[];
  createdAt: string;
  updatedAt: string;
  isProcessed: boolean;
  responded: boolean;
}
