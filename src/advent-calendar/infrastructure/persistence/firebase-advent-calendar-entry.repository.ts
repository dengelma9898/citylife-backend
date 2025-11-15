import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { AdventCalendarEntry, AdventCalendarEntryProps } from '../../domain/entities/advent-calendar-entry.entity';
import { AdventCalendarEntryRepository } from '../../domain/repositories/advent-calendar-entry.repository';

@Injectable()
export class FirebaseAdventCalendarEntryRepository implements AdventCalendarEntryRepository {
  private readonly logger = new Logger(FirebaseAdventCalendarEntryRepository.name);

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

  private toPlainObject(entity: AdventCalendarEntry): Omit<AdventCalendarEntryProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toAdventCalendarEntryProps(data: any, id: string): AdventCalendarEntryProps {
    return {
      id,
      number: data.number,
      canParticipate: data.canParticipate,
      isActive: data.isActive,
      date: data.date,
      isSpecial: data.isSpecial,
      imageUrl: data.imageUrl,
      description: data.description,
      linkUrl: data.linkUrl,
      participants: data.participants || [],
      winners: data.winners || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async findAll(): Promise<AdventCalendarEntry[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('adventCalendarEntries').orderBy('number', 'asc').get();
    return snapshot.docs.map(doc =>
      AdventCalendarEntry.fromProps(this.toAdventCalendarEntryProps(doc.data(), doc.id)),
    );
  }

  async findById(id: string): Promise<AdventCalendarEntry | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection('adventCalendarEntries').doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return AdventCalendarEntry.fromProps(this.toAdventCalendarEntryProps(doc.data(), doc.id));
  }

  async findByNumber(number: number): Promise<AdventCalendarEntry | null> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection('adventCalendarEntries').where('number', '==', number).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return AdventCalendarEntry.fromProps(this.toAdventCalendarEntryProps(doc.data(), doc.id));
  }

  async create(entry: AdventCalendarEntry): Promise<AdventCalendarEntry> {
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection('adventCalendarEntries').add(this.toPlainObject(entry));
    this.logger.log(`Created advent calendar entry with id: ${docRef.id}`);
    return AdventCalendarEntry.fromProps({
      ...entry.toJSON(),
      id: docRef.id,
    });
  }

  async update(id: string, entry: AdventCalendarEntry): Promise<AdventCalendarEntry> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection('adventCalendarEntries').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    await docRef.update(this.toPlainObject(entry));
    this.logger.log(`Updated advent calendar entry with id: ${id}`);
    return AdventCalendarEntry.fromProps({
      ...entry.toJSON(),
      id,
    });
  }

  async delete(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection('adventCalendarEntries').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    await docRef.delete();
    this.logger.log(`Deleted advent calendar entry with id: ${id}`);
  }
}

