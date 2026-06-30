// queue module for speexkit

export interface JobQueueOptions {
  concurrency?: number
  retries?: number
}

export interface Job<T = unknown> {
  id: string
  priority: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: T
  error?: unknown
  createdAt: number
}

let _jobIdCounter = 0
function _nextJobId(): string {
  return 'job_' + String(++_jobIdCounter)
}

function _isPromise(value: unknown): value is Promise<unknown> {
  return value !== null && typeof value === 'object' && typeof (value as Record<string, unknown>).then === 'function'
}

interface _InternalJob<T> {
  id: string
  priority: number
  fn: () => Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
  retriesLeft: number
  createdAt: number
}

export class JobQueue {
  private _tasks: _InternalJob<unknown>[] = []
  private _running = 0
  private _paused = false
  private _concurrency: number
  private _defaultRetries: number

  constructor(options?: JobQueueOptions) {
    this._concurrency = options?.concurrency ?? 1
    this._defaultRetries = options?.retries ?? 0
    if (this._concurrency < 1) this._concurrency = 1
  }

  add<T>(fn: () => Promise<T>, opts?: { priority?: number }): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this._tasks.push({
        id: _nextJobId(),
        priority: opts?.priority ?? 0,
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        retriesLeft: this._defaultRetries,
        createdAt: Date.now(),
      })
      this._tasks.sort((a, b) => b.priority - a.priority)
      this._process()
    })
  }

  getPending(): number {
    return this._tasks.length
  }

  getActive(): number {
    return this._running
  }

  pause(): void {
    this._paused = true
  }

  resume(): void {
    this._paused = false
    this._process()
  }

  clear(): void {
    const err = new Error('Queue cleared')
    for (const t of this._tasks) t.reject(err)
    this._tasks = []
  }

  private _process(): void {
    if (this._paused) return
    while (this._running < this._concurrency && this._tasks.length > 0) {
      const item = this._tasks.shift()
      if (item === undefined) break
      this._running++
      item
        .fn()
        .then((result) => {
          item.resolve(result)
        })
        .catch((err) => {
          if (item.retriesLeft > 0) {
            this._tasks.push({
              id: _nextJobId(),
              priority: item.priority,
              fn: item.fn,
              resolve: item.resolve,
              reject: item.reject,
              retriesLeft: item.retriesLeft - 1,
              createdAt: Date.now(),
            })
            this._tasks.sort((a, b) => b.priority - a.priority)
          } else {
            item.reject(err)
          }
        })
        .finally(() => {
          this._running--
          this._process()
        })
    }
  }
}

type _FieldSet = Set<number> | null

function _parseField(field: string, min: number, max: number): _FieldSet {
  if (field === '*') return null

  const values = new Set<number>()
  const parts = field.split(',')

  for (const part of parts) {
    if (part.includes('/')) {
      const slashIdx = part.indexOf('/')
      const rangePart = part.slice(0, slashIdx)
      const stepStr = part.slice(slashIdx + 1)
      const step = parseInt(stepStr, 10)
      if (isNaN(step) || step < 1) return new Set()

      let rangeMin = min
      let rangeMax = max

      if (rangePart !== '*') {
        if (rangePart.includes('-')) {
          const dashIdx = rangePart.indexOf('-')
          rangeMin = parseInt(rangePart.slice(0, dashIdx), 10)
          rangeMax = parseInt(rangePart.slice(dashIdx + 1), 10)
        } else {
          rangeMin = parseInt(rangePart, 10)
          rangeMax = rangeMin
        }
      }

      if (isNaN(rangeMin) || isNaN(rangeMax)) return new Set()
      for (let i = rangeMin; i <= rangeMax; i += step) {
        values.add(i)
      }
    } else if (part.includes('-')) {
      const dashIdx = part.indexOf('-')
      const lo = parseInt(part.slice(0, dashIdx), 10)
      const hi = parseInt(part.slice(dashIdx + 1), 10)
      if (isNaN(lo) || isNaN(hi)) return new Set()
      for (let i = lo; i <= hi; i++) {
        values.add(i)
      }
    } else {
      const n = parseInt(part, 10)
      if (isNaN(n)) return new Set()
      values.add(n)
    }
  }

  return values
}

interface _ParsedCron {
  minutes: Set<number>
  hours: Set<number>
  days: Set<number>
  months: Set<number>
  weekdays: Set<number>
  minWild: boolean
  hourWild: boolean
  dayWild: boolean
  monthWild: boolean
  wdayWild: boolean
}

function _parseCron(expr: string): _ParsedCron | null {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) return null

  const minutes = _parseField(fields[0]!, 0, 59)
  const hours = _parseField(fields[1]!, 0, 23)
  const days = _parseField(fields[2]!, 1, 31)
  const months = _parseField(fields[3]!, 1, 12)
  const weekdays = _parseField(fields[4]!, 0, 6)

  if (minutes !== null && minutes.size === 0) return null
  if (hours !== null && hours.size === 0) return null
  if (days !== null && days.size === 0) return null
  if (months !== null && months.size === 0) return null
  if (weekdays !== null && weekdays.size === 0) return null

  return {
    minutes: minutes ?? _fullSet(0, 59),
    hours: hours ?? _fullSet(0, 23),
    days: days ?? _fullSet(1, 31),
    months: months ?? _fullSet(1, 12),
    weekdays: weekdays ?? _fullSet(0, 6),
    minWild: minutes === null,
    hourWild: hours === null,
    dayWild: days === null,
    monthWild: months === null,
    wdayWild: weekdays === null,
  }
}

function _fullSet(min: number, max: number): Set<number> {
  const s = new Set<number>()
  for (let i = min; i <= max; i++) s.add(i)
  return s
}

