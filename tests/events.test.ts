import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { EventEmitter, createPubSub, EventBus } from '../src/events/index.js'

describe('EventEmitter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('creates an empty emitter with no listeners', () => {
      const ee = new EventEmitter()
      expect(ee.listenerCount('test')).toBe(0)
    })

    it('can be subclassed', () => {
      class MyEmitter extends EventEmitter<{ data: [string] }> {}
      const ee = new MyEmitter()
      const spy = vi.fn()
      ee.on('data', spy)
      ee.emit('data', 'hello')
      expect(spy).toHaveBeenCalledWith('hello')
    })
  })

  describe('on', () => {
    it('registers a listener that receives emitted data', () => {
      const ee = new EventEmitter<{ data: [string, number] }>()
      const spy = vi.fn()
      ee.on('data', spy)
      ee.emit('data', 'hello', 42)
      expect(spy).toHaveBeenCalledWith('hello', 42)
    })

    it('supports multiple listeners on the same event', () => {
      const ee = new EventEmitter<{ data: [string] }>()
      const spy1 = vi.fn()
      const spy2 = vi.fn()
      ee.on('data', spy1)
      ee.on('data', spy2)
      ee.emit('data', 'x')
      expect(spy1).toHaveBeenCalledTimes(1)
      expect(spy2).toHaveBeenCalledTimes(1)
    })

    it('supports symbol event names', () => {
      const ee = new EventEmitter()
      const sym = Symbol('custom')
      const spy = vi.fn()
      ee.on(sym as any, spy)
      ee.emit(sym as any, 1)
      expect(spy).toHaveBeenCalledWith(1)
    })

    it('does not throw if listener is a function', () => {
      const ee = new EventEmitter()
      expect(() => ee.on('x' as any, () => {})).not.toThrow()
    })
  })

  describe('off', () => {
    it('unregisters a specific listener', () => {
      const ee = new EventEmitter<{ data: [string] }>()
      const spy = vi.fn()
      ee.on('data', spy)
      ee.off('data', spy)
      ee.emit('data', 'x')
      expect(spy).not.toHaveBeenCalled()
    })

    it('does not affect other listeners for the same event', () => {
      const ee = new EventEmitter<{ data: [string] }>()
      const spy1 = vi.fn()
      const spy2 = vi.fn()
      ee.on('data', spy1)
      ee.on('data', spy2)
      ee.off('data', spy1)
      ee.emit('data', 'x')
      expect(spy1).not.toHaveBeenCalled()
      expect(spy2).toHaveBeenCalledTimes(1)
    })

    it('is a no-op when the handler was never registered', () => {
      const ee = new EventEmitter()
      expect(() => ee.off('x' as any, () => {})).not.toThrow()
    })

    it('is a no-op for an event that has no listeners', () => {
      const ee = new EventEmitter()
      expect(() => ee.off('nonexistent' as any, () => {})).not.toThrow()
    })
  })

  describe('emit', () => {
    it('works with no listeners (silent)', () => {
      const ee = new EventEmitter()
      expect(() => ee.emit('x' as any, 1)).not.toThrow()
    })

    it('works with empty event name', () => {
      const ee = new EventEmitter()
      const spy = vi.fn()
      ee.on('' as any, spy)
      ee.emit('' as any, 1)
      expect(spy).toHaveBeenCalledWith(1)
    })

    it('forwards multiple arguments to all listeners', () => {
      const ee = new EventEmitter<{ evt: [a: number, b: string, c: boolean] }>()
      const spy = vi.fn()
      ee.on('evt', spy)
      ee.emit('evt', 1, 'two', true)
      expect(spy).toHaveBeenCalledWith(1, 'two', true)
    })

    it('handles removeAllListeners during emit without crashing', () => {
      const ee = new EventEmitter<{ evt: [string] }>()
      ee.on('evt', () => {
        ee.removeAllListeners()
      })
      ee.on('evt', vi.fn())
      expect(() => ee.emit('evt', 'x')).not.toThrow()
    })

    it('supports 10000 listeners then emit without memory warning crash', () => {
      const ee = new EventEmitter<{ evt: [number] }>()
      const spies = Array.from({ length: 10000 }, () => vi.fn())
      for (const spy of spies) {
        ee.on('evt', spy as any)
      }
      expect(() => ee.emit('evt', 1)).not.toThrow()
      for (const spy of spies) {
        expect(spy).toHaveBeenCalledWith(1)
      }
    })
  })

  describe('once', () => {
    it('calls the listener exactly once then removes it', () => {
      const ee = new EventEmitter<{ evt: [string] }>()
      const spy = vi.fn()
      ee.once('evt', spy)
      ee.emit('evt', 'first')
      ee.emit('evt', 'second')
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith('first')
    })

    it('works with multiple once listeners', () => {
      const ee = new EventEmitter<{ evt: [number] }>()
      const spy1 = vi.fn()
      const spy2 = vi.fn()
      ee.once('evt', spy1)
      ee.once('evt', spy2)
      ee.emit('evt', 1)
      ee.emit('evt', 2)
      expect(spy1).toHaveBeenCalledTimes(1)
      expect(spy2).toHaveBeenCalledTimes(1)
    })

    it('does not affect regular on listeners', () => {
      const ee = new EventEmitter<{ evt: [number] }>()
      const onceSpy = vi.fn()
      const onSpy = vi.fn()
      ee.once('evt', onceSpy)
      ee.on('evt', onSpy)
      ee.emit('evt', 1)
      ee.emit('evt', 2)
      expect(onceSpy).toHaveBeenCalledTimes(1)
      expect(onSpy).toHaveBeenCalledTimes(2)
    })

    it('listenerCount shows once listeners', () => {
      const ee = new EventEmitter<{ evt: [number] }>()
      ee.once('evt', vi.fn())
      expect(ee.listenerCount('evt')).toBe(1)
    })
  })

  describe('removeAllListeners', () => {
    it('removes all listeners for a specific event', () => {
      const ee = new EventEmitter<{ a: []; b: [] }>()
      const spyA = vi.fn()
      const spyB = vi.fn()
      ee.on('a', spyA)
      ee.on('b', spyB)
      ee.removeAllListeners('a')
      ee.emit('a')
      ee.emit('b')
      expect(spyA).not.toHaveBeenCalled()
      expect(spyB).toHaveBeenCalledTimes(1)
    })

    it('removes all listeners for all events when called without args', () => {
      const ee = new EventEmitter<{ a: []; b: [] }>()
      ee.on('a', vi.fn())
      ee.on('b', vi.fn())
      ee.removeAllListeners()
      expect(ee.listenerCount('a')).toBe(0)
      expect(ee.listenerCount('b')).toBe(0)
    })

    it('is idempotent', () => {
      const ee = new EventEmitter()
      expect(() => ee.removeAllListeners()).not.toThrow()
      expect(() => ee.removeAllListeners()).not.toThrow()
    })
  })

  describe('listenerCount', () => {
    it('returns 0 for event with no listeners', () => {
      const ee = new EventEmitter()
      expect(ee.listenerCount('x' as any)).toBe(0)
    })

    it('returns correct count after adding and removing', () => {
      const ee = new EventEmitter<{ evt: [number] }>()
      const spy = vi.fn()
      expect(ee.listenerCount('evt')).toBe(0)
      ee.on('evt', spy)
      expect(ee.listenerCount('evt')).toBe(1)
      ee.off('evt', spy)
      expect(ee.listenerCount('evt')).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('handles emit with zero arguments', () => {
      const ee = new EventEmitter<{ evt: [] }>()
      const spy = vi.fn()
      ee.on('evt', spy)
      ee.emit('evt')
      expect(spy).toHaveBeenCalledWith()
    })

    it('handles emit with undefined', () => {
      const ee = new EventEmitter<{ evt: [undefined] }>()
      const spy = vi.fn()
      ee.on('evt', spy)
      ee.emit('evt', undefined)
      expect(spy).toHaveBeenCalledWith(undefined)
    })

    it('handles emit with null', () => {
      const ee = new EventEmitter<{ evt: [null] }>()
      const spy = vi.fn()
      ee.on('evt', spy)
      ee.emit('evt', null)
      expect(spy).toHaveBeenCalledWith(null)
    })

    it('handles emitting NaN', () => {
      const ee = new EventEmitter<{ evt: [number] }>()
      const spy = vi.fn()
      ee.on('evt', spy)
      ee.emit('evt', NaN)
      expect(spy).toHaveBeenCalledWith(NaN)
    })
  })
})

