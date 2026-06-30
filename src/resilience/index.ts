import { sleep } from '../async/index.js'

/**
 * State of the circuit breaker.
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * Options for constructing a {@link CircuitBreaker}.
 */
export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. */
  failureThreshold: number
  /** Milliseconds to wait before transitioning from OPEN to HALF_OPEN. */
  resetMs: number
  /** Maximum number of calls allowed in HALF_OPEN state (default 1). */
  halfOpenMaxCalls?: number
}

/**
 * Circuit breaker implementing the OPEN / HALF_OPEN / CLOSED state machine.
 *
 * CLOSED — normal operation. Failures are counted. When they reach
 * `failureThreshold` the breaker trips to OPEN.
 *
 * OPEN — calls are rejected immediately. After `resetMs` the breaker
 * transitions to HALF_OPEN.
 *
 * HALF_OPEN — a limited number of trial calls are allowed. If a trial
 * succeeds the breaker resets to CLOSED. If any trial fails it trips
 * back to OPEN.
 *
 * @example
 * const cb = new CircuitBreaker({ failureThreshold: 3, resetMs: 5000 })
 * const safeFetch = cb.wrap(() => fetch('https://api.example.com'))
 * const data = await safeFetch()
 */
export class CircuitBreaker {
  private _state: CircuitState = 'CLOSED'
  private _failureCount = 0
  private _successCount = 0
  private _openedAt = 0
  private _halfOpenCalls = 0
  private readonly _failureThreshold: number
  private readonly _resetMs: number
  private readonly _halfOpenMaxCalls: number
  private _onStateChange: ((state: CircuitState) => void) | null = null

  constructor(opts: CircuitBreakerOptions) {
    this._failureThreshold = opts.failureThreshold
    this._resetMs = opts.resetMs
    this._halfOpenMaxCalls = opts.halfOpenMaxCalls ?? 1
  }

  /**
   * The current state of the circuit breaker.
   */
  get state(): CircuitState {
    return this._state
  }

  /**
   * The number of consecutive failures recorded in the current cycle.
   */
  get failureCount(): number {
    return this._failureCount
  }

  /**
   * The number of consecutive successes recorded in the current cycle.
   */
  get successCount(): number {
    return this._successCount
  }

  /**
   * Wraps an async function so that calls go through the circuit breaker.
   *
   * @param fn - The function to wrap.
   * @returns A wrapped function that respects the breaker state.
   */
  wrap<T>(fn: () => Promise<T>): () => Promise<T> {
    return () => this.call(fn)
  }

  /**
   * Calls an async function through the circuit breaker.
   *
   * @param fn - The function to call.
   * @returns The result of the function.
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    this._tryTransitionFromOpen()

    if (this._state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN')
    }

    if (this._state === 'HALF_OPEN' && this._halfOpenCalls >= this._halfOpenMaxCalls) {
      throw new Error('Circuit breaker is HALF_OPEN and at capacity')
    }

    if (this._state === 'HALF_OPEN') {
      this._halfOpenCalls++
    }

    try {
      const result = await fn()
      this._onSuccess()
      return result
    } catch (error) {
      this._onFailure()
      throw error
    }
  }

  /**
   * Resets the breaker to CLOSED state with zero counters.
   */
  reset(): void {
    this._setState('CLOSED')
    this._failureCount = 0
    this._successCount = 0
    this._halfOpenCalls = 0
    this._openedAt = 0
  }

  /**
   * Registers a callback that is invoked whenever the breaker state changes.
   *
   * @param cb - A function receiving the new state name.
   */
  onStateChange(cb: (state: CircuitState) => void): void {
    this._onStateChange = cb
  }

  private _tryTransitionFromOpen(): void {
    if (this._state !== 'OPEN') return

    const elapsed = Date.now() - this._openedAt
    if (elapsed >= this._resetMs) {
      this._setState('HALF_OPEN')
      this._halfOpenCalls = 0
    }
  }

  private _onSuccess(): void {
    if (this._state === 'HALF_OPEN') {
      this._failureCount = 0
      this._successCount = 0
      this._halfOpenCalls = 0
      this._setState('CLOSED')
      return
    }

    this._successCount++
    this._failureCount = 0
  }

  private _onFailure(): void {
    this._failureCount++
    this._successCount = 0

    if (this._state === 'HALF_OPEN') {
      this._halfOpenCalls = 0
      this._setState('OPEN')
      this._openedAt = Date.now()
      return
    }

    if (this._state === 'CLOSED' && this._failureCount >= this._failureThreshold) {
      this._setState('OPEN')
      this._openedAt = Date.now()
    }
  }

  private _setState(newState: CircuitState): void {
    this._state = newState
    this._onStateChange?.(newState)
  }
}

/**
 * Options for constructing a {@link Bulkhead}.
 */
export interface BulkheadOptions {
  /** Maximum number of concurrent calls. */
  maxConcurrent: number
  /** Maximum number of queued calls (default 0, i.e. no queue). */
  maxQueue?: number
}

