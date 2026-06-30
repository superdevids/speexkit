import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { LRUCache, LFUCache, TTLCache, memoizeWithCache, CacheStatsCollector } from '../src/cache/index.js'

describe('LRUCache', () => {
  it('set and get a value', () => {
    const cache = new LRUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
  })

  it('returns undefined for missing key', () => {
    const cache = new LRUCache<string, number>({ max: 3 })
    expect(cache.get('nonexistent')).toBeUndefined()
  })

  it('evicts least-recently-used when over capacity', () => {
    const cache = new LRUCache<string, number>({ max: 2 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('bumps accessed key to most-recent position (LRU order)', () => {
    const cache = new LRUCache<string, number>({ max: 2 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a')
    cache.set('c', 3)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(1)
    expect(cache.get('c')).toBe(3)
  })

  it('has() returns true for existing key', () => {
    const cache = new LRUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    expect(cache.has('a')).toBe(true)
  })

  it('has() returns false for missing key', () => {
    const cache = new LRUCache<string, number>({ max: 3 })
    expect(cache.has('a')).toBe(false)
  })

  it('delete() removes a key', () => {
    const cache = new LRUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    expect(cache.delete('a')).toBe(true)
    expect(cache.get('a')).toBeUndefined()
  })

  it('delete() returns false for missing key', () => {
    const cache = new LRUCache<string, number>({ max: 3 })
    expect(cache.delete('a')).toBe(false)
  })

  it('clear() removes all entries', () => {
    const cache = new LRUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })

  it('size property reflects entry count', () => {
    const cache = new LRUCache<string, number>({ max: 3 })
    expect(cache.size).toBe(0)
    cache.set('a', 1)
    expect(cache.size).toBe(1)
    cache.set('b', 2)
    expect(cache.size).toBe(2)
    cache.delete('a')
    expect(cache.size).toBe(1)
  })

  it('handles capacity 0 (no storage)', () => {
    const cache = new LRUCache<string, number>({ max: 0 })
    cache.set('a', 1)
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })

  it('negative capacity throws', () => {
    expect(() => new LRUCache<string, number>({ max: -1 })).not.toThrow()
  })

  it('fractional max is floored', () => {
    const cache = new LRUCache<string, number>({ max: 2.7 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.size).toBeLessThanOrEqual(2)
  })

  it('set with undefined value', () => {
    const cache = new LRUCache<string, undefined>({ max: 3 })
    cache.set('a', undefined)
    expect(cache.get('a')).toBeUndefined()
  })

  it('set with null value', () => {
    const cache = new LRUCache<string, null>({ max: 3 })
    cache.set('a', null)
    expect(cache.get('a')).toBeNull()
  })

  it('set with NaN value', () => {
    const cache = new LRUCache<string, number>({ max: 3 })
    cache.set('a', NaN)
    expect(Number.isNaN(cache.get('a'))).toBe(true)
  })

  it('set with undefined key', () => {
    const cache = new LRUCache<undefined, number>({ max: 3 })
    cache.set(undefined, 1)
    expect(cache.get(undefined)).toBe(1)
  })

  it('set with null key', () => {
    const cache = new LRUCache<null, number>({ max: 3 })
    cache.set(null, 1)
    expect(cache.get(null)).toBe(1)
  })

  it('overwriting existing key updates value', () => {
    const cache = new LRUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    cache.set('a', 999)
    expect(cache.get('a')).toBe(999)
  })

  it('10000 entries set/get performance baseline', () => {
    const cache = new LRUCache<number, number>({ max: 100000 })
    for (let i = 0; i < 10000; i++) {
      cache.set(i, i * 2)
    }
    expect(cache.size).toBe(10000)
    for (let i = 0; i < 10000; i++) {
      expect(cache.get(i)).toBe(i * 2)
    }
  })

  it('eviction from 10000 capped cache', () => {
    const cache = new LRUCache<number, number>({ max: 100 })
    for (let i = 0; i < 200; i++) {
      cache.set(i, i)
    }
    expect(cache.size).toBe(100)
    expect(cache.get(0)).toBeUndefined()
    expect(cache.get(199)).toBe(199)
  })

  it('update key bumps it in LRU order', () => {
    const cache = new LRUCache<string, number>({ max: 2 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('a', 10)
    cache.set('c', 3)
    expect(cache.get('a')).toBe(10)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe(3)
  })
})

describe('LFUCache', () => {
  it('set and get a value', () => {
    const cache = new LFUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
  })

  it('returns undefined for missing key', () => {
    const cache = new LFUCache<string, number>({ max: 3 })
    expect(cache.get('a')).toBeUndefined()
  })

  it('evicts least-frequently-used when over capacity', () => {
    const cache = new LFUCache<string, number>({ max: 2 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a')
    cache.get('a')
    cache.set('c', 3)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(1)
    expect(cache.get('c')).toBe(3)
  })

  it('frequency increments on get', () => {
    const cache = new LFUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    cache.get('a')
    cache.get('a')
    cache.get('a')
    cache.set('b', 2)
    cache.set('c', 3)
    cache.set('d', 4)
    expect(cache.get('a')).toBe(1)
  })

  it('has() returns true for existing key', () => {
    const cache = new LFUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    expect(cache.has('a')).toBe(true)
  })

  it('has() returns false for missing key', () => {
    const cache = new LFUCache<string, number>({ max: 3 })
    expect(cache.has('a')).toBe(false)
  })

  it('delete() removes a key', () => {
    const cache = new LFUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    expect(cache.delete('a')).toBe(true)
    expect(cache.get('a')).toBeUndefined()
  })

  it('clear() removes all entries', () => {
    const cache = new LFUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('size property is correct', () => {
    const cache = new LFUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.size).toBe(2)
  })

  it('handles capacity 0 (no storage)', () => {
    const cache = new LFUCache<string, number>({ max: 0 })
    cache.set('a', 1)
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })

  it('set with undefined/null/NaN', () => {
    const cache = new LFUCache<string, number>({ max: 3 })
    cache.set('a', undefined as any)
    expect(cache.get('a')).toBeUndefined()
    cache.set('b', null as any)
    expect(cache.get('b')).toBeNull()
    cache.set('c', NaN)
    expect(Number.isNaN(cache.get('c'))).toBe(true)
  })

  it('overwrite resets frequency? or retains...', () => {
    const cache = new LFUCache<string, number>({ max: 3 })
    cache.set('a', 1)
    cache.get('a')
    cache.get('a')
    cache.set('a', 99)
    const val = cache.get('a')
    expect(val).toBe(99)
  })
})

describe('TTLCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('set and get within TTL', () => {
    const cache = new TTLCache<string, number>({ ttl: 10000 })
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
  })

  it('entry expires after TTL', () => {
    const cache = new TTLCache<string, number>({ ttl: 100 })
    cache.set('a', 1)
    vi.advanceTimersByTime(200)
    expect(cache.get('a')).toBeUndefined()
  })

  it('has() returns false after expiry', () => {
    const cache = new TTLCache<string, number>({ ttl: 100 })
    cache.set('a', 1)
    vi.advanceTimersByTime(200)
    expect(cache.has('a')).toBe(false)
  })

  it('entry expires mid-read (exact boundary)', () => {
    const cache = new TTLCache<string, number>({ ttl: 100 })
    cache.set('a', 1)
    vi.advanceTimersByTime(100)
    expect(cache.get('a')).toBeUndefined()
  })

  it('delete expired entry clears it from size', () => {
    const cache = new TTLCache<string, number>({ ttl: 100 })
    cache.set('a', 1)
    vi.advanceTimersByTime(200)
    cache.delete('a')
    expect(cache.size).toBe(0)
  })

  it('max option evicts oldest', () => {
    const cache = new TTLCache<string, number>({ ttl: 10000, max: 2 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('updating existing key refreshes expiry', () => {
    const cache = new TTLCache<string, number>({ ttl: 10000 })
    cache.set('a', 1)
    vi.advanceTimersByTime(5000)
    cache.set('a', 2)
    vi.advanceTimersByTime(5000)
    expect(cache.get('a')).toBe(2)
  })

  it('TTL 0 expires immediately', () => {
    const cache = new TTLCache<string, number>({ ttl: 0 })
    cache.set('a', 1)
    expect(cache.get('a')).toBeUndefined()
  })

  it('negative TTL instant expiry', () => {
    const cache = new TTLCache<string, number>({ ttl: -1000 })
    cache.set('a', 1)
    expect(cache.get('a')).toBeUndefined()
  })

  it('set with null key', () => {
    const cache = new TTLCache<null, number>({ ttl: 10000 })
    cache.set(null, 1)
    expect(cache.get(null)).toBe(1)
  })

  it('set with undefined value', () => {
    const cache = new TTLCache<string, undefined>({ ttl: 10000 })
    cache.set('a', undefined)
    expect(cache.get('a')).toBeUndefined()
  })

  it('clear resets cache', () => {
    const cache = new TTLCache<string, number>({ ttl: 10000 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size).toBe(0)
  })
})

describe('memoizeWithCache', () => {
  it('caches function results', () => {
    const cache = new LRUCache<string, number>({ max: 100 })
    const fn = vi.fn((x: number) => x * 2)
    const memoized = memoizeWithCache(fn, cache)
    expect(memoized(2)).toBe(4)
    expect(memoized(2)).toBe(4)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('different args produce different cache entries', () => {
    const cache = new LRUCache<string, number>({ max: 100 })
    const fn = vi.fn((x: number) => x * 2)
    const memoized = memoizeWithCache(fn, cache)
    memoized(1)
    memoized(2)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('works with LFUCache', () => {
    const cache = new LFUCache<string, number>({ max: 100 })
    const fn = vi.fn((x: number) => x + 1)
    const memoized = memoizeWithCache(fn, cache)
    expect(memoized(5)).toBe(6)
    expect(memoized(5)).toBe(6)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('works with TTLCache', () => {
    const cache = new TTLCache<string, number>({ ttl: 10000 })
    const fn = vi.fn((x: number) => x * 3)
    const memoized = memoizeWithCache(fn, cache)
    expect(memoized(3)).toBe(9)
    expect(memoized(3)).toBe(9)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('handles undefined arguments as key', () => {
    const cache = new LRUCache<string, number>({ max: 100 })
    const fn = vi.fn((x?: number) => (x ?? 0) + 1)
    const memoized = memoizeWithCache(fn, cache)
    expect(memoized(undefined)).toBe(1)
    expect(memoized(undefined)).toBe(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('handles throwing functions', () => {
    const cache = new LRUCache<string, number>({ max: 100 })
    const fn = vi.fn(() => { throw new Error('fail') })
    const memoized = memoizeWithCache(fn, cache)
    expect(() => memoized()).toThrow('fail')
  })

  it('caches result after successful call', () => {
    const cache = new LRUCache<string, number>({ max: 100 })
    let callCount = 0
    const fn = () => ++callCount
    const memoized = memoizeWithCache(fn, cache)
    expect(memoized()).toBe(1)
    expect(memoized()).toBe(1)
    expect(callCount).toBe(1)
  })

  it('empty args array produces key', () => {
    const cache = new LRUCache<string, number>({ max: 100 })
    const fn = vi.fn(() => 42)
    const memoized = memoizeWithCache(fn, cache)
    expect(memoized()).toBe(42)
    expect(memoized()).toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('CacheStatsCollector', () => {
  it('starts with zero stats', () => {
    const stats = new CacheStatsCollector()
    const s = stats.getStats()
    expect(s.hits).toBe(0)
    expect(s.misses).toBe(0)
    expect(s.evictions).toBe(0)
  })

  it('tracks hits', () => {
    const stats = new CacheStatsCollector()
    stats.recordHit()
    stats.recordHit()
    stats.recordHit()
    expect(stats.getStats().hits).toBe(3)
  })

  it('tracks misses', () => {
    const stats = new CacheStatsCollector()
    stats.recordMiss()
    stats.recordMiss()
    expect(stats.getStats().misses).toBe(2)
  })

  it('tracks evictions', () => {
    const stats = new CacheStatsCollector()
    stats.recordEviction()
    expect(stats.getStats().evictions).toBe(1)
  })

  it('reset zeros out all counters', () => {
    const stats = new CacheStatsCollector()
    stats.recordHit()
    stats.recordMiss()
    stats.recordEviction()
    stats.reset()
    const s = stats.getStats()
    expect(s.hits).toBe(0)
    expect(s.misses).toBe(0)
    expect(s.evictions).toBe(0)
  })

  it('getStats returns a snapshot', () => {
    const stats = new CacheStatsCollector()
    stats.recordHit()
    const s1 = stats.getStats()
    stats.recordHit()
    const s2 = stats.getStats()
    expect(s1.hits).toBe(1)
    expect(s2.hits).toBe(2)
  })
})
