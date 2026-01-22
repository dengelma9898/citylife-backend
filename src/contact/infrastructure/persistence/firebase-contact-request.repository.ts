import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import {
  ContactRequest,
  ContactRequestProps,
  ContactRequestJSON,
} from '../../domain/entities/contact-request.entity';
import { ContactMessage } from '../../domain/entities/contact-message.entity';
import { ContactRequestRepository } from '../../domain/repositories/contact-request.repository';

@Injectable()
export class FirebaseContactRequestRepository implements ContactRequestRepository {
  private readonly logger = new Logger(FirebaseContactRequestRepository.name);
  private readonly contactRequestCollection = 'contact_requests';

  constructor(private readonly firebaseService: FirebaseService) {}

  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefined(item));
    }
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.removeUndefined(obj[key]);
      }
      return result;
    }
    return obj;
  }

  private toPlainObject(entity: ContactRequest): Omit<ContactRequestJSON, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toContactRequestProps(data: any, id: string): ContactRequestProps {
    return {
      id,
      type: data.type,
      userId: data.userId,
      businessId: data.businessId,
      messages: (data.messages || []).map((msg: any) =>
        ContactMessage.fromProps({
          userId: msg.userId,
          message: msg.message,
          createdAt: msg.createdAt,
          isAdminResponse: msg.isAdminResponse,
        }),
      ),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isProcessed: data.isProcessed ?? false,
      responded: data.responded ?? false,
    };
  }

  async findAll(): Promise<ContactRequest[]> {
    this.logger.log('Getting all contact requests');
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.contactRequestCollection).get();
    return snapshot.docs.map(doc =>
      ContactRequest.fromProps(this.toContactRequestProps(doc.data(), doc.id)),
    );
  }

  async findById(id: string): Promise<ContactRequest | null> {
    this.logger.log(`Getting contact request with id: ${id}`);
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.contactRequestCollection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return ContactRequest.fromProps(this.toContactRequestProps(doc.data(), doc.id));
  }

  async create(
    data: Omit<ContactRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ContactRequest> {
    this.logger.log('Creating new contact request');
    const db = this.firebaseService.getFirestore();
    const contactRequest = ContactRequest.create(data);
    const plainData = this.toPlainObject(contactRequest);
    const docRef = await db.collection(this.contactRequestCollection).add(plainData);
    return ContactRequest.fromProps(this.toContactRequestProps(plainData, docRef.id));
  }

  async update(
    id: string,
    data: Partial<Omit<ContactRequest, 'id' | 'createdAt'>>,
  ): Promise<ContactRequest | null> {
    this.logger.log(`Updating contact request with id: ${id}`);

    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.contactRequestCollection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    const currentRequest = ContactRequest.fromProps(this.toContactRequestProps(doc.data(), doc.id));
    const updatedRequest = currentRequest.update(data);
    const plainData = this.toPlainObject(updatedRequest);

    await db.collection(this.contactRequestCollection).doc(id).update(plainData);
    return ContactRequest.fromProps(this.toContactRequestProps(plainData, id));
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting contact request with id: ${id}`);
    const db = this.firebaseService.getFirestore();
    await db.collection(this.contactRequestCollection).doc(id).delete();
  }

  async findByUserId(userId: string): Promise<ContactRequest[]> {
    this.logger.log(`Finding contact requests for user: ${userId}`);
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.contactRequestCollection)
      .where('userId', '==', userId)
      .get();
    return snapshot.docs.map(doc =>
      ContactRequest.fromProps(this.toContactRequestProps(doc.data(), doc.id)),
    );
  }

  async findByBusinessId(businessId: string): Promise<ContactRequest[]> {
    this.logger.log(`Finding contact requests for business: ${businessId}`);
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.contactRequestCollection)
      .where('businessId', '==', businessId)
      .get();
    return snapshot.docs.map(doc =>
      ContactRequest.fromProps(this.toContactRequestProps(doc.data(), doc.id)),
    );
  }
}
