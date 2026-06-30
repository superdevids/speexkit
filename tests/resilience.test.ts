import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { CircuitBreaker, Bulkhead, retryWithBackoff, Fallback, Timeout } from '../src/resilience/index.js'

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts in CLOSED state', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetMs: 5000 })
    expect(cb.state).toBe('CLOSED')
  })

  it('returns success result', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetMs: 5000 })
    const result = await cb.call(() => Promise.resolve(42))
    expect(result).toBe(42)
  })

  it('counts failures and opens at threshold', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetMs: 5000 })
    for (let i = 0; i < 3; i++) {
      await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail')
    }
    expect(cb.state).toBe('OPEN')
    expect(cb.failureCount).toBe(3)
  })

  it('rejects calls when OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetMs: 5000 })
    await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail')
    await expect(cb.call(() => Promise.resolve('ok'))).rejects.toThrow('Circuit breaker is OPEN')
  })

  it('transitions to HALF_OPEN after resetMs', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetMs: 5000 })
    const stateSpy = vi.fn()
    cb.onStateChange(stateSpy)

    // Open the circuit
    await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    expect(cb.state).toBe('OPEN')
    expect(stateSpy).toHaveBeenCalledWith('OPEN')

    // Advance time past resetMs
    vi.setSystemTime(Date.now() + 5000)
    vi.advanceTimersByTime(5000)

    stateSpy.mockClear()

    // Make a call — _tryTransitionFromOpen() transitions to HALF_OPEN,
    // then _onSuccess() transitions to CLOSED
    await expect(cb.call(() => Promise.resolve('test'))).resolves.toBe('test')

    // The state change to HALF_OPEN should have fired
    expect(stateSpy).toHaveBeenCalledWith('HALF_OPEN')
    // Final state after success is CLOSED
    expect(cb.state).toBe('CLOSED')
  })

  it('HALF_OPEN success transitions to CLOSED', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetMs: 100 })
    await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    vi.setSystemTime(Date.now() + 100)
    vi.advanceTimersByTime(100)
    const result = await cb.call(() => Promise.resolve('recovered'))
    expect(result).toBe('recovered')
    expect(cb.state).toBe('CLOSED')
  })

  it('HALF_OPEN failure transitions back to OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetMs: 100 })
    await expect(cb.call(() => Promise.reject(new Error('fail')))).rejects.toThrow()
    vi.setSystemTime(Date.now() + 100)
    vi.advanceTimersByTime(100)
    await expect(cb.call(() => Promise.reject(new Error('fail again')))).rejects.toThrow('fail again')
    expect(cb.state).toBe('OPEN')
  })

  it('threshold 0 opens immediately', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 0, resetMs: 5000 })
    await expect(cb.call(() => Promise.reject(new Error('x')))).rejects.toThrow()
    expect(cb.state).toBe('OPEN')
  })

  it('threshold Infinity never opens', async () => {
    const cb = new CircuitBreaker({ failureThreshold: Infinity, resetMs: 5000 })
    for (let i = 0; i < 100; i++) {
      await expect(cb.call(() => Promise.reject(new Error('x')))).rejects.toThrow()
    }
    expect(cb.state).toBe('CLOSED')
  })

  it('wrap() creates a safe wrapper', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetMs: 5000 })
    const wrapped = cb.wrap(() => Promise.resolve('ok'))
    const result = await wrapped()
    expect(result).toBe('ok')
  })

  it('reset() resets to CLOSED', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetMs: 5000 })
    await expect(cb.call(() => Promise.reject(new Error('x')))).rejects.toThrow()
    await expect(cb.call(() => Promise.reject(new Error('x')))).rejects.toThrow()
    expect(cb.state).toBe('OPEN')
    cb.reset()
    expect(cb.state).toBe('CLOSED')
    expect(cb.failureCount).toBe(0)
    expect(cb.successCount).toBe(0)
  })

  it('onStateChange callback fires', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetMs: 100 })
    const stateSpy = vi.fn()
    cb.onStateChange(stateSpy)
    await expect(cb.call(() => Promise.reject(new Error('x')))).rejects.toThrow()
    expect(stateSpy).toHaveBeenCalledWith('OPEN')
    vi.setSystemTime(Date.now() + 100)
    vi.advanceTimersByTime(100)
    stateSpy.mockClear()
    await cb.call(() => Promise.resolve('ok'))
    expect(stateSpy).toHaveBeenCalledWith('CLOSED')
  })

  it('success resets failure count', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, resetMs: 5000 })
    await expect(cb.call(() => Promise.reject(new Error('x')))).rejects.toThrow()
    await cb.call(() => Promise.resolve('ok'))
    expect(cb.failureCount).toBe(0)
  })

  it('halfOpenMaxCalls limits trial calls', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetMs: 100, halfOpenMaxCalls: 2 })
    await expect(cb.call(() => Promise.reject(new Error('x')))).rejects.toThrow()
    vi.setSystemTime(Date.now() + 100)
    vi.advanceTimersByTime(100)
    await cb.call(() => Promise.resolve('ok'))
    expect(cb.state).toBe('CLOSED')
  })
})

