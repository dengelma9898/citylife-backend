import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { TaxiStand, TaxiStandProps } from '../../domain/entities/taxi-stand.entity';
import { TaxiStandRepository } from '../../domain/repositories/taxi-stand.repository';

import { removeUndefined, toFirestoreData } from '../../../firebase/firebase-mapper.util';

@Injectable()
export class FirebaseTaxiStandRepository implements TaxiStandRepository {
  private readonly logger = new Logger(FirebaseTaxiStandRepository.name);
  private readonly COLLECTION = 'taxiStands';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toPlainObject(entity: TaxiStand): Omit<TaxiStandProps, 'id'> {
    return toFirestoreData(entity);
  }

  private toTaxiStandProps(data: any, id: string): TaxiStandProps {
    return {
      id,
      title: data.title,
      description: data.description,
      numberOfTaxis: data.numberOfTaxis,
      phoneNumber: data.phoneNumber,
      location: data.location || { address: '', latitude: 0, longitude: 0 },
      phoneClickTimestamps: data.phoneClickTimestamps || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async findAll(): Promise<TaxiStand[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.COLLECTION).get();
    return snapshot.docs.map(doc => TaxiStand.fromProps(this.toTaxiStandProps(doc.data(), doc.id)));
  }

  async findById(id: string): Promise<TaxiStand | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.COLLECTION).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return TaxiStand.fromProps(this.toTaxiStandProps(doc.data(), doc.id));
  }

  async create(taxiStand: TaxiStand): Promise<TaxiStand> {
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection(this.COLLECTION).add(this.toPlainObject(taxiStand));
    this.logger.log(`Created taxi stand with id: ${docRef.id}`);
    return TaxiStand.fromProps({
      ...taxiStand.toJSON(),
      id: docRef.id,
    });
  }

  async update(id: string, taxiStand: TaxiStand): Promise<TaxiStand> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Taxi stand not found');
    }
    await docRef.update(this.toPlainObject(taxiStand));
    this.logger.log(`Updated taxi stand with id: ${id}`);
    return TaxiStand.fromProps({
      ...taxiStand.toJSON(),
      id,
    });
  }

  async delete(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Taxi stand not found');
    }
    await docRef.delete();
    this.logger.log(`Deleted taxi stand with id: ${id}`);
  }
}
