import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';
import {
  Business,
  BusinessProps,
  BusinessCustomer,
  BusinessContact,
  BusinessAddress,
} from '../../domain/entities/business.entity';
import { BusinessRepository } from '../../domain/repositories/business.repository';
import { BusinessStatus } from '../../domain/enums/business-status.enum';

import { removeUndefined } from '../../../firebase/firebase-mapper.util';

@Injectable()
export class FirebaseBusinessRepository implements BusinessRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  private toPlainObject(entity: Business): Omit<BusinessProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    const plainObject = removeUndefined(data);
    if (plainObject.logoUrl === null || plainObject.logoUrl === undefined) {
      plainObject.logoUrl = '';
    }
    return plainObject;
  }

  private toBusinessProps(data: any, id: string): BusinessProps {
    return {
      id,
      name: data.name,
      contact: BusinessContact.create(data.contact),
      address: BusinessAddress.create(data.address),
      categoryIds: data.categoryIds || [],
      keywordIds: data.keywordIds || [],
      eventIds: data.eventIds,
      description: data.description,
      logoUrl: data.logoUrl === null || data.logoUrl === undefined ? '' : data.logoUrl,
      imageUrls: data.imageUrls,
      openingHours: data.openingHours,
      detailedOpeningHours: data.detailedOpeningHours,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted,
      status: data.status,
      benefit: data.benefit,
      previousBenefits: data.previousBenefits,
      customers: (data.customers || []).map((customer: any) => BusinessCustomer.create(customer)),
      hasAccount: data.hasAccount,
      isPromoted: data.isPromoted,
    };
  }

  async findAll(): Promise<Business[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('businesses').get();

    return snapshot.docs.map(doc => Business.fromProps(this.toBusinessProps(doc.data(), doc.id)));
  }

  async findById(id: string): Promise<Business | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('businesses').doc(id).get();

    if (!doc.exists) {
      return null;
    }

    return Business.fromProps(this.toBusinessProps(doc.data(), doc.id));
  }

  async create(business: Business): Promise<Business> {
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection('businesses').add(this.toPlainObject(business));

    return Business.fromProps({
      ...business.toJSON(),
      id: docRef.id,
    });
  }

  async update(id: string, business: Business): Promise<Business> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection('businesses').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException('Business not found');
    }

    await docRef.update(this.toPlainObject(business));

    return Business.fromProps({
      ...business.toJSON(),
      id,
    });
  }

  async delete(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection('businesses').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException('Business not found');
    }

    await docRef.delete();
  }

  async findByStatus(status: BusinessStatus): Promise<Business[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('businesses').where('status', '==', status).get();

    return snapshot.docs.map(doc => Business.fromProps(this.toBusinessProps(doc.data(), doc.id)));
  }

  async findByStatusAndHasAccount(
    status: BusinessStatus,
    hasAccount: boolean,
  ): Promise<Business[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection('businesses')
      .where('status', '==', status)
      .where('hasAccount', '==', hasAccount)
      .get();

    return snapshot.docs.map(doc => Business.fromProps(this.toBusinessProps(doc.data(), doc.id)));
  }
}
