import { describe, it, expect } from 'vitest'
import { Maybe, Either } from '../src/structures/index.js'

/* ──────────────────────────────────────────────── Maybe<T> ─────── */

describe('Maybe.just', () => {
  it('creates a Just variant', () => {
    const m = Maybe.just(42)
    expect(m.isJust()).toBe(true)
    expect(m.isNothing()).toBe(false)
  })
})

describe('Maybe.nothing', () => {
  it('creates a Nothing variant', () => {
    const m = Maybe.nothing<number>()
    expect(m.isJust()).toBe(false)
    expect(m.isNothing()).toBe(true)
  })
})

describe('Maybe.of(null)', () => {
  it('creates Nothing', () => {
    const m = Maybe.of(null)
    expect(m.isNothing()).toBe(true)
  })
})

describe('Maybe.of(undefined)', () => {
  it('creates Nothing', () => {
    const m = Maybe.of(undefined)
    expect(m.isNothing()).toBe(true)
  })
})

describe('Maybe.of(value)', () => {
  it('creates Just for a valid value', () => {
    const m = Maybe.of(7)
    expect(m.isJust()).toBe(true)
  })
})

describe('getOrElse', () => {
  it('returns the value for Just', () => {
    expect(Maybe.just(3).getOrElse(0)).toBe(3)
  })

  it('returns the default for Nothing', () => {
    expect(Maybe.nothing<number>().getOrElse(0)).toBe(0)
  })
})

describe('getOrThrow', () => {
  it('returns the value for Just', () => {
    expect(Maybe.just(3).getOrThrow()).toBe(3)
  })

  it('throws for Nothing', () => {
    expect(() => Maybe.nothing<number>().getOrThrow()).toThrow()
  })

  it('throws with custom message', () => {
    expect(() => Maybe.nothing<number>().getOrThrow('missing')).toThrow('missing')
  })
})

describe('map', () => {
  it('transforms a Just value', () => {
    const r = Maybe.just(2).map((x) => x * 3)
    expect(r.isJust()).toBe(true)
    expect(r.getOrElse(0)).toBe(6)
  })

  it('skips Nothing', () => {
    const r = Maybe.nothing<number>().map((x) => x * 3)
    expect(r.isNothing()).toBe(true)
  })
})

describe('flatMap', () => {
  it('chains operations on Just', () => {
    const r = Maybe.just(4).flatMap((x) => Maybe.just(x * 2))
    expect(r.isJust()).toBe(true)
    expect(r.getOrElse(0)).toBe(8)
  })

  it('skips Nothing', () => {
    const r = Maybe.nothing<number>().flatMap((x) => Maybe.just(x * 2))
    expect(r.isNothing()).toBe(true)
  })
})

describe('ap', () => {
  it('applies a wrapped function', () => {
    const add2 = (x: number) => x + 2
    const r = Maybe.just(3).ap(Maybe.just(add2))
    expect(r.getOrElse(0)).toBe(5)
  })

  it('returns Nothing when the function is Nothing', () => {
    const r = Maybe.just(3).ap(Maybe.nothing<(x: number) => number>())
    expect(r.isNothing()).toBe(true)
  })

  it('returns Nothing when the value is Nothing', () => {
    const add2 = (x: number) => x + 2
    const r = Maybe.nothing<number>().ap(Maybe.just(add2))
    expect(r.isNothing()).toBe(true)
  })
})

describe('filter', () => {
  it('keeps Just when predicate is satisfied', () => {
    const r = Maybe.just(5).filter((x) => x > 3)
    expect(r.isJust()).toBe(true)
    expect(r.getOrElse(0)).toBe(5)
  })

  it('returns Nothing when predicate fails', () => {
    const r = Maybe.just(2).filter((x) => x > 3)
    expect(r.isNothing()).toBe(true)
  })

  it('preserves Nothing', () => {
    const r = Maybe.nothing<number>().filter((x) => x > 3)
    expect(r.isNothing()).toBe(true)
  })
})

describe('ifJust / ifNothing', () => {
  it('ifJust fires for Just', () => {
    let side = 0
    Maybe.just(3).ifJust((v) => {
      side = v
    })
    expect(side).toBe(3)
  })

  it('ifNothing does not fire for Just', () => {
    let fired = false
    Maybe.just(3).ifNothing(() => {
      fired = true
    })
    expect(fired).toBe(false)
  })

  it('ifNothing fires for Nothing', () => {
    let fired = false
    Maybe.nothing<number>().ifNothing(() => {
      fired = true
    })
    expect(fired).toBe(true)
  })

  it('ifJust does not fire for Nothing', () => {
    let fired = false
    Maybe.nothing<number>().ifJust(() => {
      fired = true
    })
    expect(fired).toBe(false)
  })

  it('returns the same instance for chaining', () => {
    const m = Maybe.just(1)
    expect(m.ifJust(() => {})).toBe(m)
  })
})

describe('toJSON', () => {
  it('returns the value for Just', () => {
    expect(Maybe.just(42).toJSON()).toBe(42)
  })

  it('returns null for Nothing', () => {
    expect(Maybe.nothing<number>().toJSON()).toBeNull()
  })
})

/* ───────────────────────────────────────────── Either<L,R> ────── */

describe('Either.right', () => {
  it('creates a Right variant', () => {
    const e = Either.right<string, number>(42)
    expect(e.isRight()).toBe(true)
    expect(e.isLeft()).toBe(false)
  })
})

describe('Either.left', () => {
  it('creates a Left variant', () => {
    const e = Either.left<string, number>('error')
    expect(e.isLeft()).toBe(true)
    expect(e.isRight()).toBe(false)
  })
})

