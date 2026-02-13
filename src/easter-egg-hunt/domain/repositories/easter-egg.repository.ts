import { EasterEgg } from '../entities/easter-egg.entity';

export const EASTER_EGG_REPOSITORY = 'EASTER_EGG_REPOSITORY';

export interface EasterEggRepository {
  findAll(): Promise<EasterEgg[]>;
  findById(id: string): Promise<EasterEgg | null>;
  create(egg: EasterEgg): Promise<EasterEgg>;
  update(id: string, egg: EasterEgg): Promise<EasterEgg>;
  delete(id: string): Promise<void>;
}
