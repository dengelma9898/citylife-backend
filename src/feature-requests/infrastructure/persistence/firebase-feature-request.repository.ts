import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { FeatureRequest, FeatureRequestProps } from '../../domain/entities/feature-request.entity';
import { FeatureRequestRepository } from '../../domain/repositories/feature-request.repository';
import { FeatureRequestStatus } from '../../domain/enums/feature-request-status.enum';

import { removeUndefined, toFirestoreData } from '../../../firebase/firebase-mapper.util';

@Injectable()
export class FirebaseFeatureRequestRepository implements FeatureRequestRepository {
  private readonly COLLECTION_NAME = 'feature-requests';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toPlainObject(entity: FeatureRequest): Omit<FeatureRequestProps, 'id'> {
    return toFirestoreData(entity);
  }

  private toFeatureRequestProps(data: any, id: string): FeatureRequestProps {
    return {
      id,
      title: data.title,
      description: data.description,
      imageUrls: data.imageUrls || [],
      authorId: data.authorId,
      status: data.status,
      votes: data.votes || [],
      completion: data.completion || null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async findAll(): Promise<FeatureRequest[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.COLLECTION_NAME).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc =>
      FeatureRequest.fromProps(this.toFeatureRequestProps(doc.data(), doc.id)),
    );
  }

  async findById(id: string): Promise<FeatureRequest | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.COLLECTION_NAME).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return FeatureRequest.fromProps(this.toFeatureRequestProps(doc.data(), doc.id));
  }

  async findByStatus(status: FeatureRequestStatus): Promise<FeatureRequest[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.COLLECTION_NAME)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc =>
      FeatureRequest.fromProps(this.toFeatureRequestProps(doc.data(), doc.id)),
    );
  }

  async findByAuthorId(authorId: string): Promise<FeatureRequest[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.COLLECTION_NAME)
      .where('authorId', '==', authorId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc =>
      FeatureRequest.fromProps(this.toFeatureRequestProps(doc.data(), doc.id)),
    );
  }

  async create(featureRequest: FeatureRequest): Promise<FeatureRequest> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION_NAME).doc(featureRequest.id);
    await docRef.set(this.toPlainObject(featureRequest));
    return FeatureRequest.fromProps({
      ...featureRequest.toJSON(),
      id: docRef.id,
    });
  }

  async update(id: string, featureRequest: FeatureRequest): Promise<FeatureRequest> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION_NAME).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Feature request not found');
    }
    await docRef.update(this.toPlainObject(featureRequest));
    return FeatureRequest.fromProps({
      ...featureRequest.toJSON(),
      id,
    });
  }

  async delete(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION_NAME).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Feature request not found');
    }
    await docRef.delete();
  }
}
