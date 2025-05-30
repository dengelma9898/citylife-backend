import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { ContactRequest } from '../../domain/entities/contact-request.entity';
import { ContactRequestRepository } from '../../domain/repositories/contact-request.repository';

@Injectable()
export class FirebaseContactRequestRepository implements ContactRequestRepository {
  private readonly logger = new Logger(FirebaseContactRequestRepository.name);
  private readonly contactRequestCollection = 'contact_requests';

  constructor(private readonly firebaseService: FirebaseService) {}

  async findAll(): Promise<ContactRequest[]> {
    this.logger.log('Getting all contact requests');
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.contactRequestCollection).get();
    return snapshot.docs.map(doc =>
      ContactRequest.fromProps({
        id: doc.id,
        ...doc.data(),
      } as any),
    );
  }

  async findById(id: string): Promise<ContactRequest | null> {
    this.logger.log(`Getting contact request with id: ${id}`);
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.contactRequestCollection).doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return ContactRequest.fromProps({
      id: doc.id,
      ...doc.data(),
    } as any);
  }

  async create(
    data: Omit<ContactRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ContactRequest> {
    this.logger.log('Creating new contact request');
    const db = this.firebaseService.getFirestore();
    const contactRequest = ContactRequest.create(data);
    const docRef = await db.collection(this.contactRequestCollection).add(contactRequest.toJSON());
    return ContactRequest.fromProps({
      ...contactRequest.toJSON(),
      id: docRef.id,
    });
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
    var messages: any[] = [];
    if (data.messages) {
      messages = data.messages.map(msg => msg.toJSON());
    }
    const currentData = doc.data();
    const updatedData = {
      ...currentData,
      ...data,
      messages: messages,
      updatedAt: new Date().toISOString(),
    };

    await db.collection(this.contactRequestCollection).doc(id).update(updatedData);
    return ContactRequest.fromProps({
      id: doc.id,
      ...updatedData,
    } as any);
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
      ContactRequest.fromProps({
        id: doc.id,
        ...doc.data(),
      } as any),
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
      ContactRequest.fromProps({
        id: doc.id,
        ...doc.data(),
      } as any),
    );
  }
}
