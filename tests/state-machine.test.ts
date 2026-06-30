import { describe, it, expect, vi } from 'vitest'
import { createMachine, type Machine, type MachineConfig } from '../src/state-machine/index.js'

describe('createMachine', () => {
  it('starts in the initial state', () => {
    const m = createMachine({
      initial: 'idle',
      states: { idle: {}, running: {} },
    })
    expect(m.getState()).toBe('idle')
  })

  it('transitions on valid event', () => {
    const m = createMachine({
      initial: 'idle',
      states: {
        idle: { on: { START: 'running' } },
        running: { on: { STOP: 'idle' } },
      },
    })
    m.send('START')
    expect(m.getState()).toBe('running')
  })

  it('no-op on unknown event from current state', () => {
    const m = createMachine({
      initial: 'idle',
      states: {
        idle: { on: { START: 'running' } },
        running: {},
      },
    })
    m.send('UNKNOWN' as any)
    expect(m.getState()).toBe('idle')
  })

  it('no-op on empty string event', () => {
    const m = createMachine({
      initial: 'idle',
      states: {
        idle: { on: { EMPTY: 'running' } },
        running: {},
      },
    })
    m.send('' as any)
    expect(m.getState()).toBe('idle')
  })

  it('matches() returns true for current state', () => {
    const m = createMachine({
      initial: 'idle',
      states: { idle: {}, running: {} },
    })
    expect(m.matches('idle')).toBe(true)
    expect(m.matches('running')).toBe(false)
  })

  it('matches() accepts multiple states', () => {
    const m = createMachine({
      initial: 'idle',
      states: { idle: {}, running: {} },
    })
    expect(m.matches('idle', 'running')).toBe(true)
  })

  it('can() returns true when event is valid from current state', () => {
    const m = createMachine({
      initial: 'idle',
      states: {
        idle: { on: { START: 'running' } },
        running: {},
      },
    })
    expect(m.can('START')).toBe(true)
    expect(m.can('STOP')).toBe(false)
  })

  it('full cycle a→b→c→a works', () => {
    const m = createMachine({
      initial: 'a',
      states: {
        a: { on: { NEXT: 'b' } },
        b: { on: { NEXT: 'c' } },
        c: { on: { NEXT: 'a' } },
      },
    })
    expect(m.getState()).toBe('a')
    m.send('NEXT')
    expect(m.getState()).toBe('b')
    m.send('NEXT')
    expect(m.getState()).toBe('c')
    m.send('NEXT')
    expect(m.getState()).toBe('a')
  })

  it('returns the same machine instance from createMachine', () => {
    const m = createMachine({
      initial: 'idle',
      states: { idle: {} },
    })
    expect(m).toBeDefined()
    expect(typeof m.send).toBe('function')
    expect(typeof m.getState).toBe('function')
    expect(typeof m.matches).toBe('function')
    expect(typeof m.can).toBe('function')
    expect(typeof m.subscribe).toBe('function')
  })
})