describe('createPubSub', () => {
  it('subscribes and receives published data', () => {
    const channel = createPubSub<number>()
    const spy = vi.fn()
    channel.subscribe(spy)
    channel.publish(42)
    expect(spy).toHaveBeenCalledWith(42)
  })

  it('unsubscribes stops receiving', () => {
    const channel = createPubSub<number>()
    const spy = vi.fn()
    channel.subscribe(spy)
    channel.unsubscribe(spy)
    channel.publish(42)
    expect(spy).not.toHaveBeenCalled()
  })

  it('supports multiple subscribers', () => {
    const channel = createPubSub<string>()
    const spy1 = vi.fn()
    const spy2 = vi.fn()
    channel.subscribe(spy1)
    channel.subscribe(spy2)
    channel.publish('hello')
    expect(spy1).toHaveBeenCalledWith('hello')
    expect(spy2).toHaveBeenCalledWith('hello')
  })

  it('unsubscribing a non-subscriber is a no-op', () => {
    const channel = createPubSub<string>()
    expect(() => channel.unsubscribe(() => {})).not.toThrow()
  })

  it('publishing with no subscribers is silent', () => {
    const channel = createPubSub<number>()
    expect(() => channel.publish(99)).not.toThrow()
  })

  it('subscribing the same function twice calls it once (Set dedup)', () => {
    const channel = createPubSub<string>()
    const spy = vi.fn()
    channel.subscribe(spy)
    channel.subscribe(spy)
    channel.publish('x')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('handles undefined payload', () => {
    const channel = createPubSub<undefined>()
    const spy = vi.fn()
    channel.subscribe(spy)
    channel.publish(undefined)
    expect(spy).toHaveBeenCalledWith(undefined)
  })

  it('handles null payload', () => {
    const channel = createPubSub<null>()
    const spy = vi.fn()
    channel.subscribe(spy)
    channel.publish(null)
    expect(spy).toHaveBeenCalledWith(null)
  })
})

describe('EventBus', () => {
  it('emits to named listeners', () => {
    const bus = new EventBus<{ data: [string] }>()
    const spy = vi.fn()
    bus.on('data', spy)
    bus.emit('data', 'hello')
    expect(spy).toHaveBeenCalledWith('hello')
  })

  it('wildcard listener receives all events', () => {
    const bus = new EventBus<{ a: [number]; b: [string] }>()
    const spy = vi.fn()
    bus.on('*', spy)
    bus.emit('a', 1)
    bus.emit('b', 'x')
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({ event: 'a', args: [1] })
    expect(spy).toHaveBeenCalledWith({ event: 'b', args: ['x'] })
  })

  it('wildcard listener is removable', () => {
    const bus = new EventBus<{ evt: [string] }>()
    const spy = vi.fn()
    bus.on('*', spy)
    bus.off('*', spy)
    bus.emit('evt', 'x')
    expect(spy).not.toHaveBeenCalled()
  })

  it('named listener off works', () => {
    const bus = new EventBus<{ evt: [string] }>()
    const spy = vi.fn()
    bus.on('evt', spy)
    bus.off('evt', spy)
    bus.emit('evt', 'x')
    expect(spy).not.toHaveBeenCalled()
  })

  it('wildcard receives args from named emit', () => {
    const bus = new EventBus<{ evt: [number, string] }>()
    const wildcardSpy = vi.fn()
    const namedSpy = vi.fn()
    bus.on('*', wildcardSpy)
    bus.on('evt', namedSpy)
    bus.emit('evt', 42, 'life')
    expect(namedSpy).toHaveBeenCalledWith(42, 'life')
    expect(wildcardSpy).toHaveBeenCalledWith({ event: 'evt', args: [42, 'life'] })
  })

  it('handles emit with no listeners silently', () => {
    const bus = new EventBus<{ evt: [string] }>()
    expect(() => bus.emit('evt', 'x')).not.toThrow()
  })

  it('handles emit with null/undefined args', () => {
    const bus = new EventBus<{ evt: [unknown] }>()
    const spy = vi.fn()
    bus.on('evt', spy)
    bus.emit('evt', null)
    expect(spy).toHaveBeenCalledWith(null)
  })

  it('wildcard captures empty args array', () => {
    const bus = new EventBus<{ evt: [] }>()
    const spy = vi.fn()
    bus.on('*', spy)
    bus.emit('evt')
    expect(spy).toHaveBeenCalledWith({ event: 'evt', args: [] })
  })
})