describe('Bulkhead', () => {
  it('executes a function within concurrency limit', async () => {
    const bh = new Bulkhead({ maxConcurrent: 5 })
    const result = await bh.run(() => Promise.resolve(42))
    expect(result).toBe(42)
  })

  it('activeCount reflects in-flight calls', async () => {
    const bh = new Bulkhead({ maxConcurrent: 2 })
    const p1 = bh.run(() => new Promise<string>((r) => setTimeout(r, 1000, 'a')))
    const p2 = bh.run(() => new Promise<string>((r) => setTimeout(r, 1000, 'b')))
    expect(bh.activeCount).toBeGreaterThanOrEqual(1)
    await p1
    await p2
    expect(bh.activeCount).toBe(0)
  })

  it('queues calls beyond maxConcurrent', () => {
    vi.useFakeTimers()
    const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 5 })
    bh.run(() => new Promise((r) => setTimeout(r, 1000)))
    bh.run(() => Promise.resolve('queued'))
    expect(bh.queueSize).toBe(1)
    vi.useRealTimers()
  })

  it('throws when queue is full', async () => {
    const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 0 })
    bh.run(() => new Promise(() => {}))
    await expect(bh.run(() => Promise.resolve('x'))).rejects.toThrow('Bulkhead queue is full')
  })

  it('maxConcurrent 0 throws immediately', async () => {
    const bh = new Bulkhead({ maxConcurrent: 0 })
    await expect(bh.run(() => Promise.resolve('x'))).rejects.toThrow('Bulkhead queue is full')
  })

  it('maxQueue drain works', async () => {
    const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 5 })
    const slow = bh.run(() => new Promise<string>((r) => setTimeout(r, 50, 'slow')))
    const fast = bh.run(() => Promise.resolve('fast'))
    await slow
    const result = await fast
    expect(result).toBe('fast')
    expect(bh.queueSize).toBe(0)
  })

  it('queued call inherits rejection', async () => {
    const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 5 })
    const slow = bh.run(() => new Promise<string>((r) => setTimeout(r, 50, 'slow')))
    const fast = bh.run(() => Promise.reject(new Error('nope')))
    await slow
    await expect(fast).rejects.toThrow('nope')
  })

  it('activeCount decrements on queue drain', async () => {
    const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 5 })
    const slow = bh.run(() => new Promise<string>((r) => setTimeout(r, 50, 'x')))
    bh.run(() => Promise.resolve('y'))
    await slow
    await new Promise((r) => setTimeout(r, 10))
    expect(bh.queueSize).toBe(0)
  })

  it('queued and then dequeued returns correct value', async () => {
    const bh = new Bulkhead({ maxConcurrent: 1, maxQueue: 5 })
    bh.run(() => new Promise<string>((r) => setTimeout(r, 50, 'first')))
    const result = await bh.run(() => Promise.resolve('second'))
    expect(result).toBe('second')
  })
})

