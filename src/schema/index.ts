/**
 * @module schema
 *
 * Lightweight schema validation system — a zero‑dependency alternative to zod.
 *
 * ```ts
 * import { s, type Infer } from 'speexkit/schema/index.js'
 *
 * const UserSchema = s.object({
 *   name: s.string().min(1),
 *   age: s.number().int().positive(),
 * })
 *
 * type User = Infer<typeof UserSchema>
 * // { name: string; age: number }
 * ```
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Simple email check used by {@link StringSchema.email}. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Simple URL check used by {@link StringSchema.url}. */
function isURL(v: string): boolean {
  try {
    new URL(v)
    return true
  } catch {
    return false
  }
}

// ─── ValidationError ────────────────────────────────────────────────────────

/**
 * Error thrown when schema validation fails.
 *
 * Carries the path to the failing field so callers can pinpoint the exact
 * location of invalid data.
 *
 * @example
 * ```ts
 * try {
 *   schema.parse(badData)
 * } catch (e) {
 *   if (e instanceof ValidationError) {
 *     console.error(e.path, e.message)
 *   }
 * }
 * ```
 */
export class ValidationError extends Error {
  /** Path to the field that caused the validation failure. */
  readonly path: readonly (string | number)[]

  /**
   * @param message - Human‑readable error description
   * @param path    - Path segments leading to the failing field
   */
  constructor(message: string, path: (string | number)[] = []) {
    super(message)
    this.name = 'ValidationError'
    this.path = [...path]

    Object.setPrototypeOf(this, new.target.prototype)
  }

  /**
   * Serialize the error to a plain JSON‑safe object.
   */
  toJSON(): {
    name: string
    message: string
    path: readonly (string | number)[]
    stack?: string
  } {
    return {
      name: this.name,
      message: this.message,
      path: this.path,
      ...(this.stack ? { stack: this.stack } : {}),
    }
  }

  override toString(): string {
    const prefix = this.path.length > 0 ? ` at ${this.path.join('.')}` : ''
    return `${this.name}${prefix}: ${this.message}`
  }
}

// ─── Schema ─────────────────────────────────────────────────────────────────

/**
 * Abstract base schema that all schema types extend.
 *
 * @typeParam T - The TypeScript type this schema validates to
 */
export abstract class Schema<T> {
  /**
   * Parse and validate an unknown value.
   *
   * @param value - The raw value to validate
   * @returns The validated value typed as `T`
   * @throws {@link ValidationError} if validation fails
   */
  abstract parse(value: unknown): T

  /**
   * Safely parse and validate, returning a result object instead of throwing.
   *
   * @param value - The raw value to validate
   * @returns `{ success: true, data: T }` on success,
   *          `{ success: false, error: ValidationError }` on failure
   */
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: ValidationError } {
    try {
      return { success: true as const, data: this.parse(value) }
    } catch (e) {
      if (e instanceof ValidationError) {
        return { success: false as const, error: e }
      }
      throw e
    }
  }

  /**
   * Return a new schema that also accepts `undefined`.
   */
  optional(): Schema<T | undefined> {
    return new OptionalSchema(this)
  }

  /**
   * Return a new schema that also accepts `null`.
   */
  nullable(): Schema<T | null> {
    return new NullableSchema(this)
  }

  /**
   * Return a new schema with a custom refinement check applied after the
   * base validation passes.
   *
   * @param fn      - Predicate that receives the parsed value
   * @param message - Optional error message on failure (default: `'Refinement failed'`)
   */
  refine(fn: (value: T) => boolean, message?: string): Schema<T> {
    return new RefineSchema(this, fn, message ?? 'Refinement failed')
  }
}

// ─── Wrapper schemas ────────────────────────────────────────────────────────

/**
 * Schema that wraps another schema to accept `undefined`.
 *
 * @internal
 */
export class OptionalSchema<T> extends Schema<T | undefined> {
  constructor(private readonly inner: Schema<T>) {
    super()
  }

  parse(value: unknown): T | undefined {
    if (value === undefined) return undefined
    return this.inner.parse(value)
  }
}

/**
 * Schema that wraps another schema to accept `null`.
 *
 * @internal
 */
export class NullableSchema<T> extends Schema<T | null> {
  constructor(private readonly inner: Schema<T>) {
    super()
  }

  parse(value: unknown): T | null {
    if (value === null) return null
    return this.inner.parse(value)
  }
}

