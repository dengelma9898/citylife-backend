import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { CuratedSpot, CuratedSpotProps } from '../../domain/entities/curated-spot.entity';
import {
  CuratedSpotRepository,
  CURATED_SPOT_REPOSITORY,
} from '../../domain/repositories/curated-spot.repository';
import { CuratedSpotStatus } from '../../domain/enums/curated-spot-status.enum';
import { CreateCuratedSpotDto } from '../../dto/create-curated-spot.dto';
import { UpdateCuratedSpotDto } from '../../dto/update-curated-spot.dto';
import { SpotKeywordsService } from './spot-keywords.service';

@Injectable()
export class CuratedSpotsService {
  constructor(
    @Inject(CURATED_SPOT_REPOSITORY)
    private readonly curatedSpotRepository: CuratedSpotRepository,
    private readonly spotKeywordsService: SpotKeywordsService,
  ) {}

  public static parseKeywordIdsFromQuery(value?: string | string[]): string[] {
    if (value === undefined || value === null) {
      return [];
    }
    const parts: string[] = (Array.isArray(value) ? value : [value]).flatMap(part =>
      String(part)
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0),
    );
    return [...new Set(parts)];
  }

  /**
   * Active curated spots (app). Optional name prefix and multiple keyword IDs (AND).
   */
  public async searchActive(
    namePrefix?: string,
    keywordIds: string[] = [],
  ): Promise<CuratedSpot[]> {
    const uniqueKeywordIds = [...new Set(keywordIds.filter(id => id.length > 0))];
    const prefix = namePrefix?.trim() ?? '';
    let candidates: CuratedSpot[];
    if (uniqueKeywordIds.length > 0) {
      candidates = await this.curatedSpotRepository.findActiveNotDeletedByKeywordContains(
        uniqueKeywordIds[0],
      );
    } else if (prefix.length > 0) {
      candidates = await this.curatedSpotRepository.findActiveNotDeletedByNameLowerPrefix(prefix);
    } else {
      candidates = await this.curatedSpotRepository.findAllActiveNotDeleted();
    }
    let results = candidates;
    if (uniqueKeywordIds.length > 0) {
      results = results.filter(spot =>
        uniqueKeywordIds.every(requiredId => spot.keywordIds.includes(requiredId)),
      );
    }
    if (prefix.length > 0) {
      const nameLowerPrefix = CuratedSpot.normalizeNameLower(prefix);
      results = results.filter(spot => spot.nameLower.startsWith(nameLowerPrefix));
    }
    return results;
  }

  public async listActiveForApp(): Promise<CuratedSpot[]> {
    return this.curatedSpotRepository.findAllActiveNotDeleted();
  }

  public async listAllForAdmin(): Promise<CuratedSpot[]> {
    const all = await this.curatedSpotRepository.findAll();
    return all.filter(s => !s.isDeleted);
  }

  public async getByIdForApp(id: string): Promise<CuratedSpot> {
    const spot = await this.curatedSpotRepository.findById(id);
    if (!spot || spot.isDeleted || spot.status !== CuratedSpotStatus.ACTIVE) {
      throw new NotFoundException('Curated spot not found');
    }
    return spot;
  }

  public async getByIdForAdmin(id: string): Promise<CuratedSpot> {
    const spot = await this.curatedSpotRepository.findById(id);
    if (!spot) {
      throw new NotFoundException('Curated spot not found');
    }
    return spot;
  }

  public async create(dto: CreateCuratedSpotDto, createdByUserId: string): Promise<CuratedSpot> {
    const baseIds = dto.keywordIds ?? [];
    const fromNames =
      dto.newKeywordNames !== undefined && dto.newKeywordNames.length > 0
        ? await this.spotKeywordsService.resolveNewKeywordNamesToIds(dto.newKeywordNames)
        : [];
    const mergedKeywordIds = [...new Set([...baseIds, ...fromNames])];
    const spot = CuratedSpot.create({
      name: dto.name,
      descriptionMarkdown: dto.descriptionMarkdown,
      keywordIds: mergedKeywordIds,
      imageUrls: [],
      address: dto.address,
      videoUrl: dto.videoUrl ?? null,
      instagramUrl: dto.instagramUrl ?? null,
      status: dto.status ?? CuratedSpotStatus.PENDING,
      createdByUserId,
    });
    return this.curatedSpotRepository.create(spot);
  }

  public async update(id: string, dto: UpdateCuratedSpotDto): Promise<CuratedSpot> {
    const existing = await this.curatedSpotRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Curated spot not found');
    }
    let mergedKeywordIds = existing.keywordIds;
    if (dto.keywordIds !== undefined) {
      mergedKeywordIds = [...dto.keywordIds];
    }
    if (dto.newKeywordNames !== undefined && dto.newKeywordNames.length > 0) {
      const resolved = await this.spotKeywordsService.resolveNewKeywordNamesToIds(
        dto.newKeywordNames,
      );
      mergedKeywordIds = [...new Set([...mergedKeywordIds, ...resolved])];
    }
    const patch: Partial<Omit<CuratedSpotProps, 'id' | 'createdAt'>> = {};
    if (dto.name !== undefined) {
      patch.name = dto.name;
    }
    if (dto.descriptionMarkdown !== undefined) {
      patch.descriptionMarkdown = dto.descriptionMarkdown;
    }
    if (dto.address !== undefined) {
      patch.address = dto.address;
    }
    if (
      dto.keywordIds !== undefined ||
      (dto.newKeywordNames !== undefined && dto.newKeywordNames.length > 0)
    ) {
      patch.keywordIds = mergedKeywordIds;
    }
    if (dto.videoUrl !== undefined) {
      patch.videoUrl = dto.videoUrl;
    }
    if (dto.instagramUrl !== undefined) {
      patch.instagramUrl = dto.instagramUrl;
    }
    if (dto.status !== undefined) {
      patch.status = dto.status;
    }
    if (dto.isDeleted !== undefined) {
      patch.isDeleted = dto.isDeleted;
    }
    const updated = existing.update(patch);
    return this.curatedSpotRepository.update(id, updated);
  }

  public async appendImageUrls(id: string, urls: string[]): Promise<CuratedSpot> {
    if (urls.length === 0) {
      throw new BadRequestException('No image URLs provided');
    }
    const existing = await this.curatedSpotRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Curated spot not found');
    }
    const merged = [...(existing.imageUrls ?? []), ...urls];
    const updated = existing.update({ imageUrls: merged });
    return this.curatedSpotRepository.update(id, updated);
  }

  public async softDelete(id: string): Promise<CuratedSpot> {
    const existing = await this.curatedSpotRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Curated spot not found');
    }
    const updated = existing.update({ isDeleted: true });
    return this.curatedSpotRepository.update(id, updated);
  }
}
