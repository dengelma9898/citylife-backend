import { TaxiStand } from '../entities/taxi-stand.entity';

export const TAXI_STAND_REPOSITORY = 'TAXI_STAND_REPOSITORY';

export interface TaxiStandRepository {
  findAll(): Promise<TaxiStand[]>;
  findById(id: string): Promise<TaxiStand | null>;
  create(taxiStand: TaxiStand): Promise<TaxiStand>;
  update(id: string, taxiStand: TaxiStand): Promise<TaxiStand>;
  delete(id: string): Promise<void>;
}