const _MAX_SEARCH_MS = 5 * 365 * 24 * 60 * 60 * 1000

export function cron(expr: string): {
  next: () => Date | null
  nextN: (n: number) => Date[]
  isValid: () => boolean
} {
  const parsed = _parseCron(expr)

  return {
    next(): Date | null {
      if (parsed === null) return null
      return _nextFrom(parsed, new Date())
    },

    nextN(n: number): Date[] {
      if (parsed === null || n < 1) return []
      const results: Date[] = []
      let cursor = new Date()
      for (let i = 0; i < n; i++) {
        const d = _nextFrom(parsed, cursor)
        if (d === null) break
        results.push(d)
        cursor = new Date(d.getTime() + 60_000)
      }
      return results
    },

    isValid(): boolean {
      return parsed !== null
    },
  }
}

function _nextFrom(parsed: _ParsedCron, after: Date): Date | null {
  const cursor = new Date(after)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  const limit = cursor.getTime() + _MAX_SEARCH_MS

  while (cursor.getTime() <= limit) {
    const m = cursor.getMonth() + 1
    const d = cursor.getDate()
    const wd = cursor.getDay()

    if (!parsed.months.has(m)) {
      cursor.setMonth(cursor.getMonth() + 1)
      cursor.setDate(1)
      cursor.setHours(0, 0, 0, 0)
      continue
    }

    const dayMatches = parsed.days.has(d) || parsed.weekdays.has(wd)

    if (!dayMatches) {
      cursor.setDate(d + 1)
      cursor.setHours(0, 0, 0, 0)
      continue
    }

    if (!parsed.hours.has(cursor.getHours())) {
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0)
      continue
    }

    if (!parsed.minutes.has(cursor.getMinutes())) {
      cursor.setMinutes(cursor.getMinutes() + 1)
      continue
    }

    return cursor
  }

  return null
}

export function scheduleEvery(intervalMs: number, fn: () => void | Promise<void>): { stop(): void } {
  // Clamp minimum interval to prevent infinite spin
  const safeInterval = Math.max(1, intervalMs)
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let nextExpected = Date.now() + safeInterval

  const tick = (): void => {
    if (stopped) return
    try {
      const result = fn()
      if (_isPromise(result)) {
        result.catch(() => {
          // silently swallow unhandled rejections
        })
      }
    } catch {
      // silently swallow sync errors
    }
    if (stopped) return
    nextExpected += safeInterval
    const drift = Date.now() - nextExpected
    const delay = Math.max(0, safeInterval - drift)
    timer = setTimeout(tick, delay)
  }

  timer = setTimeout(tick, safeInterval)

  return {
    stop(): void {
      stopped = true
      if (timer !== undefined) clearTimeout(timer)
    },
  }
}

export class Debouncer {
  private _wait: number
  private _maxWait: number | undefined
  private _timer: ReturnType<typeof setTimeout> | undefined
  private _maxTimer: ReturnType<typeof setTimeout> | undefined
  private _fn: (() => unknown) | null = null
  private _resolve: ((value: unknown) => void) | null = null
  private _reject: ((reason: unknown) => void) | null = null
  private _firstCallTime = 0
  private _execResolve: (() => void) | null = null
  private _execPromise: Promise<void> | null = null

  constructor(opts: { wait: number; maxWait?: number }) {
    this._wait = opts.wait
    this._maxWait = opts.maxWait
  }

  add<T>(fn: () => T): Promise<T> {
    this._rejectPending()
    return new Promise<T>((resolve, reject) => {
      this._fn = fn as () => unknown
      this._resolve = resolve as (value: unknown) => void
      this._reject = reject

      const now = Date.now()

      if (this._maxWait !== undefined && this._maxTimer === undefined) {
        this._firstCallTime = now
        this._maxTimer = setTimeout(() => this._execute(), this._maxWait)
      }

      if (this._maxWait !== undefined && now - this._firstCallTime >= this._maxWait) {
        this._execute()
        return
      }

      if (this._timer !== undefined) clearTimeout(this._timer)
      this._timer = setTimeout(() => this._execute(), this._wait)
    })
  }

  async flush(): Promise<void> {
    if (!this._fn) return
    this._execute()
    await this._execPromise
  }

  cancel(): void {
    if (this._timer !== undefined) {
      clearTimeout(this._timer)
      this._timer = undefined
    }
    if (this._maxTimer !== undefined) {
      clearTimeout(this._maxTimer)
      this._maxTimer = undefined
    }
    this._rejectPending()
  }

  private _execute(): void {
    if (this._timer !== undefined) {
      clearTimeout(this._timer)
      this._timer = undefined
    }
    if (this._maxTimer !== undefined) {
      clearTimeout(this._maxTimer)
      this._maxTimer = undefined
    }

    const fn = this._fn
    const resolve = this._resolve
    const reject = this._reject

    this._fn = null
    this._resolve = null
    this._reject = null

    this._execPromise = new Promise<void>((r) => {
      this._execResolve = r
    })

    if (fn === null) {
      this._execResolve?.()
      return
    }

    try {
      const result = fn()
      if (_isPromise(result)) {
        result.then(
          (v) => {
            resolve?.(v)
            this._execResolve?.()
          },
          (e) => {
            reject?.(e)
            this._execResolve?.()
          },
        )
      } else {
        resolve?.(result)
        this._execResolve?.()
      }
    } catch (err) {
      reject?.(err)
      this._execResolve?.()
    }
  }

  private _rejectPending(): void {
    if (this._reject !== null) {
      this._reject(new Error('Superseded'))
    }
    this._fn = null
    this._resolve = null
    this._reject = null
  }
}