/**
 * Limits the number of concurrent calls to a critical section.
 *
 * Calls beyond the concurrency limit are queued (FIFO). If the queue
 * reaches its capacity the caller is rejected immediately.
 *
 * @example
 * const bulkhead = new Bulkhead({ maxConcurrent: 5, maxQueue: 10 })
 * const result = await bulkhead.run(() => fetch('/api/data'))
 */
export class Bulkhead {
  private readonly _maxConcurrent: number
  private readonly _maxQueue: number
  private _activeCount = 0
  private _queue: Array<{ fn: () => void; reject: (reason: unknown) => void }> = []

  constructor(opts: BulkheadOptions) {
    this._maxConcurrent = opts.maxConcurrent
    this._maxQueue = opts.maxQueue ?? 0
  }

  /**
   * The number of currently active (in-flight) calls.
   */
  get activeCount(): number {
    return this._activeCount
  }

  /**
   * The number of calls waiting in the queue.
   */
  get queueSize(): number {
    return this._queue.length
  }

  /**
   * Runs an async function, respecting the concurrency and queue limits.
   *
   * @param fn - The async function to execute.
   * @returns The result of the function.
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this._activeCount < this._maxConcurrent) {
      this._activeCount++
      try {
        return await fn()
      } finally {
        this._activeCount--
        this._dequeue()
      }
    }

    if (this._queue.length >= this._maxQueue) {
      throw new Error('Bulkhead queue is full')
    }

    return new Promise<T>((resolve, reject) => {
      this._queue.push({
        fn: async () => {
          this._activeCount++
          try {
            resolve(await fn())
          } catch (error) {
            reject(error)
          } finally {
            this._activeCount--
            this._dequeue()
          }
        },
        reject,
      })
    })
  }

  private _dequeue(): void {
    if (this._queue.length === 0) return
    const next = this._queue.shift()
    if (next) next.fn()
  }
}

/**
 * Options for {@link retryWithBackoff}.
 */
export interface RetryWithBackoffOptions {
  /** Maximum number of attempts (default 3). */
  attempts?: number
  /** Base delay in milliseconds (default 1000). */
  baseDelay?: number
  /** Maximum delay in milliseconds (default 30000). */
  maxDelay?: number
  /** Whether to add random jitter to the delay (default true). */
  jitter?: boolean
  /** Predicate determining whether a failed attempt should be retried. */
  shouldRetry?: (error: unknown, attempt: number) => boolean
  /** Callback invoked after each failed attempt before the next retry. */
  onRetry?: (error: unknown, attempt: number) => void
}

/**
 * Retries an async function with exponential backoff and optional jitter.
 *
 * Delay formula: `min(baseDelay * 2^attempt, maxDelay)`.
 * When jitter is enabled a random value between 0 and the computed delay
 * is added.
 *
 * @example
 * const data = await retryWithBackoff(
 *   () => fetch('https://api.example.com'),
 *   { attempts: 5, baseDelay: 500, onRetry: (err, n) => console.log(`retry ${n}:`, err) }
 * )
 *
 * @param fn - The async function to retry.
 * @param opts - Retry configuration.
 * @returns A promise that resolves with the function result.
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, opts?: RetryWithBackoffOptions): Promise<T> {
  const { attempts = 3, baseDelay = 1000, maxDelay = 30000, jitter = true, shouldRetry = () => true, onRetry } = opts ?? {}

  if (attempts <= 0) throw new Error('No attempts allowed')

  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt >= attempts - 1 || !shouldRetry(error, attempt)) {
        throw error as T
      }

      onRetry?.(error, attempt)

      let delay = Math.min(baseDelay * 2 ** attempt, maxDelay)
      if (jitter) {
        delay += Math.random() * delay
      }

      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Graceful degradation — tries `fn` first. If it throws, calls `fallbackFn`.
 *
 * @example
 * const getData = Fallback(
 *   () => fetch('/api/data').then(r => r.json()),
 *   () => ({ cached: true, data: fallbackData })
 * )
 * const result = await getData()
 *
 * @param fn - The primary async function.
 * @param fallbackFn - The fallback async function.
 * @returns A wrapped function that tries the primary then the fallback.
 */
export function Fallback<T, F>(fn: () => Promise<T>, fallbackFn: () => Promise<F>): () => Promise<T | F> {
  return async () => {
    try {
      return await fn()
    } catch {
      return await fallbackFn()
    }
  }
}

/**
 * Wraps an async function with a timeout. If the function does not
 * resolve within the given milliseconds the returned function rejects
 * with an error.
 *
 * @example
 * const fastFetch = Timeout(() => fetch('https://api.example.com'), 3000)
 * const data = await fastFetch()
 *
 * @param fn - The async function to wrap.
 * @param ms - Timeout in milliseconds.
 * @returns A wrapped function that races against the timeout.
 */
export function Timeout<T>(fn: () => Promise<T>, ms: number): () => Promise<T> {
  return () => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    })
    return Promise.race([fn(), timeoutPromise]).finally(() => {
      if (timer !== undefined) clearTimeout(timer)
    })
  }
}