describe('map on Right', () => {
  it('transforms the right value', () => {
    const e = Either.right<string, number>(3).map((x) => x * 2)
    expect(e.isRight()).toBe(true)
    expect(e.getOrElse(0)).toBe(6)
  })

  it('no-ops on Left', () => {
    const e = Either.left<string, number>('err').map((x) => x * 2)
    expect(e.isLeft()).toBe(true)
    expect(e.getOrElse(0)).toBe(0)
  })
})

describe('mapLeft on Left', () => {
  it('transforms the left value', () => {
    const e = Either.left<string, number>('err').mapLeft((s) => s.toUpperCase())
    expect(e.isLeft()).toBe(true)
    expect(e.getLeftOrElse('')).toBe('ERR')
  })

  it('no-ops on Right', () => {
    const e = Either.right<string, number>(1).mapLeft((s) => s.toUpperCase())
    expect(e.isRight()).toBe(true)
    expect(e.getOrElse(0)).toBe(1)
  })
})

describe('flatMap', () => {
  it('chains operations on Right', () => {
    const r = Either.right<string, number>(4).flatMap((x) => Either.right(x * 2))
    expect(r.getOrElse(0)).toBe(8)
  })

  it('skips on Left', () => {
    const r = Either.left<string, number>('err').flatMap((x) => Either.right(x * 2))
    expect(r.isLeft()).toBe(true)
  })
})

describe('bimap', () => {
  it('maps right side', () => {
    const e = Either.right<string, number>(3).bimap(
      (l) => l,
      (r) => r * 2,
    )
    expect(e.isRight()).toBe(true)
    expect(e.getOrElse(0)).toBe(6)
  })

  it('maps left side', () => {
    const e = Either.left<string, number>('x').bimap(
      (l) => l + '!',
      (r) => r,
    )
    expect(e.isLeft()).toBe(true)
    expect(e.getLeftOrElse('')).toBe('x!')
  })
})

describe('swap', () => {
  it('exchanges sides', () => {
    const r = Either.left<string, number>('err').swap()
    expect(r.isRight()).toBe(true)
    expect(r.getOrElse('fallback')).toBe('err')

    const l = Either.right<string, number>(42).swap()
    expect(l.isLeft()).toBe(true)
    expect(l.getLeftOrElse(0)).toBe(42)
  })
})

describe('toMaybe', () => {
  it('converts Right to Just', () => {
    const m = Either.right<string, number>(42).toMaybe()
    expect(m.isJust()).toBe(true)
    expect(m.getOrElse(0)).toBe(42)
  })

  it('converts Left to Nothing', () => {
    const m = Either.left<string, number>('err').toMaybe()
    expect(m.isNothing()).toBe(true)
  })
})

describe('getOrThrow', () => {
  it('returns the right value', () => {
    expect(Either.right(3).getOrThrow()).toBe(3)
  })

  it('throws on Left', () => {
    expect(() => Either.left('err').getOrThrow()).toThrow()
  })
})

describe('getLeftOrElse', () => {
  it('returns left value for Left', () => {
    expect(Either.left('err').getLeftOrElse('fall')).toBe('err')
  })

  it('returns default for Right', () => {
    expect(Either.right(1).getLeftOrElse('fall')).toBe('fall')
  })
})

describe('ifLeft / ifRight', () => {
  it('ifLeft fires for Left', () => {
    let side = ''
    Either.left('err').ifLeft((v) => {
      side = v
    })
    expect(side).toBe('err')
  })

  it('ifRight fires for Right', () => {
    let side = 0
    Either.right(42).ifRight((v) => {
      side = v
    })
    expect(side).toBe(42)
  })

  it('returns the same instance', () => {
    const e = Either.right(1)
    expect(e.ifRight(() => {})).toBe(e)
  })
})

describe('toJSON', () => {
  it('serialises Left', () => {
    expect(Either.left('err').toJSON()).toEqual({ _tag: 'Left', value: 'err' })
  })

  it('serialises Right', () => {
    expect(Either.right(42).toJSON()).toEqual({ _tag: 'Right', value: 42 })
  })
})

/* ─── Integration ──────────────────────────────── */

describe('Integration: Either -> Maybe -> getOrElse', () => {
  it('chains across monads', () => {
    const result = Either.right<string, number>(10)
      .map((x) => x * 2)
      .toMaybe()
      .filter((x) => x > 5)
      .getOrElse(0)

    expect(result).toBe(20)
  })

  it('Nothing propagates through flatMap', () => {
    const r = Maybe.just(5)
      .flatMap((x) => (x > 3 ? Maybe.just(x * 2) : Maybe.nothing<number>()))
      .flatMap((x) => Maybe.just(x + 1))
      .getOrElse(0)

    expect(r).toBe(11)
  })

  it('Nothing short-circuits', () => {
    const r = Maybe.just(1)
      .flatMap((x) => Maybe.nothing<number>())
      .flatMap((x) => Maybe.just(x + 1))
      .getOrElse(99)

    expect(r).toBe(99)
  })
})

describe('TypeScript type inference', () => {
  it('infers types through map chains', () => {
    const m: Maybe<number> = Maybe.just(5)
    const result: string = m.map((x) => x.toString()).getOrElse('')
    expect(result).toBe('5')
  })

  it('infers Either types through bimap', () => {
    const e: Either<string, number> = Either.right(3)
    const mapped: Either<number, string> = e.bimap(
      (l) => l.length,
      (r) => r.toFixed(2),
    )
    expect(mapped.getOrElse('')).toBe('3.00')
  })

  it('Either->Maybe preserves type', () => {
    const m: Maybe<number> = Either.right<string, number>(7).toMaybe()
    expect(m.getOrElse(0)).toBe(7)
  })
})
