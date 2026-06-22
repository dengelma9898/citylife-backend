import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { EasterEgg, EasterEggProps } from '../../domain/entities/easter-egg.entity';
import { CreateEasterEggDto } from '../../dto/create-easter-egg.dto';
import { UpdateEasterEggDto } from '../../dto/update-easter-egg.dto';

@Injectable()
export class EasterEggService {
  private readonly logger = new Logger(EasterEggService.name);
  private readonly collection = 'easterEggs';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toEasterEggProps(data: Record<string, unknown>, id: string): EasterEggProps {
    return {
      id,
      title: data.title as string,
      description: data.description as string,
      imageUrl: data.imageUrl as string | undefined,
      prizeDescription: data.prizeDescription as string | undefined,
      numberOfWinners: data.numberOfWinners as number | undefined,
      startDate: data.startDate as string,
      endDate: data.endDate as string,
      location: (data.location as EasterEggProps['location']) || {
        address: '',
        latitude: 0,
        longitude: 0,
      },
      participants: (data.participants as string[]) || [],
      winners: (data.winners as string[]) || [],
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
    };
  }

  async findAll(): Promise<EasterEgg[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map(doc =>
      EasterEgg.fromProps(this.toEasterEggProps(doc.data() as Record<string, unknown>, doc.id)),
    );
  }

  async findById(id: string): Promise<EasterEgg | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return EasterEgg.fromProps(this.toEasterEggProps(doc.data() as Record<string, unknown>, doc.id));
  }

  async updateEntity(id: string, egg: EasterEgg): Promise<EasterEgg> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Easter egg not found');
    }
    await docRef.update(toFirestoreData(egg));
    this.logger.log(`Updated easter egg with id: ${id}`);
    return EasterEgg.fromProps({
      ...egg.toJSON(),
      id,
    });
  }

  async getAll(): Promise<EasterEgg[]> {
    this.logger.log('Getting all easter eggs');
    return this.findAll();
  }

  async getActive(): Promise<EasterEgg[]> {
    const eggs = await this.findAll();
    return eggs.filter(egg => egg.isActive());
  }

  async getById(id: string): Promise<EasterEgg> {
    this.logger.log(`Getting easter egg with id: ${id}`);
    const egg = await this.findById(id);
    if (!egg) {
      throw new NotFoundException('Easter egg not found');
    }
    return egg;
  }

  async create(dto: CreateEasterEggDto): Promise<EasterEgg> {
    this.logger.log(`Creating easter egg: ${dto.title}`);
    const egg = EasterEgg.create({
      title: dto.title,
      description: dto.description,
      prizeDescription: dto.prizeDescription,
      numberOfWinners: dto.numberOfWinners,
      startDate: dto.startDate,
      endDate: dto.endDate,
      location: {
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection(this.collection).add(toFirestoreData(egg));
    this.logger.log(`Created easter egg with id: ${docRef.id}`);
    return EasterEgg.fromProps({
      ...egg.toJSON(),
      id: docRef.id,
    });
  }

  async update(id: string, dto: UpdateEasterEggDto): Promise<EasterEgg> {
    this.logger.log(`Updating easter egg with id: ${id}`);
    const existingEgg = await this.findById(id);
    if (!existingEgg) {
      throw new NotFoundException('Easter egg not found');
    }
    const updateProps: Record<string, unknown> = {};
    if (dto.title !== undefined) updateProps.title = dto.title;
    if (dto.description !== undefined) updateProps.description = dto.description;
    if (dto.prizeDescription !== undefined) updateProps.prizeDescription = dto.prizeDescription;
    if (dto.numberOfWinners !== undefined) updateProps.numberOfWinners = dto.numberOfWinners;
    if (dto.startDate !== undefined) updateProps.startDate = dto.startDate;
    if (dto.endDate !== undefined) updateProps.endDate = dto.endDate;
    if (dto.address !== undefined || dto.latitude !== undefined || dto.longitude !== undefined) {
      updateProps.location = {
        address: dto.address ?? existingEgg.location.address,
        latitude: dto.latitude ?? existingEgg.location.latitude,
        longitude: dto.longitude ?? existingEgg.location.longitude,
      };
    }
    const updatedEgg = existingEgg.update(updateProps);
    return this.updateEntity(id, updatedEgg);
  }

  async updateImageUrl(id: string, imageUrl: string): Promise<EasterEgg> {
    this.logger.log(`Updating image URL for easter egg ${id}`);
    const existingEgg = await this.findById(id);
    if (!existingEgg) {
      throw new NotFoundException('Easter egg not found');
    }
    const updatedEgg = existingEgg.update({ imageUrl });
    return this.updateEntity(id, updatedEgg);
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting easter egg with id: ${id}`);
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Easter egg not found');
    }
    await docRef.delete();
    this.logger.log(`Deleted easter egg with id: ${id}`);
  }
}
