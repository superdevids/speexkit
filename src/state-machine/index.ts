/** @module state-machine */

export interface MachineContext {
  transitionCount: number
  previousState: string | null
  elapsed: number
}

interface StateConfig<States extends string, Events extends string> {
  on?: Partial<Record<Events, States>>
  entry?: (ctx: MachineContext) => void
  exit?: (ctx: MachineContext) => void
}

export interface MachineConfig<States extends string, Events extends string> {
  initial: States
  states: Record<States, StateConfig<States, Events>>
}

export interface Machine<States extends string, Events extends string> {
  send(event: Events): void
  matches(...states: States[]): boolean
  subscribe(fn: (state: States) => void): () => void
  getState(): States
  can(event: Events): boolean
}

/**
 * Create a finite state machine.
 * @param config - Machine configuration with initial state and state definitions
 * @returns A state machine instance
 */
export function createMachine<States extends string, Events extends string>(
  config: MachineConfig<States, Events>,
): Machine<States, Events> {
  const startTime = Date.now()
  let currentState: States = config.initial
  let transitionCount = 0
  let previousState: States | null = null
  const listeners = new Set<(state: States) => void>()

  function getElapsed(): number {
    return Date.now() - startTime
  }

  function getContext(): MachineContext {
    return {
      transitionCount,
      previousState,
      elapsed: getElapsed(),
    }
  }

  const machine: Machine<States, Events> = {
    send(event: Events): void {
      const stateDef = config.states[currentState]
      const nextState = stateDef.on?.[event]
      if (nextState === undefined) {
        return
      }

      const prevStateDef = config.states[currentState]
      prevStateDef.exit?.(getContext())

      previousState = currentState
      currentState = nextState
      transitionCount++

      const nextStateDef = config.states[currentState]
      nextStateDef.entry?.(getContext())

      for (const fn of listeners) {
        fn(currentState)
      }
    },

    matches(...states: States[]): boolean {
      return states.includes(currentState)
    },

    subscribe(fn: (state: States) => void): () => void {
      if (typeof fn !== 'function') {
        throw new Error('subscribe requires a function')
      }
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },

    getState(): States {
      return currentState
    },

    can(event: Events): boolean {
      const stateDef = config.states[currentState]
      return stateDef.on?.[event] !== undefined
    },
  }

  return machine
}