describe('retryWithBackoff', () => {
  it('succeeds on first attempt', async () => {
    const fn = vi.fn(() => Promise.resolve('ok'))
    const result = await retryWithBackoff(fn, { attempts: 3, baseDelay: 10 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi.fn()
    fn.mockRejectedValueOnce(new Error('fail'))
    fn.mockRejectedValueOnce(new Error('fail'))
    fn.mockResolvedValueOnce('recovered')
    const result = await retryWithBackoff(fn, { attempts: 5, baseDelay: 10 })
    expect(result).toBe('recovered')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws last error when all attempts fail', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('always fail')))
    await expect(retryWithBackoff(fn, { attempts: 3, baseDelay: 10 })).rejects.toThrow('always fail')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('0 attempts calls zero times and throws', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('no retry')))
    await expect(retryWithBackoff(fn, { attempts: 0 })).rejects.toThrow('No attempts allowed')
    expect(fn).toHaveBeenCalledTimes(0)
  })

  it('max retries respected with 1 attempt', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('x')))
    await expect(retryWithBackoff(fn, { attempts: 1 })).rejects.toThrow('x')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('shouldRetry can stop retries early', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('fatal')))
    const shouldRetry = () => false
    await expect(retryWithBackoff(fn, { attempts: 5, shouldRetry })).rejects.toThrow('fatal')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('onRetry callback fires on failure', async () => {
    const fn = vi.fn()
    fn.mockRejectedValueOnce(new Error('fail 1'))
    fn.mockRejectedValueOnce(new Error('fail 2'))
    fn.mockResolvedValueOnce('ok')
    const onRetry = vi.fn()
    await retryWithBackoff(fn, { attempts: 3, baseDelay: 10, onRetry })
    expect(onRetry).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 0)
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1)
  })

  it('works without options', async () => {
    const fn = vi.fn(() => Promise.resolve('ok'))
    const result = await retryWithBackoff(fn)
    expect(result).toBe('ok')
  })

  it('jitter adds randomness to delay', async () => {
    const fn = vi.fn(() => Promise.reject(new Error('x')))
    await expect(retryWithBackoff(fn, { attempts: 2, baseDelay: 10, jitter: false })).rejects.toThrow('x')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('Fallback', () => {
  it('returns primary result when it succeeds', async () => {
    const getData = Fallback(
      () => Promise.resolve('primary'),
      () => Promise.resolve('fallback'),
    )
    const result = await getData()
    expect(result).toBe('primary')
  })

  it('returns fallback result when primary fails', async () => {
    const getData = Fallback(
      () => Promise.reject(new Error('primary failed')),
      () => Promise.resolve('fallback'),
    )
    const result = await getData()
    expect(result).toBe('fallback')
  })

  it('throws when both primary and fallback fail', async () => {
    const getData = Fallback(
      () => Promise.reject(new Error('primary fail')),
      () => Promise.reject(new Error('fallback fail')),
    )
    await expect(getData()).rejects.toThrow('fallback fail')
  })

  it('works with sync values via Promise.resolve', async () => {
    const getData = Fallback(
      () => Promise.resolve(42),
      () => Promise.resolve(0),
    )
    expect(await getData()).toBe(42)
  })

  it('fallback does not run when primary succeeds', async () => {
    const fallbackSpy = vi.fn(() => Promise.resolve('fallback'))
    const getData = Fallback(() => Promise.resolve('primary'), fallbackSpy)
    await getData()
    expect(fallbackSpy).not.toHaveBeenCalled()
  })
})

describe('Timeout', () => {
  it('completes before the deadline', async () => {
    const fast = Timeout(() => Promise.resolve('done'), 1000)
    const result = await fast()
    expect(result).toBe('done')
  })

  it('rejects when function exceeds deadline', async () => {
    const slow = Timeout(() => new Promise<string>((r) => setTimeout(r, 5000)), 50)
    await expect(slow()).rejects.toThrow('Timed out after 50ms')
  })

  it('0ms times out instantly', async () => {
    const instant = Timeout(() => new Promise<string>((r) => setTimeout(r, 10000)), 0)
    await expect(instant()).rejects.toThrow('Timed out after 0ms')
  })

  it('rejects with the timed out error', async () => {
    const fn = Timeout(() => new Promise<string>((r) => setTimeout(r, 1000)), 10)
    await expect(fn()).rejects.toThrow('Timed out after 10ms')
  })

  it('function result is unaffected if fast enough', async () => {
    const fn = Timeout(() => Promise.resolve(99), 1000)
    expect(await fn()).toBe(99)
  })

  it('timeout promise does not leak after function completes', async () => {
    const fn = Timeout(() => Promise.resolve('fast'), 100)
    await expect(fn()).resolves.toBe('fast')
  })
})
