/**
 * Internal entry for LRU/TTL caches.
 */
interface CacheEntry<V> {
  value: V
  expires?: number
}

/**
 * Internal entry for LFU cache with access frequency tracking.
 */
interface FreqEntry<V> {
  value: V
  freq: number
  expires?: number
}

/**
 * Statistics snapshot for cache performance tracking.
 */
export interface CacheStats {
  hits: number
  misses: number
  evictions: number
}

/**
 * Collects cache hit/miss/eviction statistics.
 *
 * @example
 * const stats = new CacheStatsCollector()
 * stats.recordHit()
 * stats.recordHit()
 * stats.recordMiss()
 * stats.getStats() // { hits: 2, misses: 1, evictions: 0 }
 */
export class CacheStatsCollector implements CacheStats {
  hits = 0
  misses = 0
  evictions = 0

  /** Increments the hit count. */
  recordHit(): void {
    this.hits++
  }

  /** Increments the miss count. */
  recordMiss(): void {
    this.misses++
  }

  /** Increments the eviction count. */
  recordEviction(): void {
    this.evictions++
  }

  /** Returns a snapshot of current stats. */
  getStats(): CacheStats {
    return { hits: this.hits, misses: this.misses, evictions: this.evictions }
  }

  /** Resets all counters to zero. */
  reset(): void {
    this.hits = 0
    this.misses = 0
    this.evictions = 0
  }
}

/**
 * Least-recently-used (LRU) cache with optional TTL-based expiry.
 *
 * Evicts the oldest accessed entry when the cache exceeds `max` size.
 * If `ttl` is provided, entries expire after the given milliseconds.
 *
 * @example
 * const cache = new LRUCache<string, number>({ max: 3 })
 * cache.set('a', 1)
 * cache.set('b', 2)
 * cache.get('a') // 1 — bumps 'a' to most-recent
 */
export class LRUCache<K, V> {
  private readonly max: number
  private readonly ttl: number | undefined
  private readonly map = new Map<K, CacheEntry<V>>()

  constructor(opts: { max: number; ttl?: number }) {
    this.max = Math.floor(opts.max)
    this.ttl = opts.ttl
  }

  /**
   * Sets a value for the given key.
   * If the cache is full, evicts the least-recently-used entry.
   * If `ttl` was set, records an expiry timestamp.
   */
  set(key: K, value: V): void {
    if (this.max <= 0) return
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.max) {
      const firstKey = this.map.keys().next().value
      if (firstKey !== undefined) {
        this.map.delete(firstKey)
      }
    }

    this.map.set(key, {
      value,
      expires: this.ttl !== undefined ? Date.now() + this.ttl : undefined,
    })
  }

  /**
   * Retrieves a value by key.
   * Returns `undefined` if the key does not exist or the entry has expired.
   * Bumps the entry to most-recent position on access.
   */
  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (entry === undefined) return undefined

    if (entry.expires !== undefined && Date.now() >= entry.expires) {
      this.map.delete(key)
      return undefined
    }

    // Bump to most-recent position
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  /**
   * Checks if a key exists in the cache (and has not expired).
   */
  has(key: K): boolean {
    if (!this.map.has(key)) return false

    const entry = this.map.get(key)!
    if (entry.expires !== undefined && Date.now() >= entry.expires) {
      this.map.delete(key)
      return false
    }

    return true
  }

  /**
   * Deletes a key from the cache. Returns `true` if the key existed.
   */
  delete(key: K): boolean {
    return this.map.delete(key)
  }

  /** Removes all entries from the cache. */
  clear(): void {
    this.map.clear()
  }

  /** The number of entries currently in the cache. */
  get size(): number {
    return this.map.size
  }
}

/**
 * Least-frequently-used (LFU) cache with optional TTL-based expiry.
 *
 * Evicts the least-frequently accessed entry when the cache exceeds `max` size.
 * Frequency counters increment on every `get` hit.
 *
 * @example
 * const cache = new LFUCache<string, number>({ max: 2 })
 * cache.set('a', 1)
 * cache.set('b', 2)
 * cache.get('a')
 * cache.get('a')
 * cache.set('c', 3) // evicts 'b' (freq=1) instead of 'a' (freq=3)
 */
export class LFUCache<K, V> {
  private readonly max: number
  private readonly ttl: number | undefined
  private readonly map = new Map<K, FreqEntry<V>>()

  constructor(opts: { max: number; ttl?: number }) {
    this.max = Math.floor(opts.max)
    this.ttl = opts.ttl
  }