/**
 * Schema that applies a custom refinement after its inner schema validates.
 *
 * @internal
 */
export class RefineSchema<T> extends Schema<T> {
  constructor(
    private readonly inner: Schema<T>,
    private readonly fn: (value: T) => boolean,
    private readonly message: string,
  ) {
    super()
  }

  parse(value: unknown): T {
    const parsed = this.inner.parse(value)
    if (!this.fn(parsed)) {
      throw new ValidationError(this.message, [])
    }
    return parsed
  }
}

// ─── Infer type helper ──────────────────────────────────────────────────────

/**
 * Extract the inner TypeScript type from a {@link Schema}.
 *
 * @example
 * ```ts
 * const s = new StringSchema()
 * type T = Infer<typeof s> // string
 * ```
 */
export type Infer<S> = S extends Schema<infer T> ? T : never

// ─── StringSchema ───────────────────────────────────────────────────────────

/**
 * Schema that validates and parses string values.
 *
 * Supports chaining constraint methods such as `.min()`, `.max()`, `.email()`,
 * `.url()`, `.regex()`, and `.includes()`.
 *
 * @example
 * ```ts
 * const name = s.string().min(1).max(100)
 * name.parse('hello') // => 'hello'
 * ```
 */
export class StringSchema extends Schema<string> {
  private checks: Array<(v: string) => void> = []

  /**
   * Set a minimum length constraint.
   *
   * @param n - Minimum number of characters (inclusive)
   */
  min(n: number): this {
    this.checks.push((v) => {
      if (v.length < n) {
        throw new ValidationError(`Expected string with minimum length ${n}, got ${v.length}`, [])
      }
    })
    return this
  }

  /**
   * Set a maximum length constraint.
   *
   * @param n - Maximum number of characters (inclusive)
   */
  max(n: number): this {
    this.checks.push((v) => {
      if (v.length > n) {
        throw new ValidationError(`Expected string with maximum length ${n}, got ${v.length}`, [])
      }
    })
    return this
  }

  /**
   * Require the string to be a valid email address.
   */
  email(): this {
    this.checks.push((v) => {
      if (!EMAIL_RE.test(v)) {
        throw new ValidationError('Expected a valid email address', [])
      }
    })
    return this
  }

  /**
   * Require the string to be a valid URL.
   */
  url(): this {
    this.checks.push((v) => {
      if (!isURL(v)) {
        throw new ValidationError('Expected a valid URL', [])
      }
    })
    return this
  }

  /**
   * Require the string to match a regular expression.
   *
   * @param pattern - The regex to test against
   */
  regex(pattern: RegExp): this {
    this.checks.push((v) => {
      if (!pattern.test(v)) {
        throw new ValidationError(`Expected string to match pattern ${pattern}`, [])
      }
    })
    return this
  }

  /**
   * Require the string to contain a specific substring.
   *
   * @param str - The substring that must be present
   */
  includes(str: string): this {
    this.checks.push((v) => {
      if (!v.includes(str)) {
        throw new ValidationError(`Expected string to include "${str}"`, [])
      }
    })
    return this
  }

  parse(value: unknown): string {
    if (typeof value !== 'string') {
      throw new ValidationError('Expected a string', [])
    }
    for (const check of this.checks) {
      check(value)
    }
    return value
  }
}

// ─── NumberSchema ───────────────────────────────────────────────────────────

/**
 * Schema that validates and parses number values.
 *
 * Supports chaining constraint methods such as `.min()`, `.max()`, `.int()`,
 * `.positive()`, `.negative()`, and `.finite()`.
 *
 * @example
 * ```ts
 * const age = s.number().int().min(0).max(150)
 * age.parse(25) // => 25
 * ```
 */
export class NumberSchema extends Schema<number> {
  private checks: Array<(v: number) => void> = []

  /**
   * Set a minimum value constraint.
   *
   * @param n - Minimum value (inclusive)
   */
  min(n: number): this {
    this.checks.push((v) => {
      if (v < n) {
        throw new ValidationError(`Expected number >= ${n}, got ${v}`, [])
      }
    })
    return this
  }

  /**
   * Set a maximum value constraint.
   *
   * @param n - Maximum value (inclusive)
   */
  max(n: number): this {
    this.checks.push((v) => {
      if (v > n) {
        throw new ValidationError(`Expected number <= ${n}, got ${v}`, [])
      }
    })
    return this
  }

