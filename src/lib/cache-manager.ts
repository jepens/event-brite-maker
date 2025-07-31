export interface CacheItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  version?: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  version?: string; // Cache version for invalidation
  maxSize?: number; // Maximum number of items
}

export class CacheManager {
  private static instance: CacheManager;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_MAX_SIZE = 50;
  private readonly CACHE_PREFIX = 'event_app_cache_';
  private readonly VERSION_KEY = 'event_app_cache_version';

  private constructor() {
    this.cleanup();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Set cache item
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    try {
      const { ttl = this.DEFAULT_TTL, version, maxSize = this.DEFAULT_MAX_SIZE } = options;
      
      const cacheKey = this.getCacheKey(key);
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version
      };

      // Check cache size and remove oldest items if needed
      this.enforceMaxSize(maxSize);

      localStorage.setItem(cacheKey, JSON.stringify(item));
      
      // Update version if provided
      if (version) {
        this.setVersion(version);
      }
    } catch (error) {
      console.warn('Failed to set cache item:', error);
      // If localStorage fails, fall back to memory cache
      this.setMemoryCache(key, data, options);
    }
  }

  // Get cache item
  get<T>(key: string, options: CacheOptions = {}): T | null {
    try {
      const cacheKey = this.getCacheKey(key);
      const itemStr = localStorage.getItem(cacheKey);
      
      if (!itemStr) {
        return null;
      }

      const item: CacheItem<T> = JSON.parse(itemStr);
      
      // Check if item is expired
      if (this.isExpired(item)) {
        this.delete(key);
        return null;
      }

      // Check version compatibility
      if (options.version && item.version && item.version !== options.version) {
        this.delete(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to get cache item:', error);
      // Fall back to memory cache
      return this.getMemoryCache<T>(key);
    }
  }

  // Delete cache item
  delete(key: string): void {
    try {
      const cacheKey = this.getCacheKey(key);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Failed to delete cache item:', error);
      this.deleteMemoryCache(key);
    }
  }

  // Clear all cache
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
      this.clearMemoryCache();
    }
  }

  // Get cache statistics
  getStats(): { totalItems: number; totalSize: number; expiredItems: number } {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      let expiredItems = 0;

      cacheKeys.forEach(key => {
        try {
          const itemStr = localStorage.getItem(key);
          if (itemStr) {
            totalSize += itemStr.length;
            const item: CacheItem = JSON.parse(itemStr);
            if (this.isExpired(item)) {
              expiredItems++;
            }
          }
        } catch {
          // Ignore corrupted items
        }
      });

      return {
        totalItems: cacheKeys.length,
        totalSize,
        expiredItems
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return { totalItems: 0, totalSize: 0, expiredItems: 0 };
    }
  }

  // Cleanup expired items
  cleanup(): void {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      cacheKeys.forEach(key => {
        try {
          const itemStr = localStorage.getItem(key);
          if (itemStr) {
            const item: CacheItem = JSON.parse(itemStr);
            if (this.isExpired(item)) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Remove corrupted items
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup cache:', error);
    }
  }

  // Invalidate cache by pattern
  invalidatePattern(pattern: string): void {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      cacheKeys.forEach(key => {
        if (key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to invalidate cache pattern:', error);
    }
  }

  // Private methods
  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  private enforceMaxSize(maxSize: number): void {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length >= maxSize) {
        // Get all cache items with timestamps
        const items = cacheKeys.map(key => {
          try {
            const itemStr = localStorage.getItem(key);
            if (itemStr) {
              const item: CacheItem = JSON.parse(itemStr);
              return { key, timestamp: item.timestamp };
            }
          } catch {
            // Ignore corrupted items
          }
          return null;
        }).filter(Boolean);

        // Sort by timestamp (oldest first)
        items.sort((a, b) => a!.timestamp - b!.timestamp);

        // Remove oldest items
        const itemsToRemove = items.slice(0, items.length - maxSize + 1);
        itemsToRemove.forEach(item => {
          if (item) {
            localStorage.removeItem(item.key);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to enforce max size:', error);
    }
  }

  private setVersion(version: string): void {
    try {
      localStorage.setItem(this.VERSION_KEY, version);
    } catch (error) {
      console.warn('Failed to set cache version:', error);
    }
  }

  // Memory cache fallback
  private memoryCache = new Map<string, CacheItem<unknown>>();

  private setMemoryCache<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { ttl = this.DEFAULT_TTL, version } = options;
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version
    };
    this.memoryCache.set(key, item);
  }

  private getMemoryCache<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (!item || this.isExpired(item)) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.data as T;
  }

  private deleteMemoryCache(key: string): void {
    this.memoryCache.delete(key);
  }

  private clearMemoryCache(): void {
    this.memoryCache.clear();
  }
}

// Global cache manager instance
export const cacheManager = CacheManager.getInstance();

// React hook for cache management
export function useCache() {
  const setCache = (key: string, data: unknown, options?: CacheOptions) => {
    cacheManager.set(key, data, options);
  };

  const getCache = <T,>(key: string, options?: CacheOptions): T | null => {
    return cacheManager.get<T>(key, options);
  };

  const deleteCache = (key: string) => {
    cacheManager.delete(key);
  };

  const clearCache = () => {
    cacheManager.clear();
  };

  const invalidatePattern = (pattern: string) => {
    cacheManager.invalidatePattern(pattern);
  };

  return {
    setCache,
    getCache,
    deleteCache,
    clearCache,
    invalidatePattern,
    getStats: cacheManager.getStats.bind(cacheManager)
  };
}

// Predefined cache keys
export const CACHE_KEYS = {
  EVENTS: 'events',
  REGISTRATIONS: 'registrations',
  USER_PROFILE: 'user_profile',
  EVENT_DETAILS: 'event_details',
  CHECKIN_REPORT: 'checkin_report',
  STATISTICS: 'statistics'
} as const;

// Cache versions for invalidation
export const CACHE_VERSIONS = {
  EVENTS: 'v1.0',
  REGISTRATIONS: 'v1.0',
  USER_PROFILE: 'v1.0',
  EVENT_DETAILS: 'v1.0',
  CHECKIN_REPORT: 'v1.0',
  STATISTICS: 'v1.0'
} as const; 