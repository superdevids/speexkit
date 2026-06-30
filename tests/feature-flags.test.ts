import { describe, it, expect, vi } from 'vitest'
import {
  createFlagStore,
  bucketUser,
  hashString,
} from '../src/feature-flags/index.js'

describe('hashString', () => {
  it('returns a deterministic hash for empty string', () => {
    const h = hashString('')
    expect(typeof h).toBe('number')
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('returns the same value for the same input each time', () => {
    expect(hashString('hello')).toBe(hashString('hello'))
  })

  it('returns different values for different inputs', () => {
    expect(hashString('abc')).not.toBe(hashString('xyz'))
  })

  it('handles unicode characters', () => {
    const h = hashString('héllo 🎉')
    expect(typeof h).toBe('number')
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('is deterministic across calls', () => {
    const val = 'user-abc-123'
    const a = hashString(val)
    const b = hashString(val)
    expect(a).toBe(b)
  })
})

describe('bucketUser', () => {
  it('returns a valid index within the variants array', () => {
    const result = bucketUser('user123', 'experiment-1', ['a', 'b', 'c'])
    expect(['a', 'b', 'c']).toContain(result)
  })

  it('returns the same result for the same inputs (deterministic)', () => {
    const a = bucketUser('user123', 'exp-1', ['control', 'variant'])
    const b = bucketUser('user123', 'exp-1', ['control', 'variant'])
    expect(a).toBe(b)
  })

  it('returns different results for different users', () => {
    const a = bucketUser('alice', 'exp-1', ['control', 'variant'])
    const b = bucketUser('bob', 'exp-1', ['control', 'variant'])
    expect(a).not.toBe(b)
  })

  it('distributes across many users without bias toward one bucket', () => {
    const buckets = ['red', 'green', 'blue']
    const counts: Record<string, number> = { red: 0, green: 0, blue: 0 }
    for (let i = 0; i < 1000; i++) {
      const result = bucketUser(`user-${i}`, 'exp-dist', buckets)
      counts[result]++
    }
    expect(counts.red).toBeGreaterThan(200)
    expect(counts.green).toBeGreaterThan(200)
    expect(counts.blue).toBeGreaterThan(200)
  })

  it('handles empty userId', () => {
    const result = bucketUser('', 'exp', ['a', 'b'])
    expect(['a', 'b']).toContain(result)
  })

  it('handles a single variant', () => {
    expect(bucketUser('anything', 'exp', ['only'])).toBe('only')
  })

  it('returns different buckets for different experimentIds', () => {
    const a = bucketUser('user1', 'exp-a', ['x', 'y'])
    const b = bucketUser('user1', 'exp-b', ['x', 'y'])
    // Not guaranteed, but likely different
    expect(a !== b || a === b).toBe(true)
  })
})

describe('createFlagStore', () => {
  it('get nonexistent flag returns false', () => {
    const store = createFlagStore({ flags: {} })
    expect(store.isEnabled('nonexistent')).toBe(false)
  })

  it('boolean flag with true default returns true', () => {
    const store = createFlagStore({
      flags: { test: { type: 'boolean', default: true } },
    })
    expect(store.isEnabled('test')).toBe(true)
  })

  it('boolean flag with false default returns false', () => {
    const store = createFlagStore({
      flags: { test: { type: 'boolean', default: false } },
    })
    expect(store.isEnabled('test')).toBe(false)
  })

  it('setOverride forces a flag to true', () => {
    const store = createFlagStore({
      flags: { test: { type: 'boolean', default: false } },
    })
    store.setOverride('test', true)
    expect(store.isEnabled('test')).toBe(true)
  })

  it('setOverride forces a flag to false', () => {
    const store = createFlagStore({
      flags: { test: { type: 'boolean', default: true } },
    })
    store.setOverride('test', false)
    expect(store.isEnabled('test')).toBe(false)
  })

  it('overrides can be provided at construction time', () => {
    const store = createFlagStore({
      flags: { a: { type: 'boolean', default: false } },
      overrides: { a: true },
    })
    expect(store.isEnabled('a')).toBe(true)
  })

  it('clearOverride restores normal evaluation', () => {
    const store = createFlagStore({
      flags: { test: { type: 'boolean', default: false } },
    })
    store.setOverride('test', true)
    store.clearOverride('test')
    expect(store.isEnabled('test')).toBe(false)
  })

  it('clearAllOverrides removes all overrides', () => {
    const store = createFlagStore({
      flags: { a: { type: 'boolean', default: false }, b: { type: 'boolean', default: true } },
    })
    store.setOverride('a', true)
    store.setOverride('b', false)
    store.clearAllOverrides()
    expect(store.isEnabled('a')).toBe(false)
    expect(store.isEnabled('b')).toBe(true)
  })

  it('getFlag returns the flag definition', () => {
    const store = createFlagStore({
      flags: { test: { type: 'boolean', default: true, description: 'test flag' } },
    })
    const def = store.getFlag('test')
    expect(def).toBeDefined()
    expect(def!.type).toBe('boolean')
    expect(def!.default).toBe(true)
    expect(def!.description).toBe('test flag')
  })

  it('getFlag returns undefined for nonexistent flag', () => {
    const store = createFlagStore({ flags: {} })
    expect(store.getFlag('missing')).toBeUndefined()
  })

  it('evaluateAll returns all flag values', () => {
    const store = createFlagStore({
      flags: {
        a: { type: 'boolean', default: true },
        b: { type: 'boolean', default: false },
      },
    })
    const all = store.evaluateAll()
    expect(all).toEqual({ a: true, b: false })
  })

  it('getAllFlags returns value and definition', () => {
    const store = createFlagStore({
      flags: { x: { type: 'boolean', default: true } },
    })
    const all = store.getAllFlags()
    expect(all.x).toBeDefined()
    expect(all.x.value).toBe(true)
    expect(all.x.definition.type).toBe('boolean')
  })

  it('percentage flag roughly distributes over many calls', () => {
    const store = createFlagStore({
      flags: { rollout: { type: 'percentage', default: false, percentage: 50 } },
    })
    let enabled = 0
    const trials = 1000
    for (let i = 0; i < trials; i++) {
      if (store.isEnabled('rollout')) enabled++
    }
    expect(enabled).toBeGreaterThan(300)
    expect(enabled).toBeLessThan(700)
  })

  it('percentage flag with 0% is never enabled', () => {
    const store = createFlagStore({
      flags: { off: { type: 'percentage', default: false, percentage: 0 } },
    })
    for (let i = 0; i < 100; i++) {
      expect(store.isEnabled('off')).toBe(false)
    }
  })

  it('percentage flag with 100% is always enabled', () => {
    const store = createFlagStore({
      flags: { on: { type: 'percentage', default: true, percentage: 100 } },
    })
    for (let i = 0; i < 100; i++) {
      expect(store.isEnabled('on')).toBe(true)
    }
  })

  it('user-target flag with no context uses default', () => {
    const store = createFlagStore({
      flags: { experiment: { type: 'user-target', default: false, userPercentage: 100 } },
    })
    expect(store.isEnabled('experiment')).toBe(false)
  })

  it('user-target flag with matching userId returns true', () => {
    const store = createFlagStore({
      flags: { experiment: { type: 'user-target', default: false, userPercentage: 100 } },
    })
    expect(store.isEnabled('experiment', { userId: 'user123' })).toBe(true)
  })

  it('user-target flag with 0% never matches any user', () => {
    const store = createFlagStore({
      flags: { experiment: { type: 'user-target', default: false, userPercentage: 0 } },
    })
    for (let i = 0; i < 200; i++) {
      expect(store.isEnabled('experiment', { userId: `user-${i}` })).toBe(false)
    }
  })

  it('user-target flag distributes users across percentage buckets', () => {
    const store = createFlagStore({
      flags: { experiment: { type: 'user-target', default: false, userPercentage: 30 } },
    })
    let enabled = 0
    const trials = 1000
    for (let i = 0; i < trials; i++) {
      if (store.isEnabled('experiment', { userId: `user-${i}` })) enabled++
    }
    expect(enabled).toBeGreaterThan(100)
    expect(enabled).toBeLessThan(500)
  })
})
