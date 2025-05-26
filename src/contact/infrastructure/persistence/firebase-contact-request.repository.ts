import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { ContactRequest } from '../../domain/entities/contact-request.entity';
import { ContactRequestRepository } from '../../domain/repositories/contact-request.repository';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

@Injectable()
export class FirebaseContactRequestRepository implements ContactRequestRepository {
  private readonly logger = new Logger(FirebaseContactRequestRepository.name);
  private readonly contactRequestCollection = 'contact_requests';

  constructor(private readonly firebaseService: FirebaseService) {}

  async findAll(): Promise<ContactRequest[]> {
    this.logger.log('Getting all contact requests');
    const db = this.firebaseService.getClientFirestore();
    const snapshot = await getDocs(collection(db, this.contactRequestCollection));
    return snapshot.docs.map(doc =>
      ContactRequest.fromProps({
        id: doc.id,
        ...doc.data(),
      } as any),
    );
  }

  async findById(id: string): Promise<ContactRequest | null> {
    this.logger.log(`Getting contact request with id: ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.contactRequestCollection, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return ContactRequest.fromProps({
      id: docSnap.id,
      ...docSnap.data(),
    } as any);
  }

  async create(
    data: Omit<ContactRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ContactRequest> {
    this.logger.log('Creating new contact request');
    const db = this.firebaseService.getClientFirestore();
    const contactRequest = ContactRequest.create(data);
    await addDoc(collection(db, this.contactRequestCollection), contactRequest.toJSON());
    return ContactRequest.fromProps({
      ...contactRequest.toJSON(),
    });
  }

  async update(
    id: string,
    data: Partial<Omit<ContactRequest, 'id' | 'createdAt'>>,
  ): Promise<ContactRequest | null> {
    this.logger.log(`Updating contact request with id: ${id}`);

    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.contactRequestCollection, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }
    var messages: any[] = [];
    if (data.messages) {
      messages = data.messages.map(msg => msg.toJSON());
    }
    const currentData = docSnap.data();
    const updatedData = {
      ...currentData,
      ...data,
      messages: messages,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, updatedData);
    return ContactRequest.fromProps({
      id: docSnap.id,
      ...updatedData,
    } as any);
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting contact request with id: ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.contactRequestCollection, id);
    await deleteDoc(docRef);
  }

  async findByUserId(userId: string): Promise<ContactRequest[]> {
    this.logger.log(`Finding contact requests for user: ${userId}`);
    const db = this.firebaseService.getClientFirestore();
    const q = query(collection(db, this.contactRequestCollection), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc =>
      ContactRequest.fromProps({
        id: doc.id,
        ...doc.data(),
      } as any),
    );
  }

  async findByBusinessId(businessId: string): Promise<ContactRequest[]> {
    this.logger.log(`Finding contact requests for business: ${businessId}`);
    const db = this.firebaseService.getClientFirestore();
    const q = query(
      collection(db, this.contactRequestCollection),
      where('businessId', '==', businessId),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc =>
      ContactRequest.fromProps({
        id: doc.id,
        ...doc.data(),
      } as any),
    );
  }
}