  /**
   * Require the number to be an integer.
   */
  int(): this {
    this.checks.push((v) => {
      if (!Number.isInteger(v)) {
        throw new ValidationError(`Expected an integer, got ${v}`, [])
      }
    })
    return this
  }

  /**
   * Require the number to be positive (> 0).
   */
  positive(): this {
    this.checks.push((v) => {
      if (v <= 0) {
        throw new ValidationError(`Expected a positive number, got ${v}`, [])
      }
    })
    return this
  }

  /**
   * Require the number to be negative (< 0).
   */
  negative(): this {
    this.checks.push((v) => {
      if (v >= 0) {
        throw new ValidationError(`Expected a negative number, got ${v}`, [])
      }
    })
    return this
  }

  /**
   * Require the number to be finite (not Infinity or -Infinity).
   */
  finite(): this {
    this.checks.push((v) => {
      if (!Number.isFinite(v)) {
        throw new ValidationError(`Expected a finite number, got ${v}`, [])
      }
    })
    return this
  }

  parse(value: unknown): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new ValidationError('Expected a number', [])
    }
    for (const check of this.checks) {
      check(value)
    }
    return value
  }
}

// ─── BooleanSchema ──────────────────────────────────────────────────────────

/**
 * Schema that validates and parses boolean values.
 *
 * @example
 * ```ts
 * const active = s.boolean()
 * active.parse(true) // => true
 * ```
 */
export class BooleanSchema extends Schema<boolean> {
  parse(value: unknown): boolean {
    if (typeof value !== 'boolean') {
      throw new ValidationError('Expected a boolean', [])
    }
    return value
  }
}

// ─── ArraySchema ────────────────────────────────────────────────────────────

/**
 * Schema that validates and parses array values with typed elements.
 *
 * @typeParam T - The element type of the validated array
 *
 * @example
 * ```ts
 * const names = s.array(s.string().min(1))
 * names.parse(['a', 'b']) // => ['a', 'b']
 * ```
 */
export class ArraySchema<T> extends Schema<T[]> {
  private checks: Array<(v: T[]) => void> = []

  /**
   * @param element - Schema for each element in the array
   */
  constructor(private readonly element: Schema<T>) {
    super()
  }

  /**
   * Set a minimum length constraint.
   *
   * @param n - Minimum number of elements (inclusive)
   */
  min(n: number): this {
    this.checks.push((v) => {
      if (v.length < n) {
        throw new ValidationError(`Expected array with at least ${n} elements, got ${v.length}`, [])
      }
    })
    return this
  }

  /**
   * Set a maximum length constraint.
   *
   * @param n - Maximum number of elements (inclusive)
   */
  max(n: number): this {
    this.checks.push((v) => {
      if (v.length > n) {
        throw new ValidationError(`Expected array with at most ${n} elements, got ${v.length}`, [])
      }
    })
    return this
  }

  /**
   * Require the array to have at least one element.
   */
  nonempty(): this {
    this.checks.push((v) => {
      if (v.length === 0) {
        throw new ValidationError('Expected a non-empty array', [])
      }
    })
    return this
  }

  parse(value: unknown): T[] {
    if (!Array.isArray(value)) {
      throw new ValidationError('Expected an array', [])
    }

    const result: T[] = []
    for (let i = 0; i < value.length; i++) {
      const item = value[i]!
      try {
        result.push(this.element.parse(item))
      } catch (e) {
        if (e instanceof ValidationError) {
          throw new ValidationError(e.message, [i, ...(e.path as (string | number)[])])
        }
        throw e
      }
    }

    for (const check of this.checks) {
      check(result)
    }

    return result
  }
}

// ─── ObjectSchema ───────────────────────────────────────────────────────────

/**
 * Schema that validates and parses plain objects with typed fields.
 *
 * Validates all fields and collects **all** errors before throwing, so you
 * see every invalid field at once rather than stopping at the first failure.
 *
 * @typeParam T - Shape dictionary mapping field names to their schemas
 *
 * @example
 * ```ts
 * const User = s.object({
 *   name: s.string().min(1),
 *   age: s.number().int(),
 * })
 *
 * User.parse({ name: 'Alice', age: 30 })
 * // => { name: 'Alice', age: 30 }
 * ```
 */
