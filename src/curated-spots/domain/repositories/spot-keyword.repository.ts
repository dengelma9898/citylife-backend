import { SpotKeyword } from '../entities/spot-keyword.entity';

export const SPOT_KEYWORD_REPOSITORY = 'SPOT_KEYWORD_REPOSITORY';

export interface SpotKeywordRepository {
  findById(id: string): Promise<SpotKeyword | null>;
  findByNameLower(nameLower: string): Promise<SpotKeyword | null>;
  suggestByNameLowerPrefix(prefix: string, limit: number): Promise<SpotKeyword[]>;
  create(keyword: SpotKeyword): Promise<SpotKeyword>;
}
