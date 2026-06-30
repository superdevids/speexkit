import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  memoryDriver,
  localStorageDriver,
  sessionStorageDriver,
  cookieDriver,
  Storage,
  createStorage,
  type StorageDriver,
} from '../src/storage/index.js'

describe('memoryDriver()', () => {
  let driver: StorageDriver

  beforeEach(() => {
    driver = memoryDriver()
  })

  it('set/get works', () => {
    driver.set('key', 'value')
    expect(driver.get('key')).toBe('value')
  })

  it('returns null for missing key', () => {
    expect(driver.get('nonexistent')).toBeNull()
  })

  it('overwrites existing key', () => {
    driver.set('key', 'first')
    driver.set('key', 'second')
    expect(driver.get('key')).toBe('second')
  })

  it('delete removes key', () => {
    driver.set('key', 'value')
    driver.remove('key')
    expect(driver.get('key')).toBeNull()
  })

  it('delete nonexistent key is a no-op', () => {
    expect(() => driver.remove('imaginary')).not.toThrow()
  })

  it('clear removes all keys', () => {
    driver.set('a', '1')
    driver.set('b', '2')
    driver.clear()
    expect(driver.get('a')).toBeNull()
    expect(driver.get('b')).toBeNull()
  })

  it('keys() returns all keys', () => {
    driver.set('x', '1')
    driver.set('y', '2')
    const keys = driver.keys()
    expect(keys).toContain('x')
    expect(keys).toContain('y')
    expect(keys.length).toBe(2)
  })

  it('handles empty string key', () => {
    driver.set('', 'empty')
    expect(driver.get('')).toBe('empty')
  })

  it('stores null as string "null"', () => {
    driver.set('k', 'null')
    expect(driver.get('k')).toBe('null')
  })

  it('handles large values', () => {
    const big = 'x'.repeat(100_000)
    driver.set('big', big)
    expect(driver.get('big')).toBe(big)
  })

  it('handles unicode values', () => {
    driver.set('emoji', '🎉🚀测试')
    expect(driver.get('emoji')).toBe('🎉🚀测试')
  })
})

describe('memoryDriver() with many entries', () => {
  it('handles 10000 entries set/get', () => {
    const driver = memoryDriver()
    for (let i = 0; i < 10_000; i++) {
      driver.set(`k${i}`, `v${i}`)
    }
    expect(driver.keys().length).toBe(10_000)
    expect(driver.get('k0')).toBe('v0')
    expect(driver.get('k9999')).toBe('v9999')
  })
})

describe('localStorageDriver() in Node', () => {
  it('returns null on get (no globalThis.localStorage)', () => {
    const driver = localStorageDriver()
    expect(driver.get('anything')).toBeNull()
  })

  it('set is a no-op', () => {
    const driver = localStorageDriver()
    expect(() => driver.set('k', 'v')).not.toThrow()
  })

  it('remove is a no-op', () => {
    const driver = localStorageDriver()
    expect(() => driver.remove('k')).not.toThrow()
  })

  it('clear is a no-op', () => {
    const driver = localStorageDriver()
    expect(() => driver.clear()).not.toThrow()
  })

  it('keys returns empty array', () => {
    const driver = localStorageDriver()
    expect(driver.keys()).toEqual([])
  })
})

describe('sessionStorageDriver() in Node', () => {
  it('returns null on get', () => {
    const driver = sessionStorageDriver()
    expect(driver.get('x')).toBeNull()
  })

  it('set/remove/clear are no-ops', () => {
    const driver = sessionStorageDriver()
    expect(() => driver.set('k', 'v')).not.toThrow()
    expect(() => driver.remove('k')).not.toThrow()
    expect(() => driver.clear()).not.toThrow()
  })

  it('keys returns empty array', () => {
    const driver = sessionStorageDriver()
    expect(driver.keys()).toEqual([])
  })
})

describe('cookieDriver() in Node', () => {
  it('returns null on get (no document.cookie)', () => {
    const driver = cookieDriver()
    expect(driver.get('x')).toBeNull()
  })

  it('set is a no-op', () => {
    const driver = cookieDriver()
    expect(() => driver.set('k', 'v')).not.toThrow()
  })

  it('remove is a no-op', () => {
    const driver = cookieDriver()
    expect(() => driver.remove('k')).not.toThrow()
  })

  it('clear is a no-op', () => {
    const driver = cookieDriver()
    expect(() => driver.clear()).not.toThrow()
  })

  it('keys returns empty array', () => {
    const driver = cookieDriver()
    expect(driver.keys()).toEqual([])
  })
})

