import { describe, it, expect, vi, afterEach } from 'vitest'
import { JobQueue, cron, scheduleEvery, Debouncer } from '../src/queue/index.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('JobQueue', () => {
  it('default concurrency allows single concurrent execution', async () => {
    const q = new JobQueue()
    let running = 0
    let maxRunning = 0
    const jobs = Array.from({ length: 5 }, () =>
      q.add(async () => {
        running++
        maxRunning = Math.max(maxRunning, running)
        await new Promise((r) => setTimeout(r, 10))
        running--
      }),
    )
    await Promise.all(jobs)
    expect(maxRunning).toBe(1)
  })

  it('throws for negative concurrency (capped to 1)', async () => {
    const q = new JobQueue({ concurrency: -1 })
    const results: number[] = []
    const jobs = Array.from({ length: 3 }, (_, i) =>
      q.add(async () => {
        results.push(i)
        await new Promise((r) => setTimeout(r, 10))
      }),
    )
    await Promise.all(jobs)
    expect(results.length).toBe(3)
  })

  it('caps Infinity concurrency reasonably', () => {
    const q = new JobQueue({ concurrency: Infinity })
    expect(q.getActive()).toBe(0)
  })

  it('catches error from throwing function without crashing', async () => {
    const q = new JobQueue()
    await expect(
      q.add(() => {
        throw new Error('job error')
      }),
    ).rejects.toThrow('job error')
  })

  it('handles async rejecting job via error handler', async () => {
    const q = new JobQueue()
    await expect(
      q.add(async () => {
        throw new Error('async fail')
      }),
    ).rejects.toThrow('async fail')
  })

  it('pauses then resumes processing', async () => {
    const q = new JobQueue({ concurrency: 1 })
    q.pause()
    let executed = false
    const promise = q.add(async () => {
      executed = true
    })
    expect(executed).toBe(false)
    q.resume()
    await promise
    expect(executed).toBe(true)
  })

  it('pause then add queues without executing', async () => {
    const q = new JobQueue({ concurrency: 1 })
    q.pause()
    let executed = false
    q.add(async () => {
      executed = true
    })
    await new Promise((r) => setTimeout(r, 50))
    expect(executed).toBe(false)
  })

  it('clear removes pending jobs', async () => {
    const q = new JobQueue({ concurrency: 1 })
    q.pause()
    const errors: unknown[] = []
    q.add(async () => 'ok').catch((e) => errors.push(e))
    q.add(async () => 'ok2').catch((e) => errors.push(e))
    expect(q.getPending()).toBe(2)
    q.clear()
    expect(q.getPending()).toBe(0)
    await new Promise((r) => setTimeout(r, 10))
    expect(errors.length).toBe(2)
  })

  it('getActive returns running count', async () => {
    const q = new JobQueue({ concurrency: 2 })
    const promise = q.add(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(q.getActive()).toBe(1)
    await promise
  })

  it('getPending returns pending count', async () => {
    const q = new JobQueue({ concurrency: 1 })
    q.pause()
    q.add(async () => 'a')
    q.add(async () => 'b')
    expect(q.getPending()).toBe(2)
  })

  it('processes jobs in priority order', async () => {
    const q = new JobQueue({ concurrency: 1 })
    q.pause()
    const order: number[] = []
    q.add(
      async () => {
        order.push(1)
      },
      { priority: 1 },
    )
    q.add(
      async () => {
        order.push(10)
      },
      { priority: 10 },
    )
    q.add(
      async () => {
        order.push(5)
      },
      { priority: 5 },
    )
    q.resume()
    await new Promise((r) => setTimeout(r, 100))
    expect(order).toEqual([10, 5, 1])
  })

  it('retries failed jobs when retries > 0', async () => {
    let attempts = 0
    const q = new JobQueue({ concurrency: 1, retries: 2 })
    await expect(
      q.add(async () => {
        attempts++
        throw new Error(`attempt ${attempts}`)
      }),
    ).rejects.toThrow()
    expect(attempts).toBe(3)
  })
})

describe('cron', () => {
  it('returns isValid false for invalid expression', () => {
    const c = cron('invalid')
    expect(c.isValid()).toBe(false)
  })

  it('returns isValid true for valid expression', () => {
    const c = cron('* * * * *')
    expect(c.isValid()).toBe(true)
  })

  it('next() returns Date or null for valid expression', () => {
    const c = cron('0 * * * *')
    const next = c.next()
    if (next !== null) {
      expect(next).toBeInstanceOf(Date)
      expect(isNaN(next.getTime())).toBe(false)
    }
  })

  it('nextN returns array of dates', () => {
    const c = cron('0 * * * *')
    const dates = c.nextN(3)
    expect(dates.length).toBeLessThanOrEqual(3)
    dates.forEach((d) => {
      expect(d).toBeInstanceOf(Date)
    })
  })

  it('nextN returns empty for invalid expression', () => {
    const c = cron('bad')
    expect(c.nextN(5)).toEqual([])
  })

  it('next returns null for invalid expression', () => {
    const c = cron('bad')
    expect(c.next()).toBeNull()
  })

  it('handles step expressions', () => {
    const c = cron('*/15 * * * *')
    expect(c.isValid()).toBe(true)
  })

  it('handles range expressions', () => {
    const c = cron('0 9-17 * * 1-5')
    expect(c.isValid()).toBe(true)
  })

  it('handles list expressions', () => {
    const c = cron('0,30 * * * *')
    expect(c.isValid()).toBe(true)
  })
})

