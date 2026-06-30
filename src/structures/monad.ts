/**
 * @file Maybe<T> and Either<L,R> monads. Zero deps, ESM, strict, immutable.
 *
 * — speexkit
 */

import type { Result } from '../error/Result.js'
import { Err, Ok } from '../error/Result.js'

/* ──────────────────────────────────────────────── Maybe<T> ─────── */

enum MaybeKind {
  Just,
  Nothing,
}

/**
 * Encapsulates an optional value. Either **Just** (some value) or **Nothing** (absent).
 *
 * Inspired by Haskell / Elm / Rust `Option<T>`.
 *
 * @template T — The type of the inner value.
 *
 * @example
 * ```ts
 * const safeDiv = (a: number, b: number): Maybe<number> =>
 *   b === 0 ? Maybe.nothing() : Maybe.just(a / b)
 *
 * safeDiv(10, 2)
 *   .map(x => x * 2)
 *   .getOrElse(0) // 10
 * ```
 */
export class Maybe<T> {
  #kind: MaybeKind
  #value: T | undefined

  private constructor(kind: MaybeKind.Just, value: T)
  private constructor(kind: MaybeKind.Nothing)
  private constructor(kind: MaybeKind, value?: T) {
    this.#kind = kind
    this.#value = value
  }

  // ─── Constructors ─────────────────────────────────────────────

  /**
   * Lift a nullable value into a `Maybe`.
   * Returns **Nothing** when `value` is `null` / `undefined`, otherwise **Just**.
   *
   * @param value — The value to lift.
   * @returns `Maybe<T>`
   *
   * @example
   * ```ts
   * Maybe.of(null)      // Nothing
   * Maybe.of(undefined) // Nothing
   * Maybe.of(42)        // Just(42)
   * ```
   */
  static of<T>(value: T | null | undefined): Maybe<T> {
    return value === null || value === undefined ? new Maybe<T>(MaybeKind.Nothing) : new Maybe<T>(MaybeKind.Just, value)
  }

  /**
   * Create a **Just** monad wrapping a non-nullable value.
   *
   * @param value — The value to wrap.
   * @returns `Maybe<T>`
   *
   * @example
   * ```ts
   * Maybe.just("hello")
   * ```
   */
  static just<T>(value: T): Maybe<T> {
    return new Maybe<T>(MaybeKind.Just, value)
  }

  /**
   * Create a **Nothing** monad representing absence.
   *
   * @returns `Maybe<T>`
   *
   * @example
   * ```ts
   * Maybe.nothing<number>()
   * ```
   */
  static nothing<T>(): Maybe<T> {
    return new Maybe<T>(MaybeKind.Nothing)
  }

  // ─── Query ────────────────────────────────────────────────────

  /** Returns `true` when this is a **Just** variant. */
  isJust(): boolean {
    return this.#kind === MaybeKind.Just
  }

  /** Returns `true` when this is a **Nothing** variant. */
  isNothing(): boolean {
    return this.#kind === MaybeKind.Nothing
  }

  // ─── Extraction ───────────────────────────────────────────────

  /**
   * Return the wrapped value if **Just**, otherwise `defaultValue`.
   *
   * @param defaultValue — Fallback value.
   *
   * @example
   * ```ts
   * Maybe.just(3).getOrElse(0)    // 3
   * Maybe.nothing().getOrElse(0)  // 0
   * ```
   */
  getOrElse(defaultValue: T): T {
    return this.#kind === MaybeKind.Just ? this.#value! : defaultValue
  }

  /**
   * Return the wrapped value if **Just**, otherwise throw.
   *
   * @param message — Optional message for the error.
   * @throws `Error` when called on **Nothing**.
   *
   * @example
   * ```ts
   * Maybe.just(3).getOrThrow()        // 3
   * Maybe.nothing().getOrThrow("!")   // throws Error("!")
   * ```
   */
  getOrThrow(message?: string): T {
    if (this.#kind === MaybeKind.Nothing) {
      throw new Error(message ?? 'Cannot extract value from Nothing')
    }
    return this.#value!
  }

