import { Event } from '../interfaces/event.interface';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface EventsListFacets {
  pendingCount?: number;
  monthOptions: { key: string; label: string }[];
}

export interface EventsListResponse {
  data: Event[];
  meta: PaginationMeta;
  facets?: EventsListFacets;
}

export interface EventsCountResponse {
  count: number;
}
