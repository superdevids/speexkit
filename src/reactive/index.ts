let _active: (() => void) | null = null
let _deps: Array<() => void> = []
let _pending: Set<() => void> | null = null
let _flushScheduled = false

function _schedule(fn: () => void) {
  if (!_pending) _pending = new Set()
  _pending.add(fn)
  if (!_flushScheduled) {
    _flushScheduled = true
    queueMicrotask(() => {
      _flushScheduled = false
      const batch = _pending
      _pending = null
      if (batch) {
        const fns = [...batch]
        for (const fn of fns) fn()
      }
    })
  }
}

export interface Signal<T> {
  get(): T
  set(value: T): void
  subscribe(fn: (value: T) => void): () => void
}

export function signal<T>(value: T): Signal<T> {
  let _v = value
  const _subs = new Set<() => void>()

  return {
    get(): T {
      const active = _active
      if (active) {
        _subs.add(active)
        _deps.push(() => {
          _subs.delete(active)
        })
      }
      return _v
    },
    set(v: T): void {
      if (Object.is(_v, v)) return
      _v = v
      const fns = [..._subs]
      for (const fn of fns) fn()
    },
    subscribe(fn: (value: T) => void): () => void {
      const wrapper = () => fn(_v)
      _subs.add(wrapper)
      return () => {
        _subs.delete(wrapper)
      }
    },
  }
}

export interface Computed<T> {
  get(): T
  subscribe(fn: (value: T) => void): () => void
}

const _computing = new Set<() => void>()

export function computed<T>(fn: () => T): Computed<T> {
  let _dirty = true
  let _v!: T
  const _subs = new Set<() => void>()
  let _prevDeps: Array<() => void> = []

  const _mark = () => {
    if (_dirty) return
    _dirty = true
    const fns = [..._subs]
    for (const fn of fns) fn()
  }

  const _eval = () => {
    if (!_dirty) return
    if (_computing.has(_mark)) {
      throw new Error('Circular dependency detected in computed()')
    }
    _computing.add(_mark)
    for (const c of _prevDeps) c()
    _prevDeps = []
    const prevActive = _active
    const prevDeps = _deps
    _active = _mark
    _deps = []
    try {
      _v = fn()
      _dirty = false
      _prevDeps = _deps
    } finally {
      _active = prevActive
      _deps = prevDeps
      _computing.delete(_mark)
    }
  }

  const self: Computed<T> = {
    get(): T {
      const active = _active
      if (active) {
        _subs.add(active)
        _deps.push(() => {
          _subs.delete(active)
        })
      }
      _eval()
      return _v
    },
    subscribe(fn: (value: T) => void): () => void {
      const wrapper = () => fn(self.get())
      _subs.add(wrapper)
      fn(self.get())
      return () => {
        _subs.delete(wrapper)
      }
    },
  }
  return self
}

export interface Effect {
  stop(): void
}

export function effect(fn: () => void): Effect {
  let _cleanups: Array<() => void> = []
  let _stopped = false

  const _onDepChange = () => {
    _schedule(_run)
  }

  const _run = () => {
    if (_stopped) return
    for (const c of _cleanups) c()
    _cleanups = []
    const prevActive = _active
    const prevGlobalDeps = _deps
    _active = _onDepChange
    _deps = []
    try {
      fn()
      _cleanups = _deps
    } finally {
      _active = prevActive
      _deps = prevGlobalDeps
    }
  }

  _run()

  return {
    stop() {
      _stopped = true
      for (const c of _cleanups) c()
      _cleanups = []
    },
  }
}

export function batch<T>(fn: () => T): T {
  return fn()
}
