import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { EventCategoriesService } from '../event-categories/services/event-categories.service';
import { BusinessCategoriesService } from '../business-categories/application/services/business-categories.service';
import { KeywordsService } from '../keywords/keywords.service';
import { DowntimeService } from '../downtime/downtime.service';
import { AppVersionsService } from '../app-versions/application/services/app-versions.service';
import { UsersService } from '../users/users.service';
import {
  BootstrapPublicPayload,
  BootstrapResponse,
} from './interfaces/bootstrap-payload.interface';

@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);
  private readonly CACHE_KEY_PREFIX = 'bootstrap:public';
  private readonly CACHE_TTL = 300000;

  constructor(
    private readonly appSettingsService: AppSettingsService,
    private readonly eventCategoriesService: EventCategoriesService,
    private readonly businessCategoriesService: BusinessCategoriesService,
    private readonly keywordsService: KeywordsService,
    private readonly downtimeService: DowntimeService,
    private readonly appVersionsService: AppVersionsService,
    private readonly usersService: UsersService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async getBootstrap(userId: string, version?: string): Promise<BootstrapResponse> {
    const publicPayload = await this.getPublicPayload(version);
    const userProfile = await this.usersService.getById(userId);
    return {
      ...publicPayload,
      userProfile,
    };
  }

  private buildCacheKey(version?: string): string {
    if (version) {
      return `${this.CACHE_KEY_PREFIX}:${version}`;
    }
    return this.CACHE_KEY_PREFIX;
  }

  private async getPublicPayload(version?: string): Promise<BootstrapPublicPayload> {
    const cacheKey = this.buildCacheKey(version);
    const cached = await this.cacheManager.get<BootstrapPublicPayload>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for bootstrap bundle (${cacheKey})`);
      return cached;
    }
    this.logger.debug(`Cache miss for bootstrap bundle (${cacheKey}), fetching from services`);
    const [appSettings, eventCategories, businessCategories, keywords, isDowntime] =
      await Promise.all([
        this.appSettingsService.getAll(),
        this.eventCategoriesService.findAll(),
        this.businessCategoriesService.getAll(),
        this.keywordsService.getAll(),
        this.downtimeService.getIsDowntime(),
      ]);
    const payload: BootstrapPublicPayload = {
      appSettings,
      eventCategories,
      businessCategories,
      keywords,
      downtime: { isDowntime },
    };
    if (version) {
      const requiresUpdate = await this.appVersionsService.checkVersion(version);
      const changelog = await this.appVersionsService.getChangelogForVersion(version);
      payload.appVersion = {
        requiresUpdate,
        ...(changelog?.content !== undefined && { changelogContent: changelog.content }),
      };
    }
    await this.cacheManager.set(cacheKey, payload, this.CACHE_TTL);
    return payload;
  }
}
