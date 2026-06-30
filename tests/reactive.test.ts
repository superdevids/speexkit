import { describe, it, expect, vi } from 'vitest'
import { signal, computed, effect } from '../src/reactive/index.js'

function nextTick() {
  return new Promise<void>((resolve) => {
    queueMicrotask(resolve)
  })
}

describe('signal', () => {
  it('get returns initial value', () => {
    const s = signal(42)
    expect(s.get()).toBe(42)
  })

  it('set updates the value', () => {
    const s = signal(0)
    s.set(1)
    expect(s.get()).toBe(1)
  })

  it('set with same value does not notify', () => {
    const s = signal(0)
    let count = 0
    s.subscribe(() => {
      count++
    })
    s.set(0)
    expect(count).toBe(0)
  })

  it('set with different value notifies subscribers', () => {
    const s = signal(0)
    let received = 0
    s.subscribe((v) => {
      received = v
    })
    s.set(5)
    expect(received).toBe(5)
  })

  it('subscribe returns unsubscribe function', () => {
    const s = signal(0)
    let count = 0
    const unsub = s.subscribe(() => {
      count++
    })
    s.set(1)
    unsub()
    s.set(2)
    expect(count).toBe(1)
  })

  it('works with objects', () => {
    const s = signal({ a: 1 })
    const s2 = signal([1, 2, 3])
    s.set({ a: 2 })
    expect(s.get()).toEqual({ a: 2 })
    s2.set([4, 5, 6])
    expect(s2.get()).toEqual([4, 5, 6])
  })

  it('works with strings and booleans', () => {
    const s = signal('hello')
    expect(s.get()).toBe('hello')
    s.set('world')
    expect(s.get()).toBe('world')
    const b = signal(true)
    expect(b.get()).toBe(true)
    b.set(false)
    expect(b.get()).toBe(false)
  })

  it('multiple subscribers all notified', () => {
    const s = signal(0)
    let a = 0
    let b = 0
    s.subscribe((v) => {
      a = v
    })
    s.subscribe((v) => {
      b = v
    })
    s.set(10)
    expect(a).toBe(10)
    expect(b).toBe(10)
  })
})

describe('computed', () => {
  it('returns initial derived value', () => {
    const s = signal(3)
    const d = computed(() => s.get() * 2)
    expect(d.get()).toBe(6)
  })

  it('recalculates lazily on access', () => {
    const s = signal(1)
    const d = computed(() => s.get() * 2)
    expect(d.get()).toBe(2)
    s.set(5)
    expect(d.get()).toBe(10)
  })

  it('does not recalculate if not read', () => {
    const s = signal(1)
    let calcCount = 0
    const d = computed(() => {
      calcCount++
      return s.get() * 2
    })
    expect(calcCount).toBe(0)
    d.get()
    expect(calcCount).toBe(1)
    s.set(2)
    expect(calcCount).toBe(1)
    d.get()
    expect(calcCount).toBe(2)
  })

  it('works with multiple dependencies', () => {
    const a = signal(1)
    const b = signal(2)
    const sum = computed(() => a.get() + b.get())
    expect(sum.get()).toBe(3)
    a.set(5)
    expect(sum.get()).toBe(7)
    b.set(10)
    expect(sum.get()).toBe(15)
  })

  it('supports nested computed', () => {
    const s = signal(2)
    const d1 = computed(() => s.get() * 3)
    const d2 = computed(() => d1.get() + 1)
    expect(d2.get()).toBe(7)
    s.set(5)
    expect(d2.get()).toBe(16)
  })

  it('supports subscribe with value', () => {
    const s = signal(0)
    const d = computed(() => s.get() * 10)
    let received = 0
    d.subscribe((v) => {
      received = v
    })
    expect(received).toBe(0)
    s.set(3)
    expect(d.get()).toBe(30)
    expect(received).toBe(30)
  })

  it('circular dependency throws', () => {
    // eslint-disable-next-line prefer-const
    let d: ReturnType<typeof computed<number>>
    let e: ReturnType<typeof computed<number>>
    d = computed(() => 1 + e.get())
    e = computed(() => d.get() * 2)
    expect(() => d.get()).toThrow('Circular dependency')
  })

  it('supports chained computed dependencies', () => {
    const s = signal(1)
    const d1 = computed(() => s.get() + 1)
    const d2 = computed(() => d1.get() * 2)
    const d3 = computed(() => d2.get() + 3)
    expect(d3.get()).toBe(7)
    s.set(4)
    expect(d3.get()).toBe(13)
  })
})

describe('effect', () => {
  it('runs synchronously on creation', () => {
    let result = 0
    const s = signal(5)
    effect(() => {
      result = s.get()
    })
    expect(result).toBe(5)
  })

  it('re-runs when dependency changes', async () => {
    const s = signal(0)
    let result = 0
    effect(() => {
      result = s.get()
    })
    s.set(1)
    await nextTick()
    expect(result).toBe(1)
  })

  it('batches multiple changes', async () => {
    const s = signal(0)
    let callCount = 0
    effect(() => {
      callCount++
      s.get()
    })
    callCount = 0
    s.set(1)
    s.set(2)
    s.set(3)
    await nextTick()
    expect(callCount).toBe(1)
  })

  it('reads latest value after batch', async () => {
    const s = signal(0)
    let result = 0
    effect(() => {
      result = s.get()
    })
    s.set(1)
    s.set(2)
    await nextTick()
    expect(result).toBe(2)
  })

  it('stop disposes the effect', async () => {
    const s = signal(0)
    let result = 0
    const eff = effect(() => {
      result = s.get()
    })
    eff.stop()
    s.set(99)
    await nextTick()
    expect(result).toBe(0)
  })

  it('stop prevents future runs', () => {
    const s = signal(0)
    let callCount = 0
    const eff = effect(() => {
      callCount++
      s.get()
    })
    expect(callCount).toBe(1)
    eff.stop()
    s.set(1)
    expect(callCount).toBe(1)
  })

  it('works with multiple dependencies', async () => {
    const a = signal(1)
    const b = signal(2)
    let result = 0
    effect(() => {
      result = a.get() + b.get()
    })
    expect(result).toBe(3)
    a.set(10)
    await nextTick()
    expect(result).toBe(12)
  })

  it('works with computed dependencies', async () => {
    const s = signal(1)
    const d = computed(() => s.get() * 2)
    let result = 0
    effect(() => {
      result = d.get()
    })
    expect(result).toBe(2)
    s.set(5)
    await nextTick()
    expect(result).toBe(10)
  })

  it('re-subscribes when deps change between runs', async () => {
    const toggle = signal(true)
    const a = signal(1)
    const b = signal(10)
    let result = 0
    effect(() => {
      result = toggle.get() ? a.get() : b.get()
    })
    expect(result).toBe(1)
    a.set(2)
    await nextTick()
    expect(result).toBe(2)
    toggle.set(false)
    await nextTick()
    expect(result).toBe(10)
    b.set(20)
    await nextTick()
    expect(result).toBe(20)
    a.set(999)
    await nextTick()
    expect(result).toBe(20)
  })

  it('multiple effects on same signal', async () => {
    const s = signal(0)
    let r1 = 0
    let r2 = 0
    effect(() => {
      r1 = s.get()
    })
    effect(() => {
      r2 = s.get()
    })
    s.set(5)
    await nextTick()
    expect(r1).toBe(5)
    expect(r2).toBe(5)
  })
})
