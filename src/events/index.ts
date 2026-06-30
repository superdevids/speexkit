/**
 * Typed event emitter with on/off/emit/once support.
 *
 * @example
 * ```ts
 * interface MyEvents {
 *   data: [payload: string, id: number]
 *   error: [message: string]
 * }
 *
 * const emitter = new EventEmitter<MyEvents>()
 * emitter.on('data', (payload, id) => console.log(payload, id))
 * emitter.emit('data', 'hello', 42)
 * ```
 */
export class EventEmitter<Events extends Record<string, unknown[]>> {
  private _listeners = new Map<string, Set<(...args: unknown[]) => void>>()

  /**
   * Register a listener for an event.
   */
  on<E extends keyof Events>(event: E, handler: (...args: Events[E]) => void): void {
    const key = String(event)
    let set = this._listeners.get(key)
    if (!set) {
      set = new Set()
      this._listeners.set(key, set)
    }
    set.add(handler as (...args: unknown[]) => void)
  }

  /**
   * Unregister a listener for an event.
   */
  off<E extends keyof Events>(event: E, handler: (...args: Events[E]) => void): void {
    const key = String(event)
    const set = this._listeners.get(key)
    if (set) {
      set.delete(handler as (...args: unknown[]) => void)
      if (set.size === 0) this._listeners.delete(key)
    }
  }

  /**
   * Emit an event with arguments.
   */
  emit<E extends keyof Events>(event: E, ...args: Events[E]): void {
    const key = String(event)
    const set = this._listeners.get(key)
    if (set) {
      const handlers = [...set]
      for (const handler of handlers) {
        handler(...args)
      }
    }
  }

  /**
   * Register a one-time listener that auto-unsubscribes after the first emit.
   */
  once<E extends keyof Events>(event: E, handler: (...args: Events[E]) => void): void {
    const wrapper: (...args: unknown[]) => void = (...args: unknown[]) => {
      const key = String(event)
      const set = this._listeners.get(key)
      if (set) {
        set.delete(wrapper as (...args: unknown[]) => void)
        if (set.size === 0) this._listeners.delete(key)
      }
      ;(handler as (...args: unknown[]) => void)(...args)
    }
    const key = String(event)
    let set = this._listeners.get(key)
    if (!set) {
      set = new Set()
      this._listeners.set(key, set)
    }
    set.add(wrapper)
  }

  /**
   * Returns the number of listeners registered for an event.
   */
  listenerCount(event: keyof Events): number {
    return this._listeners.get(String(event))?.size ?? 0
  }

  /**
   * Removes all listeners, optionally for a specific event.
   */
  removeAllListeners(event?: keyof Events): void {
    if (event !== undefined) {
      this._listeners.delete(String(event))
    } else {
      this._listeners.clear()
    }
  }
}

/**
 * Creates a simple publish/subscribe channel for a single data type.
 *
 * @example
 * ```ts
 * const channel = createPubSub<number>()
 * const unsub = channel.subscribe((n) => console.log(n))
 * channel.publish(42)
 * unsub()
 * ```
 */
export function createPubSub<T>(): {
  subscribe: (fn: (data: T) => void) => void
  publish: (data: T) => void
  unsubscribe: (fn: (data: T) => void) => void
} {
  const subscribers = new Set<(data: T) => void>()

  return {
    subscribe(fn: (data: T) => void): void {
      subscribers.add(fn)
    },

    publish(data: T): void {
      for (const fn of subscribers) {
        fn(data)
      }
    },

    unsubscribe(fn: (data: T) => void): void {
      subscribers.delete(fn)
    },
  }
}

/**
 * Payload received by wildcard (`'*'`) listeners on an EventBus.
 */
export interface WildcardPayload {
  event: string
  args: unknown[]
}

/**
 * Event bus with wildcard (`'*'`) listener support.
 * Wraps an internal {@link EventEmitter}.
 *
 * @example
 * ```ts
 * const bus = new EventBus<{ data: [string] }>()
 * bus.on('*', (payload) => console.log(payload.event, payload.args))
 * bus.emit('data', 'hello')
 * ```
 */
export class EventBus<Events extends Record<string, unknown[]>> {
  private _emitter = new EventEmitter<Events>()
  private _wildcardListeners = new Set<(payload: WildcardPayload) => void>()

  /**
   * Register a listener for an event.
   * When `event` is `'*'`, the handler receives a {@link WildcardPayload} for every emitted event.
   */
  on<E extends keyof Events>(
    event: E | '*',
    handler: E extends '*' ? (payload: WildcardPayload) => void : (...args: Events[E]) => void,
  ): void {
    if (event === '*') {
      this._wildcardListeners.add(handler as (payload: WildcardPayload) => void)
    } else {
      this._emitter.on(event as E, handler as (...args: Events[E]) => void)
    }
  }

  /**
   * Unregister a listener for an event.
   */
  off<E extends keyof Events>(
    event: E | '*',
    handler: E extends '*' ? (payload: WildcardPayload) => void : (...args: Events[E]) => void,
  ): void {
    if (event === '*') {
      this._wildcardListeners.delete(handler as (payload: WildcardPayload) => void)
    } else {
      this._emitter.off(event as E, handler as (...args: Events[E]) => void)
    }
  }

  /**
   * Emit an event, delivering arguments to both named and wildcard listeners.
   */
  emit<E extends keyof Events>(event: E, ...args: Events[E]): void {
    this._emitter.emit(event, ...args)
    for (const handler of this._wildcardListeners) {
      handler({ event: String(event), args })
    }
  }
}
