import { CacheModuleOptions } from '@nestjs/cache-manager';

/**
 * Returns the default cache TTL in milliseconds.
 */
export function getDefaultCacheTtlMs(): number {
  return parseInt(process.env.CACHE_TTL_MS || '300000', 10);
}

/**
 * Returns the maximum number of cached items (LRU eviction).
 */
export function getDefaultCacheMaxItems(): number {
  return process.env.NODE_ENV === 'dev' ? 50 : 100;
}

/**
 * Creates in-memory CacheModule options.
 * Shared cache (e.g. Redis) is intentionally not used – see docs/configuration-values.md.
 */
export function createCacheModuleOptions(): CacheModuleOptions {
  return {
    ttl: getDefaultCacheTtlMs(),
    max: getDefaultCacheMaxItems(),
  };
}
