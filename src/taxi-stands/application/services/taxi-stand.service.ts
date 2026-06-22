import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { TaxiStand, TaxiStandProps } from '../../domain/entities/taxi-stand.entity';
import { CreateTaxiStandDto } from '../../dto/create-taxi-stand.dto';
import { UpdateTaxiStandDto } from '../../dto/update-taxi-stand.dto';

@Injectable()
export class TaxiStandService {
  private readonly logger = new Logger(TaxiStandService.name);
  private readonly collection = 'taxiStands';
  private readonly CACHE_KEY = 'taxi-stands:all';
  private readonly CACHE_TTL = 1800000;

  constructor(
    private readonly firebaseService: FirebaseService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private toTaxiStandProps(data: Record<string, unknown>, id: string): TaxiStandProps {
    return {
      id,
      title: data.title as string,
      description: data.description as string,
      numberOfTaxis: data.numberOfTaxis as number,
      phoneNumber: data.phoneNumber as string,
      location: (data.location as TaxiStandProps['location']) || {
        address: '',
        latitude: 0,
        longitude: 0,
      },
      phoneClickTimestamps: (data.phoneClickTimestamps as string[]) || [],
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
    };
  }

  async findById(id: string): Promise<TaxiStand | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return TaxiStand.fromProps(this.toTaxiStandProps(doc.data() as Record<string, unknown>, doc.id));
  }

  async updateEntity(id: string, taxiStand: TaxiStand): Promise<TaxiStand> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Taxi stand not found');
    }
    await docRef.update(toFirestoreData(taxiStand));
    this.logger.log(`Updated taxi stand with id: ${id}`);
    await this.invalidateCache();
    return TaxiStand.fromProps({
      ...taxiStand.toJSON(),
      id,
    });
  }

  async getAll(): Promise<TaxiStand[]> {
    const cached = await this.cacheManager.get<TaxiStand[]>(this.CACHE_KEY);
    if (cached) {
      this.logger.debug('Cache hit for taxi stands');
      return cached;
    }
    this.logger.debug('Cache miss for taxi stands, fetching from DB');
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).get();
    const taxiStands = snapshot.docs.map(doc =>
      TaxiStand.fromProps(this.toTaxiStandProps(doc.data() as Record<string, unknown>, doc.id)),
    );
    await this.cacheManager.set(this.CACHE_KEY, taxiStands, this.CACHE_TTL);
    return taxiStands;
  }

  async getById(id: string): Promise<TaxiStand> {
    this.logger.log(`Getting taxi stand with id: ${id}`);
    const taxiStand = await this.findById(id);
    if (!taxiStand) {
      throw new NotFoundException('Taxi stand not found');
    }
    return taxiStand;
  }

  async create(dto: CreateTaxiStandDto): Promise<TaxiStand> {
    this.logger.log(`Creating taxi stand: ${dto.address}`);
    const taxiStand = TaxiStand.create({
      title: dto.title,
      description: dto.description,
      numberOfTaxis: dto.numberOfTaxis,
      phoneNumber: dto.phoneNumber,
      location: {
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
    const db = this.firebaseService.getFirestore();
    const docRef = await db.collection(this.collection).add(toFirestoreData(taxiStand));
    this.logger.log(`Created taxi stand with id: ${docRef.id}`);
    const created = TaxiStand.fromProps({
      ...taxiStand.toJSON(),
      id: docRef.id,
    });
    await this.invalidateCache();
    return created;
  }

  async update(id: string, dto: UpdateTaxiStandDto): Promise<TaxiStand> {
    this.logger.log(`Updating taxi stand with id: ${id}`);
    const existingTaxiStand = await this.findById(id);
    if (!existingTaxiStand) {
      throw new NotFoundException('Taxi stand not found');
    }
    const updateProps: Record<string, unknown> = {};
    if (dto.title !== undefined) updateProps.title = dto.title;
    if (dto.description !== undefined) updateProps.description = dto.description;
    if (dto.numberOfTaxis !== undefined) updateProps.numberOfTaxis = dto.numberOfTaxis;
    if (dto.phoneNumber !== undefined) updateProps.phoneNumber = dto.phoneNumber;
    if (dto.address !== undefined || dto.latitude !== undefined || dto.longitude !== undefined) {
      updateProps.location = {
        address: dto.address ?? existingTaxiStand.location.address,
        latitude: dto.latitude ?? existingTaxiStand.location.latitude,
        longitude: dto.longitude ?? existingTaxiStand.location.longitude,
      };
    }
    const updatedTaxiStand = existingTaxiStand.update(updateProps);
    const updated = await this.updateEntity(id, updatedTaxiStand);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting taxi stand with id: ${id}`);
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Taxi stand not found');
    }
    await docRef.delete();
    this.logger.log(`Deleted taxi stand with id: ${id}`);
    await this.invalidateCache();
  }

  private async invalidateCache(): Promise<void> {
    await this.cacheManager.del(this.CACHE_KEY);
    this.logger.debug('Taxi stands cache invalidated');
  }
}