describe('cookieDriver() with options', () => {
  it('accepts options without crashing', () => {
    const driver = cookieDriver({ path: '/app', secure: true, sameSite: 'lax', domain: 'example.com' })
    expect(() => driver.set('k', 'v')).not.toThrow()
  })
})

describe('Storage class with memoryDriver', () => {
  let store: Storage

  beforeEach(() => {
    store = new Storage({ driver: memoryDriver() })
  })

  it('set and get string value', () => {
    store.set('key', 'value')
    expect(store.get('key')).toBe('value')
  })

  it('returns null for missing key', () => {
    expect(store.get('missing')).toBeNull()
  })

  it('stores and retrieves objects', () => {
    const obj = { a: 1, b: [2, 3] }
    store.set('obj', obj)
    expect(store.get('obj')).toEqual(obj)
  })

  it('stores and retrieves numbers', () => {
    store.set('num', 42)
    expect(store.get<number>('num')).toBe(42)
  })

  it('stores and retrieves booleans', () => {
    store.set('flag', true)
    expect(store.get<boolean>('flag')).toBe(true)
  })

  it('stores and retrieves arrays', () => {
    const arr = [1, 'two', true]
    store.set('arr', arr)
    expect(store.get('arr')).toEqual(arr)
  })

  it('stores null value', () => {
    store.set('null', null)
    expect(store.get('null')).toBeNull()
  })

  it('remove deletes key', () => {
    store.set('key', 'val')
    store.remove('key')
    expect(store.get('key')).toBeNull()
  })

  it('remove nonexistent is no-op', () => {
    expect(() => store.remove('ghost')).not.toThrow()
  })

  it('clear removes all keys', () => {
    store.set('a', 1)
    store.set('b', 2)
    store.clear()
    expect(store.get('a')).toBeNull()
    expect(store.get('b')).toBeNull()
  })

  it('keys() returns stored keys', () => {
    store.set('x', 10)
    store.set('y', 20)
    expect(store.keys()).toContain('x')
    expect(store.keys()).toContain('y')
  })

  it('handles undefined value', () => {
    store.set('undef', undefined)
    expect(store.get('undef')).toBeUndefined()
  })
})

describe('Storage with namespace', () => {
  let ns: Storage

  beforeEach(() => {
    ns = new Storage({ driver: memoryDriver(), namespace: 'app' })
  })

  it('keys() strips namespace prefix', () => {
    ns.set('a', 1)
    ns.set('b', 2)
    const keys = ns.keys()
    expect(keys).toEqual(expect.arrayContaining(['a', 'b']))
    expect(keys).not.toContain('app:a')
  })

  it('clear only removes namespaced keys', () => {
    const other = new Storage({ driver: memoryDriver(), namespace: 'other' })
    ns.set('x', 1)
    other.set('x', 2)
    ns.clear()
    expect(ns.get('x')).toBeNull()
    expect(other.get('x')).toBe(2)
  })
})

describe('Storage TTL', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('expires entry after TTL', () => {
    const store = new Storage({ driver: memoryDriver(), ttl: 1000 })
    store.set('key', 'val')
    expect(store.get('key')).toBe('val')
    vi.advanceTimersByTime(1001)
    expect(store.get('key')).toBeNull()
  })

  it('per-call ttl overrides default', () => {
    const store = new Storage({ driver: memoryDriver(), ttl: 10_000 })
    store.set('key', 'val', { ttl: 500 })
    vi.advanceTimersByTime(1000)
    expect(store.get('key')).toBeNull()
  })

  it('ttl of 0 disables expiry', () => {
    const store = new Storage({ driver: memoryDriver(), ttl: 1000 })
    store.set('key', 'val', { ttl: 0 })
    vi.advanceTimersByTime(10_000)
    expect(store.get('key')).toBe('val')
  })
})

describe('createStorage convenience', () => {
  it('returns a Storage instance', () => {
    const store = createStorage({ driver: memoryDriver() })
    expect(store).toBeInstanceOf(Storage)
    store.set('k', 'v')
    expect(store.get('k')).toBe('v')
  })

  it('works with no options', () => {
    const store = createStorage({ driver: 'memory' })
    store.set('k', 'v')
    expect(store.get('k')).toBe('v')
  })
})

describe('Storage driver interfaces', () => {
  it('Storage accepts a custom driver', () => {
    const customDriver: StorageDriver = {
      get: () => JSON.stringify({ value: 'from-custom' }),
      set: () => {},
      remove: () => {},
      clear: () => {},
      keys: () => ['custom'],
    }
    const store = new Storage({ driver: customDriver })
    expect(store.get('x')).toBe('from-custom')
  })
})