export class ObjectSchema<T extends Record<string, Schema<unknown>>> extends Schema<{
  [K in keyof T]: Infer<T[K]>
}> {
  /**
   * @param shape - An object mapping field names to their schemas
   */
  constructor(private readonly shape: T) {
    super()
  }

  parse(value: unknown): { [K in keyof T]: Infer<T[K]> } {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ValidationError('Expected an object', [])
    }

    const obj = value as Record<string, unknown>
    const keys = Object.keys(this.shape) as (keyof T & string)[]
    const result: Record<string, unknown> = {}
    const errors: Array<{ key: string; error: ValidationError }> = []

    for (const key of keys) {
      const schema = this.shape[key]!
      try {
        result[key] = schema.parse(obj[key])
      } catch (e) {
        if (e instanceof ValidationError) {
          errors.push({ key, error: e })
        } else {
          throw e
        }
      }
    }

    if (errors.length > 0) {
      if (errors.length === 1) {
        const { key, error } = errors[0]!
        throw new ValidationError(error.message, [key, ...(error.path as (string | number)[])])
      }

      const joined = errors
        .map(({ key, error }) => {
          const sub = error.path.length > 0 ? `.${error.path.join('.')}` : ''
          return `${key}${sub}: ${error.message}`
        })
        .join('; ')
      throw new ValidationError(joined, [])
    }

    return result as { [K in keyof T]: Infer<T[K]> }
  }
}

// ─── EnumSchema ─────────────────────────────────────────────────────────────

/**
 * Schema that validates a string matches one of a fixed set of allowed values.
 *
 * @typeParam T - The string literal union type
 *
 * @example
 * ```ts
 * const Color = s.enum(['red', 'green', 'blue'])
 * Color.parse('red') // => 'red'
 * ```
 */
export class EnumSchema<T extends string> extends Schema<T> {
  /**
   * @param values - The array of allowed string values
   */
  constructor(private readonly values: readonly T[]) {
    super()
  }

  parse(value: unknown): T {
    if (typeof value !== 'string') {
      throw new ValidationError('Expected a string', [])
    }

    const found = (this.values as readonly string[]).indexOf(value)
    if (found === -1) {
      throw new ValidationError(`Expected one of: ${this.values.join(', ')}`, [])
    }

    return this.values[found]!
  }
}

// ─── LiteralSchema ──────────────────────────────────────────────────────────

/**
 * Schema that validates a value equals an exact literal.
 *
 * @typeParam T - The literal value type (`string | number | boolean`)
 *
 * @example
 * ```ts
 * const hi = s.literal('hello')
 * hi.parse('hello') // => 'hello'
 * ```
 */
export class LiteralSchema<T extends string | number | boolean> extends Schema<T> {
  /** The expected literal value. */
  readonly value: T

  /**
   * @param value - The exact value this schema accepts
   */
  constructor(value: T) {
    super()
    this.value = value
  }

  parse(value: unknown): T {
    if (value !== this.value) {
      throw new ValidationError(`Expected literal ${String(this.value)}, got ${String(value)}`, [])
    }
    return this.value
  }
}

// ─── Builder ────────────────────────────────────────────────────────────────

/**
 * Convenience builder for creating schemas.
 *
 * Provides short‑hand access to every schema type:
 *
 * ```ts
 * const schema = s.object({
 *   name: s.string().min(1),
 *   age: s.number().int().positive(),
 *   tags: s.array(s.string()),
 *   role: s.enum(['admin', 'user']),
 *   status: s.literal('active'),
 * })
 * ```
 */
export const s = {
  /** Create a new {@link StringSchema}. */
  string: (): StringSchema => new StringSchema(),

  /** Create a new {@link NumberSchema}. */
  number: (): NumberSchema => new NumberSchema(),

  /** Create a new {@link BooleanSchema}. */
  boolean: (): BooleanSchema => new BooleanSchema(),

  /** Create a new {@link ArraySchema} with the given element schema. */
  array: <T>(item: Schema<T>): ArraySchema<T> => new ArraySchema(item),

  /** Create a new {@link ObjectSchema} with the given shape. */
  object: <T extends Record<string, Schema<unknown>>>(shape: T): ObjectSchema<T> => new ObjectSchema(shape),

  /** Create a new {@link EnumSchema} for the given string values. */
  enum: <T extends string>(values: readonly T[]): EnumSchema<T> => new EnumSchema(values),

  /** Create a new {@link LiteralSchema} for the exact value. */
  literal: <T extends string | number | boolean>(value: T): LiteralSchema<T> => new LiteralSchema(value),
}
