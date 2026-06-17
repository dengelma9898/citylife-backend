import {
  createCacheModuleOptions,
  getDefaultCacheMaxItems,
  getDefaultCacheTtlMs,
} from './cache.config';

describe('CacheConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CACHE_TTL_MS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getDefaultCacheTtlMs', () => {
    it('should return 300000 by default', () => {
      expect(getDefaultCacheTtlMs()).toBe(300000);
    });

    it('should use CACHE_TTL_MS when set', () => {
      process.env.CACHE_TTL_MS = '600000';
      expect(getDefaultCacheTtlMs()).toBe(600000);
    });
  });

  describe('getDefaultCacheMaxItems', () => {
    it('should return 50 in dev', () => {
      process.env.NODE_ENV = 'dev';
      expect(getDefaultCacheMaxItems()).toBe(50);
    });

    it('should return 100 in production', () => {
      process.env.NODE_ENV = 'prd';
      expect(getDefaultCacheMaxItems()).toBe(100);
    });
  });

  describe('createCacheModuleOptions', () => {
    it('should return in-memory options', () => {
      process.env.NODE_ENV = 'dev';
      const options = createCacheModuleOptions();
      expect(options.ttl).toBe(300000);
      expect(options.max).toBe(50);
      expect(options.store).toBeUndefined();
    });
  });
});
