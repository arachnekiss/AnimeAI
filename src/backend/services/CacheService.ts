import Redis from 'ioredis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
  serialize?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

interface CacheEntry<T = any> {
  value: T;
  createdAt: number;
  expiresAt?: number;
  accessCount: number;
  lastAccessed: number;
}

export class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private useRedis: boolean = false;
  private defaultTTL: number = 3600; // 1 hour
  private maxMemoryEntries: number = 10000;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  };
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.initializeRedis();
    this.startCleanupInterval();
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL;
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379');
      const redisPassword = process.env.REDIS_PASSWORD;

      if (redisUrl) {
        this.redis = new Redis(redisUrl);
      } else {
        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        });
      }

      // Test connection
      await this.redis.ping();
      this.useRedis = true;
      console.log('Redis cache initialized successfully');
    } catch (error) {
      console.warn('Redis not available, falling back to memory cache:', error.message);
      this.redis = null;
      this.useRedis = false;
    }
  }

  async get<T = any>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.namespace);

    try {
      if (this.useRedis && this.redis) {
        const value = await this.redis.get(fullKey);
        if (value !== null) {
          this.stats.hits++;
          const parsed = options?.serialize !== false ? JSON.parse(value) : value;
          return parsed as T;
        }
      } else {
        const entry = this.memoryCache.get(fullKey);
        if (entry) {
          // Check expiration
          if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.memoryCache.delete(fullKey);
            this.stats.misses++;
            return null;
          }

          // Update access stats
          entry.accessCount++;
          entry.lastAccessed = Date.now();
          this.stats.hits++;
          return entry.value as T;
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  async set<T = any>(key: string, value: T, ttl?: number, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.namespace);
    const timeToLive = ttl || options?.ttl || this.defaultTTL;

    try {
      if (this.useRedis && this.redis) {
        const serialized = options?.serialize !== false ? JSON.stringify(value) : value as string;
        if (timeToLive > 0) {
          await this.redis.setex(fullKey, timeToLive, serialized);
        } else {
          await this.redis.set(fullKey, serialized);
        }
      } else {
        // Memory cache with size limit
        if (this.memoryCache.size >= this.maxMemoryEntries) {
          this.evictLeastRecentlyUsed();
        }

        const entry: CacheEntry<T> = {
          value,
          createdAt: Date.now(),
          expiresAt: timeToLive > 0 ? Date.now() + (timeToLive * 1000) : undefined,
          accessCount: 0,
          lastAccessed: Date.now()
        };

        this.memoryCache.set(fullKey, entry);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.namespace);

    try {
      if (this.useRedis && this.redis) {
        const result = await this.redis.del(fullKey);
        this.stats.deletes++;
        return result > 0;
      } else {
        const result = this.memoryCache.delete(fullKey);
        this.stats.deletes++;
        return result;
      }
    } catch (error) {
      console.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.namespace);

    try {
      if (this.useRedis && this.redis) {
        const result = await this.redis.exists(fullKey);
        return result === 1;
      } else {
        const entry = this.memoryCache.get(fullKey);
        if (!entry) return false;

        // Check expiration
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          this.memoryCache.delete(fullKey);
          return false;
        }

        return true;
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async clear(namespace?: string): Promise<boolean> {
    try {
      if (this.useRedis && this.redis) {
        if (namespace) {
          const pattern = this.buildKey('*', namespace);
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          await this.redis.flushdb();
        }
      } else {
        if (namespace) {
          const prefix = `${namespace}:`;
          for (const key of this.memoryCache.keys()) {
            if (key.startsWith(prefix)) {
              this.memoryCache.delete(key);
            }
          }
        } else {
          this.memoryCache.clear();
        }
      }

      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async keys(pattern: string, namespace?: string): Promise<string[]> {
    try {
      const fullPattern = this.buildKey(pattern, namespace);

      if (this.useRedis && this.redis) {
        const keys = await this.redis.keys(fullPattern);
        return keys.map(key => this.stripNamespace(key, namespace));
      } else {
        const matchingKeys: string[] = [];
        const prefix = namespace ? `${namespace}:` : '';
        
        for (const key of this.memoryCache.keys()) {
          if (key.startsWith(prefix)) {
            const strippedKey = this.stripNamespace(key, namespace);
            if (this.matchPattern(strippedKey, pattern)) {
              matchingKeys.push(strippedKey);
            }
          }
        }

        return matchingKeys;
      }
    } catch (error) {
      console.error('Cache keys error:', error);
      this.stats.errors++;
      return [];
    }
  }

  async mget<T = any>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    const fullKeys = keys.map(key => this.buildKey(key, options?.namespace));
    const results: (T | null)[] = [];

    try {
      if (this.useRedis && this.redis) {
        const values = await this.redis.mget(...fullKeys);
        for (const value of values) {
          if (value !== null) {
            this.stats.hits++;
            const parsed = options?.serialize !== false ? JSON.parse(value) : value;
            results.push(parsed as T);
          } else {
            this.stats.misses++;
            results.push(null);
          }
        }
      } else {
        for (const fullKey of fullKeys) {
          const entry = this.memoryCache.get(fullKey);
          if (entry && (!entry.expiresAt || Date.now() <= entry.expiresAt)) {
            entry.accessCount++;
            entry.lastAccessed = Date.now();
            this.stats.hits++;
            results.push(entry.value as T);
          } else {
            this.stats.misses++;
            results.push(null);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Cache mget error:', error);
      this.stats.errors++;
      return keys.map(() => null);
    }
  }

  async mset<T = any>(pairs: Array<[string, T]>, ttl?: number, options?: CacheOptions): Promise<boolean> {
    try {
      if (this.useRedis && this.redis) {
        const pipeline = this.redis.pipeline();
        const timeToLive = ttl || options?.ttl || this.defaultTTL;

        for (const [key, value] of pairs) {
          const fullKey = this.buildKey(key, options?.namespace);
          const serialized = options?.serialize !== false ? JSON.stringify(value) : value as string;
          
          if (timeToLive > 0) {
            pipeline.setex(fullKey, timeToLive, serialized);
          } else {
            pipeline.set(fullKey, serialized);
          }
        }

        await pipeline.exec();
      } else {
        const timeToLive = ttl || options?.ttl || this.defaultTTL;

        for (const [key, value] of pairs) {
          const fullKey = this.buildKey(key, options?.namespace);
          
          if (this.memoryCache.size >= this.maxMemoryEntries) {
            this.evictLeastRecentlyUsed();
          }

          const entry: CacheEntry<T> = {
            value,
            createdAt: Date.now(),
            expiresAt: timeToLive > 0 ? Date.now() + (timeToLive * 1000) : undefined,
            accessCount: 0,
            lastAccessed: Date.now()
          };

          this.memoryCache.set(fullKey, entry);
        }
      }

      this.stats.sets += pairs.length;
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async increment(key: string, by: number = 1, options?: CacheOptions): Promise<number | null> {
    const fullKey = this.buildKey(key, options?.namespace);

    try {
      if (this.useRedis && this.redis) {
        const result = await this.redis.incrby(fullKey, by);
        return result;
      } else {
        const entry = this.memoryCache.get(fullKey);
        let currentValue = 0;

        if (entry && (!entry.expiresAt || Date.now() <= entry.expiresAt)) {
          currentValue = typeof entry.value === 'number' ? entry.value : 0;
        }

        const newValue = currentValue + by;
        await this.set(fullKey, newValue, undefined, { namespace: '', ...options });
        return newValue;
      }
    } catch (error) {
      console.error('Cache increment error:', error);
      this.stats.errors++;
      return null;
    }
  }

  getStats(): CacheStats & { memoryEntries: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      memoryEntries: this.memoryCache.size,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  isRedisConnected(): boolean {
    return this.useRedis && this.redis !== null;
  }

  // Private methods
  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  private stripNamespace(key: string, namespace?: string): string {
    if (namespace && key.startsWith(`${namespace}:`)) {
      return key.substring(namespace.length + 1);
    }
    return key;
  }

  private matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(key);
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired memory cache entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt && now > entry.expiresAt) {
          this.memoryCache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired cache entries`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.redis) {
      await this.redis.quit();
    }

    this.memoryCache.clear();
    console.log('CacheService cleanup completed');
  }
}
