import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { ContactRequest } from '../../domain/entities/contact-request.entity';
import { ContactRequestRepository } from '../../domain/repositories/contact-request.repository';
import { ContactMessage } from '../../domain/entities/contact-message.entity';

@Injectable()
export class FirebaseContactRequestRepository implements ContactRequestRepository {
  private readonly logger = new Logger(FirebaseContactRequestRepository.name);
  private readonly contactRequestCollection = 'contact_requests';

  constructor(private readonly firebaseService: FirebaseService) {}

  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(item => this.removeUndefined(item));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.removeUndefined(obj[key]);
      }
      return result;
    }
    return obj;
  }

  private toPlainObject(entity: ContactRequest): any {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toEntityProps(data: any, id: string): any {
    return {
      id,
      ...data,
      messages: (data.messages || []).map((msg: any) => ContactMessage.fromProps(msg)),
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    };
  }

  async findAll(): Promise<ContactRequest[]> {
    this.logger.log('Getting all contact requests');
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.contactRequestCollection).get();
    return snapshot.docs.map(doc =>
      ContactRequest.fromProps(this.toEntityProps(doc.data(), doc.id)),
    );
  }

  async findById(id: string): Promise<ContactRequest | null> {
    this.logger.log(`Getting contact request with id: ${id}`);
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.contactRequestCollection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return ContactRequest.fromProps(this.toEntityProps(doc.data(), doc.id));
  }

  async create(
    data: Omit<ContactRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ContactRequest> {
    this.logger.log('Creating new contact request');
    const db = this.firebaseService.getFirestore();
    const contactRequest = ContactRequest.create(data);
    const plainData = this.toPlainObject(contactRequest);
    const docRef = await db.collection(this.contactRequestCollection).add(plainData);
    return ContactRequest.fromProps(this.toEntityProps(plainData, docRef.id));
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

    const updateData: any = { ...data };
    if (data.messages) {
      updateData.messages = data.messages.map((msg: ContactMessage) =>
        msg instanceof ContactMessage ? msg.toJSON() : msg,
      );
    }
    updateData.updatedAt = new Date().toISOString();

    const plainUpdateData = this.removeUndefined(updateData);
    await db.collection(this.contactRequestCollection).doc(id).update(plainUpdateData);

    const updatedDoc = await db.collection(this.contactRequestCollection).doc(id).get();
    return ContactRequest.fromProps(this.toEntityProps(updatedDoc.data(), updatedDoc.id));
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
      ContactRequest.fromProps(this.toEntityProps(doc.data(), doc.id)),
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
      ContactRequest.fromProps(this.toEntityProps(doc.data(), doc.id)),
    );
  }
}
