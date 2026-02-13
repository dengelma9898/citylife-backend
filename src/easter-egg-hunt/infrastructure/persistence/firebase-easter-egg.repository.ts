import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { EasterEgg, EasterEggProps } from '../../domain/entities/easter-egg.entity';
import { EasterEggRepository } from '../../domain/repositories/easter-egg.repository';

@Injectable()
export class FirebaseEasterEggRepository implements EasterEggRepository {
  private readonly logger = new Logger(FirebaseEasterEggRepository.name);
  private readonly COLLECTION = 'easterEggs';

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

  private toPlainObject(entity: EasterEgg): Omit<EasterEggProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toEasterEggProps(data: any, id: string): EasterEggProps {
    return {
      id,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      prizeDescription: data.prizeDescription,
      numberOfWinners: data.numberOfWinners,
      startDate: data.startDate,
      endDate: data.endDate,
      location: data.location || { address: '', latitude: 0, longitude: 0 },
      participants: data.participants || [],
      winners: data.winners || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async findAll(): Promise<EasterEgg[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.COLLECTION).get();
    return snapshot.docs.map(doc =>
      EasterEgg.fromProps(this.toEasterEggProps(doc.data(), doc.id)),
    );
  }

  async findById(id: string): Promise<EasterEgg | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.COLLECTION).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return EasterEgg.fromProps(this.toEasterEggProps(doc.data(), doc.id));
  }

  async create(egg: EasterEgg): Promise<EasterEgg> {
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection(this.COLLECTION).add(this.toPlainObject(egg));
    this.logger.log(`Created easter egg with id: ${docRef.id}`);
    return EasterEgg.fromProps({
      ...egg.toJSON(),
      id: docRef.id,
    });
  }

  async update(id: string, egg: EasterEgg): Promise<EasterEgg> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Easter egg not found');
    }
    await docRef.update(this.toPlainObject(egg));
    this.logger.log(`Updated easter egg with id: ${id}`);
    return EasterEgg.fromProps({
      ...egg.toJSON(),
      id,
    });
  }

  async delete(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Easter egg not found');
    }
    await docRef.delete();
    this.logger.log(`Deleted easter egg with id: ${id}`);
  }
}
