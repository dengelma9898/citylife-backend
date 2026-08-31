import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { getDefaultCacheTtlMs } from '../../../core/cache/cache.config';
import { EventsService } from '../../events.service';
import { EventsListQueryDto } from '../../dto/events-list-query.dto';
import {
  EventsCountResponse,
  EventsListResponse,
} from '../../dto/events-list-response.dto';
import { Event } from '../../interfaces/event.interface';
import { EventStatus } from '../../enums/event-status.enum';
import { EVENTS_LIST_CACHE_KEY } from '../../constants/events-list-cache.constants';
import { buildMonthOptions } from '../../utils/event-list-date.util';
import {
  EventListFilterParams,
  filterEvents,
  filterEventsByApproval,
  requiresModerationAccess,
} from '../../utils/event-list-filter.util';
import { paginateEvents, sortEvents } from '../../utils/event-list-sort.util';
import { EventsCountQueryDto } from '../../dto/events-list-query.dto';

@Injectable()
export class EventsListQueryService {
  private readonly logger = new Logger(EventsListQueryService.name);
  private readonly cacheTtl = getDefaultCacheTtlMs();

  constructor(
    private readonly eventsService: EventsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async queryEvents(
    query: EventsListQueryDto,
    isAdmin: boolean,
  ): Promise<EventsListResponse> {
    this.assertModerationAccess(query.approval, isAdmin);
    const allEvents = await this.loadAllEvents();
    const scopedEvents = filterEventsByApproval(allEvents, query.approval, isAdmin);
    const filteredEvents = filterEvents(scopedEvents, this.toFilterParams(query, isAdmin));
    const sortedEvents = sortEvents(
      filteredEvents,
      query.sort ?? 'startDate',
      query.order ?? 'desc',
    );
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const paginated = paginateEvents(sortedEvents, page, limit);
    const response: EventsListResponse = {
      data: paginated.data,
      meta: {
        page,
        limit,
        total: paginated.total,
        totalPages: paginated.totalPages,
        hasNextPage: paginated.hasNextPage,
        hasPreviousPage: paginated.hasPreviousPage,
      },
    };
    if (query.facets) {
      response.facets = this.buildFacets(allEvents, isAdmin);
    }
    return response;
  }

  public async countEvents(
    query: EventsCountQueryDto,
    isAdmin: boolean,
  ): Promise<EventsCountResponse> {
    this.assertModerationAccess(query.approval, isAdmin);
    const allEvents = await this.loadAllEvents();
    const scopedEvents = filterEventsByApproval(allEvents, query.approval, isAdmin);
    const filteredEvents = filterEvents(scopedEvents, this.toFilterParams(query, isAdmin));
    return { count: filteredEvents.length };
  }

  public async getFilteredEventsForExport(
    query: EventsCountQueryDto,
    isAdmin: boolean,
  ): Promise<Event[]> {
    this.assertModerationAccess(query.approval, isAdmin);
    const allEvents = await this.loadAllEvents();
    const scopedEvents = filterEventsByApproval(allEvents, query.approval, isAdmin);
    const filteredEvents = filterEvents(scopedEvents, this.toFilterParams(query, isAdmin));
    return sortEvents(filteredEvents, 'startDate', 'desc');
  }

  public async invalidateListCache(): Promise<void> {
    await this.cacheManager.del(EVENTS_LIST_CACHE_KEY);
    this.logger.debug('Events list cache invalidated');
  }

  private async loadAllEvents(): Promise<Event[]> {
    const cached = await this.cacheManager.get<Event[]>(EVENTS_LIST_CACHE_KEY);
    if (cached) {
      this.logger.debug('Cache hit for events list');
      return cached;
    }
    this.logger.debug('Cache miss for events list, fetching from DB');
    const events = await this.eventsService.getAllUnfiltered();
    await this.cacheManager.set(EVENTS_LIST_CACHE_KEY, events, this.cacheTtl);
    return events;
  }

  private buildFacets(events: Event[], isAdmin: boolean) {
    const facets = {
      monthOptions: buildMonthOptions(events),
    } as EventsListResponse['facets'];
    if (isAdmin) {
      facets.pendingCount = events.filter(event => event.status === EventStatus.PENDING).length;
    }
    return facets;
  }

  private assertModerationAccess(approval: string | undefined, isAdmin: boolean): void {
    if (!isAdmin && requiresModerationAccess(approval)) {
      throw new ForbiddenException();
    }
  }

  private toFilterParams(
    query: EventsCountQueryDto | EventsListQueryDto,
    isAdmin: boolean,
  ): EventListFilterParams {
    return {
      q: query.q,
      status: query.status ?? 'all',
      approval: query.approval ?? (isAdmin ? 'all' : 'active'),
      category: query.category ?? 'all',
      date: query.date ?? 'all',
      time: query.time ?? 'all',
      week: query.week,
      month: query.month,
    };
  }
}
