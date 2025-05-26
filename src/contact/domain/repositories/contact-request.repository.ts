import { ContactRequest } from '../entities/contact-request.entity';

export const CONTACT_REQUEST_REPOSITORY = 'CONTACT_REQUEST_REPOSITORY';

export interface ContactRequestRepository {
  findAll(): Promise<ContactRequest[]>;
  findById(id: string): Promise<ContactRequest | null>;
  create(data: Omit<ContactRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContactRequest>;
  update(
    id: string,
    data: Partial<Omit<ContactRequest, 'id' | 'createdAt'>>,
  ): Promise<ContactRequest | null>;
  delete(id: string): Promise<void>;
  findByUserId(userId: string): Promise<ContactRequest[]>;
  findByBusinessId(businessId: string): Promise<ContactRequest[]>;
}