  /**
   * Sets a value for the given key.
   * If the cache is full, evicts the least-frequently-used entry.
   */
  set(key: K, value: V): void {
    if (this.max <= 0) return
    if (this.map.has(key)) {
      const existing = this.map.get(key)!
      existing.value = value
      if (this.ttl !== undefined) {
        existing.expires = Date.now() + this.ttl
      }
      return
    }

    if (this.map.size >= this.max) {
      this.evictOne()
    }

    this.map.set(key, {
      value,
      freq: 1,
      expires: this.ttl !== undefined ? Date.now() + this.ttl : undefined,
    })
  }

  /**
   * Retrieves a value by key and increments its access frequency.
   * Returns `undefined` if the key does not exist or has expired.
   */
  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (entry === undefined) return undefined

    if (entry.expires !== undefined && Date.now() >= entry.expires) {
      this.map.delete(key)
      return undefined
    }

    entry.freq++
    return entry.value
  }

  /**
   * Checks if a key exists in the cache (and has not expired).
   */
  has(key: K): boolean {
    if (!this.map.has(key)) return false

    const entry = this.map.get(key)!
    if (entry.expires !== undefined && Date.now() >= entry.expires) {
      this.map.delete(key)
      return false
    }

    return true
  }

  /**
   * Deletes a key from the cache. Returns `true` if the key existed.
   */
  delete(key: K): boolean {
    return this.map.delete(key)
  }

  /** Removes all entries from the cache. */
  clear(): void {
    this.map.clear()
  }

  /** The number of entries currently in the cache. */
  get size(): number {
    return this.map.size
  }

  /** Finds and removes the lowest-frequency entry. */
  private evictOne(): void {
    let minFreq = Infinity
    let targetKey: K | undefined

    for (const [key, entry] of this.map) {
      if (entry.freq < minFreq) {
        minFreq = entry.freq
        targetKey = key
      }
    }

    if (targetKey !== undefined) {
      this.map.delete(targetKey)
    }
  }
}

/**
 * Time-to-live (TTL) cache — entries auto-expire after a fixed duration.
 *
 * Optionally limits the number of entries via `max`. When full, the oldest
 * entry is evicted to make room.
 *
 * @example
 * const cache = new TTLCache<string, number>({ ttl: 5000, max: 10 })
 * cache.set('a', 1)
 * // ... after 5 seconds:
 * cache.get('a') // undefined
 */
export class TTLCache<K, V> {
  private readonly ttl: number
  private readonly max: number | undefined
  private readonly map = new Map<K, { value: V; expires: number }>()

  constructor(opts: { ttl: number; max?: number }) {
    this.ttl = opts.ttl
    this.max = opts.max !== undefined ? Math.floor(opts.max) : undefined
  }

  /**
   * Sets a value with an expiry timestamp.
   * If `max` is set and the cache is full, evicts the oldest entry.
   */
  set(key: K, value: V): void {
    if (this.max !== undefined && this.max <= 0) return
    const expires = Date.now() + this.ttl

    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.max !== undefined && this.map.size >= this.max) {
      const firstKey = this.map.keys().next().value
      if (firstKey !== undefined) {
        this.map.delete(firstKey)
      }
    }

    this.map.set(key, { value, expires })
  }

  /**
   * Retrieves a value by key.
   * Returns `undefined` if the key does not exist or the entry has expired.
   */
  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (entry === undefined) return undefined

    if (Date.now() >= entry.expires) {
      this.map.delete(key)
      return undefined
    }

    return entry.value
  }

  /**
   * Checks if a key exists and has not expired.
   */
  has(key: K): boolean {
    if (!this.map.has(key)) return false

    const entry = this.map.get(key)!
    if (Date.now() >= entry.expires) {
      this.map.delete(key)
      return false
    }

    return true
  }

  /**
   * Deletes a key from the cache. Returns `true` if the key existed.
   */
  delete(key: K): boolean {
    return this.map.delete(key)
  }

  /** Removes all entries from the cache. */
  clear(): void {
    this.map.clear()
  }

  /** The number of entries currently in the cache. */
  get size(): number {
    return this.map.size
  }
}

/**
 * Wraps a function with a cache layer.
 *
 * The cache key is derived by `JSON.stringify`-ing the arguments.
 * The provided cache instance (e.g. {@link LRUCache}, {@link LFUCache},
 * {@link TTLCache}) governs eviction and expiry behavior.
 *
 * @example
 * const cache = new LRUCache<string, number>({ max: 100 })
 * const expensive = (n: number) => n * 2
 * const memoized = memoizeWithCache(expensive, cache)
 * memoized(42) // computes and caches
 * memoized(42) // returns from cache
 */
export function memoizeWithCache<K, V>(
  fn: (...args: any[]) => V,
  cache: LRUCache<K, V> | LFUCache<K, V> | TTLCache<K, V>,
): (...args: any[]) => V {
  return (...args: any[]): V => {
    const key = JSON.stringify(args) as unknown as K
    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}
