/**
 * The Ok variant of a {@link Result}.
 *
 * Wraps a successful value.
 *
 * @template T — The type of the success value.
 */
export interface OkImpl<T> {
  readonly ok: true
  readonly value: T

  isOk(): this is OkImpl<T>
  isErr(): false
  unwrap(): T
  unwrapOr(default_: T): T
  map<U>(fn: (value: T) => U): Result<U, never>
  mapErr(fn: (error: never) => never): Result<T, never>
  getError(): null
}

/**
 * The Err variant of a {@link Result}.
 *
 * Wraps a failure value.
 *
 * @template E — The type of the error (defaults to `Error`).
 */
export interface ErrImpl<E> {
  readonly ok: false
  readonly error: E

  isOk(): false
  isErr(): this is ErrImpl<E>
  unwrap(): never
  unwrapOr<U>(default_: U): U
  map(fn: (value: never) => never): Result<never, E>
  mapErr<F>(fn: (error: E) => F): Result<never, F>
  getError(): E
}

/**
 * A discriminated union representing either success ({@link OkImpl}) or failure ({@link ErrImpl}).
 *
 * Inspired by Rust's `Result<T, E>`.
 *
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number> {
 *   return b === 0 ? err(new Error('Division by zero')) : ok(a / b)
 * }
 *
 * const result = divide(10, 2)
 * if (result.isOk()) {
 *   console.log(result.value)
 * }
 * ```
 */
export type Result<T, E = Error> = OkImpl<T> | ErrImpl<E>

// ─── Implementation ───────────────────────────────────────────

class OkValue<T> implements OkImpl<T> {
  readonly ok = true as const
  readonly value: T

  constructor(value: T) {
    this.value = value
  }

  isOk(): this is OkImpl<T> {
    return true
  }

  isErr(): false {
    return false
  }

  unwrap(): T {
    return this.value
  }

  unwrapOr(_default_: T): T {
    return this.value
  }

  map<U>(fn: (value: T) => U): Result<U, never> {
    return new OkValue(fn(this.value))
  }

  mapErr(_fn: (error: never) => never): Result<T, never> {
    return this
  }

  getError(): null {
    return null
  }
}

class ErrValue<E> implements ErrImpl<E> {
  readonly ok = false as const
  readonly error: E

  constructor(error: E) {
    this.error = error
  }

  isOk(): false {
    return false
  }

  isErr(): this is ErrImpl<E> {
    return true
  }

  unwrap(): never {
    throw this.error
  }

  unwrapOr<U>(default_: U): U {
    return default_
  }

  map(_fn: (value: never) => never): Result<never, E> {
    return this
  }

  mapErr<F>(fn: (error: E) => F): Result<never, F> {
    return new ErrValue(fn(this.error))
  }

  getError(): E {
    return this.error
  }
}

// ─── Factory functions ────────────────────────────────────────

/**
 * Create an {@link OkImpl} result wrapping a successful value.
 *
 * @example
 * ```ts
 * const result = Ok(42)
 * ```
 */
export function Ok<T>(value: T): OkImpl<T> {
  return new OkValue(value)
}

/**
 * Create an {@link ErrImpl} result wrapping a failure.
 *
 * @example
 * ```ts
 * const result = Err(new Error('something went wrong'))
 * ```
 */
export function Err<E = Error>(error: E): ErrImpl<E> {
  return new ErrValue(error)
}

/**
 * Shorthand alias for {@link Ok}.
 *
 * @example
 * ```ts
 * const result = ok(42)
 * ```
 */
export const ok = Ok

/**
 * Shorthand alias for {@link Err}.
 *
 * @example
 * ```ts
 * const result = err(new Error('something went wrong'))
 * ```
 */
export const err = Err
