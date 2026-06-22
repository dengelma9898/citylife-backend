import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import {
  AdventCalendarEntry,
  AdventCalendarEntryProps,
} from '../../domain/entities/advent-calendar-entry.entity';
import { CreateAdventCalendarEntryDto } from '../../dto/create-advent-calendar-entry.dto';
import { UpdateAdventCalendarEntryDto } from '../../dto/update-advent-calendar-entry.dto';

@Injectable()
export class AdventCalendarService {
  private readonly logger = new Logger(AdventCalendarService.name);
  private readonly entriesCollection = 'adventCalendarEntries';
  private readonly FEATURE_STATUS_DOC_ID = 'feature-status';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toAdventCalendarEntryProps(
    data: Record<string, unknown>,
    id: string,
  ): AdventCalendarEntryProps {
    return {
      id,
      number: data.number as number,
      canParticipate: data.canParticipate as boolean,
      isActive: data.isActive as boolean,
      date: data.date as string,
      isSpecial: data.isSpecial as boolean,
      imageUrl: data.imageUrl as string | undefined,
      description: data.description as string | undefined,
      linkUrl: data.linkUrl as string | undefined,
      participants: (data.participants as string[]) || [],
      winners: (data.winners as string[]) || [],
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
    };
  }

  private async findAllEntries(): Promise<AdventCalendarEntry[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.entriesCollection).orderBy('number', 'asc').get();
    return snapshot.docs.map(doc =>
      AdventCalendarEntry.fromProps(
        this.toAdventCalendarEntryProps(doc.data() as Record<string, unknown>, doc.id),
      ),
    );
  }

  private async findEntryById(id: string): Promise<AdventCalendarEntry | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.entriesCollection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return AdventCalendarEntry.fromProps(
      this.toAdventCalendarEntryProps(doc.data() as Record<string, unknown>, doc.id),
    );
  }

  private async findEntryByNumber(number: number): Promise<AdventCalendarEntry | null> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.entriesCollection)
      .where('number', '==', number)
      .get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return AdventCalendarEntry.fromProps(
      this.toAdventCalendarEntryProps(doc.data() as Record<string, unknown>, doc.id),
    );
  }

  private async updateEntry(id: string, entry: AdventCalendarEntry): Promise<AdventCalendarEntry> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.entriesCollection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    await docRef.update(toFirestoreData(entry));
    this.logger.log(`Updated advent calendar entry with id: ${id}`);
    return AdventCalendarEntry.fromProps({
      ...entry.toJSON(),
      id,
    });
  }

  public async getAll(): Promise<AdventCalendarEntry[]> {
    this.logger.log('Getting all advent calendar entries');
    return this.findAllEntries();
  }

  public async getById(id: string): Promise<AdventCalendarEntry> {
    this.logger.log(`Getting advent calendar entry with id: ${id}`);
    const entry = await this.findEntryById(id);
    if (!entry) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    return entry;
  }

  public async create(createDto: CreateAdventCalendarEntryDto): Promise<AdventCalendarEntry> {
    this.logger.log(`Creating advent calendar entry with number: ${createDto.number}`);
    const entry = AdventCalendarEntry.create(createDto);
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection(this.entriesCollection).add(toFirestoreData(entry));
    this.logger.log(`Created advent calendar entry with id: ${docRef.id}`);
    return AdventCalendarEntry.fromProps({
      ...entry.toJSON(),
      id: docRef.id,
    });
  }

  public async update(
    id: string,
    updateDto: UpdateAdventCalendarEntryDto,
  ): Promise<AdventCalendarEntry> {
    this.logger.log(`Updating advent calendar entry with id: ${id}`);
    const existingEntry = await this.findEntryById(id);
    if (!existingEntry) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    if (updateDto.number && updateDto.number !== existingEntry.number) {
      const entryWithNumber = await this.findEntryByNumber(updateDto.number);
      if (entryWithNumber && entryWithNumber.id !== id) {
        throw new BadRequestException(`Entry with number ${updateDto.number} already exists`);
      }
    }
    const updatedEntry = existingEntry.update(updateDto);
    return this.updateEntry(id, updatedEntry);
  }

  public async delete(id: string): Promise<void> {
    this.logger.log(`Deleting advent calendar entry with id: ${id}`);
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.entriesCollection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    await docRef.delete();
    this.logger.log(`Deleted advent calendar entry with id: ${id}`);
  }

  public async participate(id: string, userId: string): Promise<AdventCalendarEntry> {
    this.logger.log(`User ${userId} participating in entry ${id}`);
    const entry = await this.findEntryById(id);
    if (!entry) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    if (!entry.canParticipate) {
      throw new BadRequestException('Participation is not allowed for this entry');
    }
    if (!entry.isActive) {
      throw new BadRequestException('Entry is not active');
    }
    if (entry.participants.includes(userId)) {
      throw new BadRequestException('User has already participated in this entry');
    }
    const today = new Date().toISOString().split('T')[0];
    if (entry.date !== today) {
      throw new BadRequestException(
        `Participation is only allowed on the entry date (${entry.date}), not on ${today}`,
      );
    }
    const updatedEntry = entry.addParticipant(userId);
    return this.updateEntry(id, updatedEntry);
  }

  public async addWinner(id: string, userId: string): Promise<AdventCalendarEntry> {
    this.logger.log(`Adding winner ${userId} to entry ${id}`);
    const entry = await this.findEntryById(id);
    if (!entry) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    if (!entry.participants.includes(userId)) {
      throw new BadRequestException('User is not a participant of this entry');
    }
    if (entry.winners.includes(userId)) {
      throw new BadRequestException('User is already a winner');
    }
    const updatedEntry = entry.addWinner(userId);
    return this.updateEntry(id, updatedEntry);
  }

  public async setFeatureActive(isFeatureActive: boolean): Promise<{ isFeatureActive: boolean }> {
    this.logger.log(`Setting advent calendar feature status to: ${isFeatureActive}`);
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection('adventCalendar').doc(this.FEATURE_STATUS_DOC_ID);
    await docRef.set(
      {
        isFeatureActive,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    this.logger.log(`Advent calendar feature status successfully set to: ${isFeatureActive}`);
    return { isFeatureActive };
  }

  public async getFeatureActive(): Promise<boolean> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection('adventCalendar').doc(this.FEATURE_STATUS_DOC_ID);
    const doc = await docRef.get();
    if (!doc.exists) {
      return false;
    }
    const data = doc.data();
    return data?.isFeatureActive || false;
  }
}