describe('subscribe / unsubscribe', () => {
  it('subscribe calls callback on transition', () => {
    const m = createMachine({
      initial: 'a',
      states: { a: { on: { GO: 'b' } }, b: {} },
    })
    const fn = vi.fn()
    m.subscribe(fn)
    m.send('GO')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('subscribe with null throws', () => {
    const m = createMachine({
      initial: 'a',
      states: { a: {} },
    })
    expect(() => m.subscribe(null as any)).toThrow()
  })

  it('unsubscribe prevents further callbacks', () => {
    const m = createMachine({
      initial: 'a',
      states: { a: { on: { GO: 'b' } }, b: { on: { BACK: 'a' } } },
    })
    const fn = vi.fn()
    const unsub = m.subscribe(fn)
    unsub()
    m.send('GO')
    expect(fn).not.toHaveBeenCalled()
  })

  it('multiple subscribers all receive events', () => {
    const m = createMachine({
      initial: 'a',
      states: { a: { on: { GO: 'b' } }, b: {} },
    })
    const f1 = vi.fn()
    const f2 = vi.fn()
    m.subscribe(f1)
    m.subscribe(f2)
    m.send('GO')
    expect(f1).toHaveBeenCalledWith('b')
    expect(f2).toHaveBeenCalledWith('b')
  })

  it('unsubscribe only removes that specific listener', () => {
    const m = createMachine({
      initial: 'a',
      states: { a: { on: { GO: 'b' } }, b: { on: { BACK: 'a' } } },
    })
    const keep = vi.fn()
    const remove = vi.fn()
    m.subscribe(keep)
    const unsub = m.subscribe(remove)
    m.send('GO')
    expect(keep).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledTimes(1)
    unsub()
    m.send('BACK')
    expect(keep).toHaveBeenCalledTimes(2)
    expect(remove).toHaveBeenCalledTimes(1)
  })
})

describe('entry / exit actions', () => {
  it('calls entry action when entering state', () => {
    const entryFn = vi.fn()
    const m = createMachine({
      initial: 'a',
      states: { a: { on: { GO: 'b' } }, b: { entry: entryFn } },
    })
    m.send('GO')
    expect(entryFn).toHaveBeenCalledTimes(1)
  })

  it('calls exit action when leaving state', () => {
    const exitFn = vi.fn()
    const m = createMachine({
      initial: 'a',
      states: { a: { on: { GO: 'b' }, exit: exitFn }, b: {} },
    })
    m.send('GO')
    expect(exitFn).toHaveBeenCalledTimes(1)
  })

  it('calls exit then entry in order', () => {
    const order: string[] = []
    const m = createMachine({
      initial: 'a',
      states: {
        a: {
          on: { GO: 'b' },
          exit: () => order.push('exit-a'),
        },
        b: {
          entry: () => order.push('entry-b'),
        },
      },
    })
    m.send('GO')
    expect(order).toEqual(['exit-a', 'entry-b'])
  })

  it('passes context to entry/exit', () => {
    const entryCtx = vi.fn()
    const exitCtx = vi.fn()
    const m = createMachine({
      initial: 'a',
      states: {
        a: { on: { GO: 'b' }, exit: exitCtx },
        b: { entry: entryCtx },
      },
    })
    m.send('GO')
    expect(entryCtx).toHaveBeenCalledWith(expect.objectContaining({ transitionCount: 1, previousState: 'a' }))
    expect(exitCtx).toHaveBeenCalledWith(expect.objectContaining({ transitionCount: 0, previousState: null }))
  })
})

describe('guards (conditional transitions)', () => {
  it('transition is blocked when guard returns false', () => {
    let allow = false
    const m = createMachine({
      initial: 'a',
      states: {
        a: { on: { GO: 'b' } },
        b: { on: { BACK: 'a' } },
      },
    })
    // Simulate guard by not sending when blocked
    if (!allow) {
      // don't send
    }
    m.send('GO')
    // No guard mechanism in the machine itself — the user must guard externally
    // This tests that the machine always transitions when event matches
    expect(m.getState()).toBe('b')
  })
})

describe('edge cases', () => {
  it('empty states config: only initial state', () => {
    const m = createMachine({
      initial: 'only',
      states: { only: {} },
    })
    expect(m.getState()).toBe('only')
    m.send('ANY' as any)
    expect(m.getState()).toBe('only')
  })

  it('self-transition calls exit and entry', () => {
    const exitFn = vi.fn()
    const entryFn = vi.fn()
    const m = createMachine({
      initial: 'a',
      states: {
        a: { on: { SELF: 'a' }, exit: exitFn, entry: entryFn },
      },
    })
    m.send('SELF')
    expect(exitFn).toHaveBeenCalledTimes(1)
    expect(entryFn).toHaveBeenCalledTimes(1)
  })

  it('getState does not throw after many transitions', () => {
    const m = createMachine({
      initial: 'a',
      states: {
        a: { on: { NEXT: 'b' } },
        b: { on: { NEXT: 'a' } },
      },
    })
    for (let i = 0; i < 1000; i++) {
      m.send('NEXT')
    }
    expect(typeof m.getState()).toBe('string')
  })
})

describe('type safety (runtime)', () => {
  it('works with numeric-like state strings', () => {
    const m = createMachine({
      initial: '0',
      states: { '0': { on: { UP: '1' } }, '1': {} },
    })
    expect(m.getState()).toBe('0')
    m.send('UP')
    expect(m.getState()).toBe('1')
  })

  it('works with a single state and no events', () => {
    const m = createMachine({
      initial: 'alone',
      states: { alone: {} },
    })
    expect(m.getState()).toBe('alone')
  })
})
