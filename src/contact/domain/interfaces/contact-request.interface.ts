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
  message: string;
  businessId?: string; // Für BUSINESS_CLAIM und BUSINESS_REQUEST
  userId?: string; // ID des eingeloggten Benutzers, falls vorhanden
  messages: ContactMessage[];
  createdAt: string;
  updatedAt: string;
  isProcessed: boolean;
  responded: boolean; // Gibt an, ob ein Admin bereits auf die Anfrage reagiert hat
}