  // ─── Transformation ───────────────────────────────────────────

  /**
   * Transform the inner value when **Just**; no-op when **Nothing**.
   *
   * @param fn — Mapping function.
   * @returns `Maybe<U>`
   *
   * @example
   * ```ts
   * Maybe.just(2).map(x => x * 3)  // Just(6)
   * Maybe.nothing().map(x => x)    // Nothing
   * ```
   */
  map<U>(fn: (value: T) => U): Maybe<U> {
    return this.#kind === MaybeKind.Just ? Maybe.just(fn(this.#value!)) : Maybe.nothing()
  }

  /**
   * Chain a function that returns another `Maybe` (monadic bind).
   *
   * @param fn — Chain function.
   * @returns `Maybe<U>`
   *
   * @example
   * ```ts
   * Maybe.just(4).flatMap(x => Maybe.just(x * 2))  // Just(8)
   * Maybe.nothing().flatMap(x => Maybe.just(x))    // Nothing
   * ```
   */
  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U> {
    return this.#kind === MaybeKind.Just ? fn(this.#value!) : Maybe.nothing()
  }

  /**
   * Apply a wrapped function to the wrapped value (applicative).
   *
   * @param maybeFn — A **Just**-wrapped function, or **Nothing**.
   * @returns `Maybe<U>`
   *
   * @example
   * ```ts
   * const add2 = (x: number) => x + 2
   * Maybe.just(3).ap(Maybe.just(add2))  // Just(5)
   * Maybe.just(3).ap(Maybe.nothing())   // Nothing
   * ```
   */
  ap<U>(maybeFn: Maybe<(value: T) => U>): Maybe<U> {
    if (this.#kind === MaybeKind.Nothing || maybeFn.isNothing()) {
      return Maybe.nothing()
    }
    return Maybe.just(maybeFn.getOrThrow()(this.#value!))
  }

  // ─── Filtering ────────────────────────────────────────────────

  /**
   * Convert to **Nothing** when the predicate is not satisfied.
   *
   * @param predicate — Test function.
   * @returns `Maybe<T>`
   *
   * @example
   * ```ts
   * Maybe.just(5).filter(x => x > 3)  // Just(5)
   * Maybe.just(2).filter(x => x > 3)  // Nothing
   * ```
   */
  filter(predicate: (value: T) => boolean): Maybe<T> {
    if (this.#kind === MaybeKind.Nothing) return this
    return predicate(this.#value!) ? this : Maybe.nothing()
  }

  // ─── Side effects ─────────────────────────────────────────────

  /**
   * Execute a callback when this is **Just**; returns the same instance (chainable).
   *
   * @param fn — Side-effect callback.
   * @returns `Maybe<T>`
   */
  ifJust(fn: (value: T) => void): Maybe<T> {
    if (this.#kind === MaybeKind.Just) fn(this.#value!)
    return this
  }

  /**
   * Execute a callback when this is **Nothing**; returns the same instance (chainable).
   *
   * @param fn — Side-effect callback.
   * @returns `Maybe<T>`
   */
  ifNothing(fn: () => void): Maybe<T> {
    if (this.#kind === MaybeKind.Nothing) fn()
    return this
  }

  // ─── Utilities ────────────────────────────────────────────────

  /**
   * Convert to a `Result<T, E>` — **Just** becomes `Ok(value)`, **Nothing** becomes `Err(error)`.
   *
   * @param error — The error value to use when this is **Nothing**.
   * @returns `Result<T, E>`
   *
   * @example
   * ```ts
   * Maybe.just(42).toResult("missing")  // Ok(42)
   * Maybe.nothing().toResult("missing") // Err("missing")
   * ```
   */
  toResult<E>(error: E): Result<T, E> {
    return this.#kind === MaybeKind.Just ? Ok(this.#value!) : Err(error)
  }

  /**
   * Serialise to JSON — returns the inner value or `null` for **Nothing**.
   *
   * @example
   * ```ts
   * Maybe.just(42).toJSON()  // 42
   * Maybe.nothing().toJSON() // null
   * ```
   */
  toJSON(): T | null {
    return this.#kind === MaybeKind.Just ? this.#value! : null
  }
}

/* ───────────────────────────────────────────── Either<L, R> ───── */

enum EitherKind {
  Left,
  Right,
}

/**
 * A discriminated union that holds either a **Left** (by convention the error / absent
 * case) or a **Right** (the success value). Inspired by Haskell / Elm `Either` and
 * Rust `Result` (but with a fixed left type).
 *
 * @template L — The type of the left (error) value.
 * @template R — The type of the right (success) value.
 *
 * @example
 * ```ts
 * const safeDiv = (a: number, b: number): Either<string, number> =>
 *   b === 0 ? Either.left("div by zero") : Either.right(a / b)
 * ```
 */
export class Either<L, R> {
  #kind: EitherKind
  #left: L | undefined
  #right: R | undefined

  private constructor(kind: EitherKind.Left, value: L)
  private constructor(kind: EitherKind.Right, value: R)
  private constructor(kind: EitherKind, value: L | R, _unused?: undefined) {
    this.#kind = kind
    if (kind === EitherKind.Left) {
      this.#left = value as L
    } else {
      this.#right = value as R
    }
  }

  // ─── Constructors ─────────────────────────────────────────────

  /**
   * Create a **Left** variant (typically represents failure / error).
   *
   * @param value — The left value.
   * @returns `Either<L, R>`
   *
   * @example
   * ```ts
   * Either.left("error")
   * ```
   */
  static left<L, R>(value: L): Either<L, R> {
    return new Either<L, R>(EitherKind.Left, value)
  }

  /**
   * Create a **Right** variant (typically represents success).
   *
   * @param value — The right value.
   * @returns `Either<L, R>`
   *
   * @example
   * ```ts
   * Either.right(42)
   * ```
   */
  static right<L, R>(value: R): Either<L, R> {
    return new Either<L, R>(EitherKind.Right, value)
  }

  // ─── Query ────────────────────────────────────────────────────

  /** Returns `true` when this is a **Left** variant. */
  isLeft(): boolean {
    return this.#kind === EitherKind.Left
  }

  /** Returns `true` when this is a **Right** variant. */
  isRight(): boolean {
    return this.#kind === EitherKind.Right
  }

  // ─── Extraction ───────────────────────────────────────────────

  /**
   * Return the right value if **Right**, otherwise `defaultValue`.
   *
   * @param defaultValue — Fallback value.
   *
   * @example
   * ```ts
   * Either.right(3).getOrElse(0)    // 3
   * Either.left("err").getOrElse(0) // 0
   * ```
   */
  getOrElse(defaultValue: R): R {
    return this.#kind === EitherKind.Right ? this.#right! : defaultValue
  }

  /**
   * Return the left value if **Left**, otherwise `defaultValue`.
   *
   * @param defaultValue — Fallback value.
   *
   * @example
   * ```ts
   * Either.left("err").getLeftOrElse("fallback")  // "err"
   * Either.right(1).getLeftOrElse("fallback")     // "fallback"
   * ```
   */
  getLeftOrElse(defaultValue: L): L {
    return this.#kind === EitherKind.Left ? this.#left! : defaultValue
  }

  /**
   * Return the right value if **Right**, otherwise throw.
   *
   * @param message — Optional message for the error.
   * @throws `Error` when called on **Left**.
   */
  getOrThrow(message?: string): R {
    if (this.#kind === EitherKind.Left) {
      throw new Error(message ?? `Cannot extract right value from Left(${String(this.#left)})`)
    }
    return this.#right!
  }

  // ─── Transformation ───────────────────────────────────────────

  /**
   * Transform the **Right** value; no-op on **Left**.
   *
   * @param fn — Mapping function for the right value.
   * @returns `Either<L, U>`
   *
   * @example
   * ```ts
   * Either.right(3).map(x => x * 2)  // Right(6)
   * Either.left("err").map(x => x)   // Left("err")
   * ```
   */
  map<U>(fn: (value: R) => U): Either<L, U> {
    return this.#kind === EitherKind.Right ? Either.right(fn(this.#right!)) : (this as unknown as Either<L, U>)
  }

  /**
   * Transform the **Left** value; no-op on **Right**.
   *
   * @param fn — Mapping function for the left value.
   * @returns `Either<U, R>`
   *
   * @example
   * ```ts
   * Either.left("err").mapLeft(s => s.toUpperCase())  // Left("ERR")
   * Either.right(1).mapLeft(s => s)                    // Right(1)
   * ```
   */
  mapLeft<U>(fn: (value: L) => U): Either<U, R> {
    return this.#kind === EitherKind.Left ? Either.left(fn(this.#left!)) : (this as unknown as Either<U, R>)
  }

  /**
   * Chain a function on the **Right** value (monadic bind).
   *
   * @param fn — Chain function returning an `Either`.
   * @returns `Either<L, U>`
   *
   * @example
   * ```ts
   * Either.right(4).flatMap(x => Either.right(x * 2))  // Right(8)
   * Either.left("err").flatMap(x => Either.right(x))   // Left("err")
   * ```
   */
  flatMap<U>(fn: (value: R) => Either<L, U>): Either<L, U> {
    return this.#kind === EitherKind.Right ? fn(this.#right!) : (this as unknown as Either<L, U>)
  }

  /**
   * Map over both sides simultaneously.
   *
   * @param leftFn — Function to apply to the left value.
   * @param rightFn — Function to apply to the right value.
   * @returns `Either<A, B>`
   *
   * @example
   * ```ts
   * Either.right(3).bimap(l => l, r => r * 2)    // Right(6)
   * Either.left("x").bimap(l => l + "!", r => r)  // Left("x!")
   * ```
   */
  bimap<A, B>(leftFn: (value: L) => A, rightFn: (value: R) => B): Either<A, B> {
    return this.#kind === EitherKind.Left ? Either.left(leftFn(this.#left!)) : Either.right(rightFn(this.#right!))
  }

  // ─── Side effects ─────────────────────────────────────────────

  /**
   * Execute a callback when this is **Left**; returns the same instance (chainable).
   *
   * @param fn — Side-effect callback.
   * @returns `Either<L, R>`
   */
  ifLeft(fn: (value: L) => void): Either<L, R> {
    if (this.#kind === EitherKind.Left) fn(this.#left!)
    return this
  }

  /**
   * Execute a callback when this is **Right**; returns the same instance (chainable).
   *
   * @param fn — Side-effect callback.
   * @returns `Either<L, R>`
   */
  ifRight(fn: (value: R) => void): Either<L, R> {
    if (this.#kind === EitherKind.Right) fn(this.#right!)
    return this
  }

  // ─── Utilities ────────────────────────────────────────────────

  /**
   * Swap sides — **Left** becomes **Right** and vice versa.
   *
   * @returns `Either<R, L>`
   *
   * @example
   * ```ts
   * Either.left("err").swap()  // Right("err")
   * Either.right(1).swap()     // Left(1)
   * ```
   */
  swap(): Either<R, L> {
    return this.#kind === EitherKind.Left ? Either.right(this.#left!) : Either.left(this.#right!)
  }

  /**
   * Convert to a `Maybe<R>` — **Right** becomes **Just**, **Left** becomes **Nothing**.
   *
   * @returns `Maybe<R>`
   *
   * @example
   * ```ts
   * Either.right(42).toMaybe()   // Just(42)
   * Either.left("err").toMaybe() // Nothing
   * ```
   */
  toMaybe(): Maybe<R> {
    return this.#kind === EitherKind.Right ? Maybe.just(this.#right!) : Maybe.nothing()
  }

  /**
   * Serialise to JSON.
   *
   * @example
   * ```ts
   * Either.right(42).toJSON()   // { _tag: "Right", value: 42 }
   * Either.left("err").toJSON() // { _tag: "Left", value: "err" }
   * ```
   */
  toJSON(): { _tag: 'Left' | 'Right'; value: L | R } {
    return this.#kind === EitherKind.Left ? { _tag: 'Left', value: this.#left! } : { _tag: 'Right', value: this.#right! }
  }
}