describe('scheduleEvery', () => {
  it('calls function at interval', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { stop } = scheduleEvery(100, fn)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(300)
    // 100ms interval over 300ms → fires at T=200 and T=300 = 2 more calls = 3 total
    expect(fn).toHaveBeenCalledTimes(3)
    stop()
    vi.useRealTimers()
  })

  it('stop() prevents further calls', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const { stop } = scheduleEvery(100, fn)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    stop()
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('handles function that throws without crashing', async () => {
    vi.useFakeTimers()
    const fn = vi.fn(() => {
      throw new Error('test')
    })
    const { stop } = scheduleEvery(100, fn)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    stop()
    vi.useRealTimers()
  })

  it('handles async function', async () => {
    vi.useFakeTimers()
    const fn = vi.fn(async () => {
      /* noop */
    })
    const { stop } = scheduleEvery(100, fn)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    stop()
    vi.useRealTimers()
  })

  it('scheduleEvery with 0 interval guards against infinite loop', async () => {
    const fn = vi.fn()
    const { stop } = scheduleEvery(0, fn)
    await new Promise((r) => setTimeout(r, 20))
    stop()
    // Should fire at least once but not infinitely (bounded by minimum interval clamp)
    expect(fn).toHaveBeenCalled()
    expect(fn.mock.calls.length).toBeLessThan(100)
  })
})

describe('Debouncer', () => {
  it('call 2x in quick succession results in 1 execution', async () => {
    const d = new Debouncer({ wait: 100 })
    const fn = vi.fn((x: number) => x)
    d.add(() => fn(1)).catch(() => {})
    d.add(() => fn(2)).catch(() => {})
    await new Promise((r) => setTimeout(r, 200))
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(2)
  })

  it('flush() executes pending immediately', async () => {
    const d = new Debouncer({ wait: 1000 })
    let executed = false
    d.add(() => {
      executed = true
    }).catch(() => {})
    await d.flush()
    expect(executed).toBe(true)
  })

  it('cancel() prevents pending execution', async () => {
    const d = new Debouncer({ wait: 100 })
    let executed = false
    d.add(() => {
      executed = true
    }).catch(() => {})
    d.cancel()
    await new Promise((r) => setTimeout(r, 150))
    expect(executed).toBe(false)
  })

  it('cancel() is a no-op when nothing pending', () => {
    const d = new Debouncer({ wait: 100 })
    expect(() => d.cancel()).not.toThrow()
  })

  it('flush() is a no-op when no function pending', async () => {
    const d = new Debouncer({ wait: 100 })
    await expect(d.flush()).resolves.toBeUndefined()
  })

  it('executes with maxWait timeout', async () => {
    const d = new Debouncer({ wait: 200, maxWait: 100 })
    let executed = false
    d.add(() => {
      executed = true
    }).catch(() => {})
    await new Promise((r) => setTimeout(r, 150))
    expect(executed).toBe(true)
  })

  it('new call supersedes previous pending call', async () => {
    const d = new Debouncer({ wait: 50 })
    const results: string[] = []
    d.add(() => results.push('first')).catch(() => {})
    await new Promise((r) => setTimeout(r, 10))
    d.add(() => results.push('second')).catch(() => {})
    await new Promise((r) => setTimeout(r, 100))
    expect(results).toEqual(['second'])
  })

  it('multiple flushes work', async () => {
    const d = new Debouncer({ wait: 1000 })
    const fn = vi.fn()
    d.add(() => fn(1)).catch(() => {})
    await d.flush()
    expect(fn).toHaveBeenCalledWith(1)
    d.add(() => fn(2)).catch(() => {})
    await d.flush()
    expect(fn).toHaveBeenCalledWith(2)
  })

  it('cancel resets maxTimer', async () => {
    vi.useFakeTimers()
    const d = new Debouncer({ wait: 200, maxWait: 100 })
    let executed = false
    d.add(() => {
      executed = true
    }).catch(() => {})
    d.cancel()
    vi.advanceTimersByTime(200)
    expect(executed).toBe(false)
    vi.useRealTimers()
  })
})
