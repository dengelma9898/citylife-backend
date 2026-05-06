import { Injectable, Inject, Logger } from '@nestjs/common';
import { SpotKeyword } from '../../domain/entities/spot-keyword.entity';
import {
  SpotKeywordRepository,
  SPOT_KEYWORD_REPOSITORY,
} from '../../domain/repositories/spot-keyword.repository';
import { CreateSpotKeywordDto } from '../../dto/create-spot-keyword.dto';

@Injectable()
export class SpotKeywordsService {
  private readonly logger = new Logger(SpotKeywordsService.name);

  constructor(
    @Inject(SPOT_KEYWORD_REPOSITORY)
    private readonly spotKeywordRepository: SpotKeywordRepository,
  ) {}

  /**
   * Returns existing spot keywords whose nameLower has the given prefix (Firestore range query).
   */
  public async suggestByPrefix(prefix: string, limit: number = 20): Promise<SpotKeyword[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    return this.spotKeywordRepository.suggestByNameLowerPrefix(prefix, safeLimit);
  }

  public async findById(id: string): Promise<SpotKeyword | null> {
    return this.spotKeywordRepository.findById(id);
  }

  public async create(dto: CreateSpotKeywordDto): Promise<SpotKeyword> {
    const nameLower = SpotKeyword.normalizeNameLower(dto.name);
    const existing = await this.spotKeywordRepository.findByNameLower(nameLower);
    if (existing) {
      this.logger.debug(`Spot keyword already exists: ${existing.id}`);
      return existing;
    }
    const keyword = SpotKeyword.create({ name: dto.name });
    return this.spotKeywordRepository.create(keyword);
  }

  /**
   * Resolves display names to spot keyword document IDs, creating missing keywords.
   */
  public async resolveNewKeywordNamesToIds(names: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const raw of names) {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        continue;
      }
      const nameLower = SpotKeyword.normalizeNameLower(trimmed);
      let keyword = await this.spotKeywordRepository.findByNameLower(nameLower);
      if (!keyword) {
        keyword = await this.spotKeywordRepository.create(SpotKeyword.create({ name: trimmed }));
      }
      if (!ids.includes(keyword.id)) {
        ids.push(keyword.id);
      }
    }
    return ids;
  }
}
