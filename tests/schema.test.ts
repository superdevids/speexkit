import { describe, it, expect } from 'vitest'
import {
  s,
  Schema,
  ValidationError,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  ArraySchema,
  ObjectSchema,
  EnumSchema,
  LiteralSchema,
  OptionalSchema,
  NullableSchema,
  RefineSchema,
  type Infer,
} from '../src/schema/index.js'

describe('s.string()', () => {
  it('passes a valid string', () => {
    expect(s.string().parse('hello')).toBe('hello')
  })

  it('passes an empty string', () => {
    expect(s.string().parse('')).toBe('')
  })

  it('throws on number', () => {
    expect(() => s.string().parse(123)).toThrow(ValidationError)
  })

  it('throws on null', () => {
    expect(() => s.string().parse(null)).toThrow(ValidationError)
  })

  it('throws on undefined', () => {
    expect(() => s.string().parse(undefined)).toThrow(ValidationError)
  })

  it('throws on boolean', () => {
    expect(() => s.string().parse(true)).toThrow(ValidationError)
  })

  it('throws on array', () => {
    expect(() => s.string().parse([])).toThrow(ValidationError)
  })

  it('throws on object', () => {
    expect(() => s.string().parse({})).toThrow(ValidationError)
  })

  it('supports .min() constraint', () => {
    expect(() => s.string().min(3).parse('ab')).toThrow(ValidationError)
  })

  it('supports .max() constraint', () => {
    expect(() => s.string().max(2).parse('abc')).toThrow(ValidationError)
  })

  it('supports .email() constraint', () => {
    expect(s.string().email().parse('a@b.com')).toBe('a@b.com')
    expect(() => s.string().email().parse('notanemail')).toThrow(ValidationError)
  })

  it('supports .url() constraint', () => {
    expect(s.string().url().parse('https://example.com')).toBe('https://example.com')
    expect(() => s.string().url().parse('not-a-url')).toThrow(ValidationError)
  })

  it('supports .regex() constraint', () => {
    expect(s.string().regex(/^\d+$/).parse('123')).toBe('123')
    expect(() => s.string().regex(/^\d+$/).parse('abc')).toThrow(ValidationError)
  })

  it('supports .includes() constraint', () => {
    expect(s.string().includes('world').parse('hello world')).toBe('hello world')
    expect(() => s.string().includes('xyz').parse('hello')).toThrow(ValidationError)
  })
})

describe('s.number()', () => {
  it('passes a valid number', () => {
    expect(s.number().parse(42)).toBe(42)
  })

  it('passes zero', () => {
    expect(s.number().parse(0)).toBe(0)
  })

  it('passes negative numbers', () => {
    expect(s.number().parse(-1)).toBe(-1)
  })

  it('throws on string', () => {
    expect(() => s.number().parse('abc')).toThrow(ValidationError)
  })

  it('throws on NaN', () => {
    expect(() => s.number().parse(NaN)).toThrow(ValidationError)
  })

  it('passes Infinity (no .finite() constraint)', () => {
    expect(s.number().parse(Infinity)).toBe(Infinity)
  })

  it('passes -Infinity (no .finite() constraint)', () => {
    expect(s.number().parse(-Infinity)).toBe(-Infinity)
  })

  it('rejects Infinity with .finite()', () => {
    expect(() => s.number().finite().parse(Infinity)).toThrow(ValidationError)
  })

  it('rejects -Infinity with .finite()', () => {
    expect(() => s.number().finite().parse(-Infinity)).toThrow(ValidationError)
  })

  it('supports .int() constraint', () => {
    expect(() => s.number().int().parse(1.5)).toThrow(ValidationError)
    expect(s.number().int().parse(3)).toBe(3)
  })

  it('supports .positive() constraint', () => {
    expect(() => s.number().positive().parse(0)).toThrow(ValidationError)
    expect(() => s.number().positive().parse(-1)).toThrow(ValidationError)
    expect(s.number().positive().parse(1)).toBe(1)
  })

  it('supports .negative() constraint', () => {
    expect(() => s.number().negative().parse(0)).toThrow(ValidationError)
    expect(() => s.number().negative().parse(1)).toThrow(ValidationError)
    expect(s.number().negative().parse(-1)).toBe(-1)
  })

  it('supports .min() constraint', () => {
    expect(() => s.number().min(5).parse(4)).toThrow(ValidationError)
    expect(s.number().min(5).parse(5)).toBe(5)
  })

  it('supports .max() constraint', () => {
    expect(() => s.number().max(10).parse(11)).toThrow(ValidationError)
    expect(s.number().max(10).parse(10)).toBe(10)
  })
})

describe('s.boolean()', () => {
  it('passes true', () => {
    expect(s.boolean().parse(true)).toBe(true)
  })

  it('passes false', () => {
    expect(s.boolean().parse(false)).toBe(false)
  })

  it('throws on 1 (strict)', () => {
    expect(() => s.boolean().parse(1)).toThrow(ValidationError)
  })

  it('throws on 0 (strict)', () => {
    expect(() => s.boolean().parse(0)).toThrow(ValidationError)
  })

  it('throws on "true" string (strict)', () => {
    expect(() => s.boolean().parse('true')).toThrow(ValidationError)
  })

  it('throws on null', () => {
    expect(() => s.boolean().parse(null)).toThrow(ValidationError)
  })

  it('throws on undefined', () => {
    expect(() => s.boolean().parse(undefined)).toThrow(ValidationError)
  })
})

describe('s.array()', () => {
  it('passes a valid typed array', () => {
    expect(s.array(s.number()).parse([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('throws when elements fail validation', () => {
    expect(() => s.array(s.number()).parse(['1', '2', '3'])).toThrow(ValidationError)
  })

  it('passes empty array', () => {
    expect(s.array(s.string()).parse([])).toEqual([])
  })

  it('rejects non-array input', () => {
    expect(() => s.array(s.number()).parse(null)).toThrow(ValidationError)
    expect(() => s.array(s.number()).parse({})).toThrow(ValidationError)
    expect(() => s.array(s.number()).parse('abc')).toThrow(ValidationError)
  })

  it('supports .min() constraint', () => {
    expect(() => s.array(s.number()).min(2).parse([1])).toThrow(ValidationError)
  })

  it('supports .max() constraint', () => {
    expect(() => s.array(s.number()).max(1).parse([1, 2])).toThrow(ValidationError)
  })

  it('supports .nonempty() constraint', () => {
    expect(() => s.array(s.number()).nonempty().parse([])).toThrow(ValidationError)
    expect(s.array(s.number()).nonempty().parse([1])).toEqual([1])
  })

  it('prepends the array index to error path for invalid elements', () => {
    try {
      s.array(s.number()).parse([1, 'bad', 3])
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError)
      expect((e as ValidationError).path).toContain(1)
    }
  })
})

describe('s.object()', () => {
  it('passes a valid object', () => {
    const obj = s.object({ name: s.string(), age: s.number() })
    expect(obj.parse({ name: 'bob', age: 30 })).toEqual({ name: 'bob', age: 30 })
  })

  it('rejects null', () => {
    expect(() => s.object({ name: s.string() }).parse(null)).toThrow(ValidationError)
  })

  it('rejects array as object', () => {
    expect(() => s.object({}).parse([])).toThrow(ValidationError)
  })

  it('rejects primitive as object', () => {
    expect(() => s.object({}).parse('string')).toThrow(ValidationError)
  })

  it('passes with optional field missing', () => {
    const obj = s.object({ a: s.number().optional() })
    expect(obj.parse({})).toEqual({})
  })

  it('strips extra keys (behavior: only defined keys returned)', () => {
    const obj = s.object({ a: s.number() })
    const result = obj.parse({ a: 5, extra: true })
    expect(result).toEqual({ a: 5 })
    expect((result as any).extra).toBeUndefined()
  })

  it('throws when a required field fails', () => {
    const obj = s.object({ a: s.number() })
    expect(() => obj.parse({ a: 'not-a-number' })).toThrow(ValidationError)
  })

  it('validates nested objects', () => {
    const obj = s.object({ a: s.object({ b: s.number() }) })
    expect(obj.parse({ a: { b: 5 } })).toEqual({ a: { b: 5 } })
  })

  it('rejects nested validation failure', () => {
    const obj = s.object({ a: s.object({ b: s.number() }) })
    expect(() => obj.parse({ a: { b: 'bad' } })).toThrow(ValidationError)
  })
})

describe('s.literal()', () => {
  it('passes matching string literal', () => {
    expect(s.literal('hi').parse('hi')).toBe('hi')
  })

  it('throws on non-matching string', () => {
    expect(() => s.literal('hi').parse('hello')).toThrow(ValidationError)
  })

  it('passes matching number literal', () => {
    expect(s.literal(42).parse(42)).toBe(42)
  })

  it('throws on non-matching number', () => {
    expect(() => s.literal(42).parse(43)).toThrow(ValidationError)
  })

  it('passes matching boolean literal', () => {
    expect(s.literal(true).parse(true)).toBe(true)
  })

  it('throws on non-matching boolean', () => {
    expect(() => s.literal(true).parse(false)).toThrow(ValidationError)
  })
})

describe('s.enum()', () => {
  it('passes a valid enum value', () => {
    expect(s.enum(['a', 'b']).parse('a')).toBe('a')
  })

  it('rejects value not in enum', () => {
    expect(() => s.enum(['a', 'b']).parse('c')).toThrow(ValidationError)
  })

  it('rejects non-string input', () => {
    expect(() => s.enum(['a', 'b']).parse(123)).toThrow(ValidationError)
  })

  it('throws on empty enum', () => {
    expect(() => s.enum([]).parse('anything')).toThrow(ValidationError)
  })

  it('preserves ordering of enum values', () => {
    const colors = s.enum(['red', 'green', 'blue'])
    expect(colors.parse('red')).toBe('red')
    expect(colors.parse('green')).toBe('green')
  })
})

describe('s.optional()', () => {
  it('passes a defined value', () => {
    expect(s.string().optional().parse('hello')).toBe('hello')
  })

  it('passes undefined', () => {
    expect(s.string().optional().parse(undefined)).toBeUndefined()
  })

  it('still fails on wrong type', () => {
    expect(() => s.string().optional().parse(123)).toThrow(ValidationError)
  })
})

describe('s.nullable()', () => {
  it('passes a defined value', () => {
    expect(s.string().nullable().parse('hello')).toBe('hello')
  })

  it('passes null', () => {
    expect(s.string().nullable().parse(null)).toBeNull()
  })

  it('throws on undefined (not optional)', () => {
    expect(() => s.string().nullable().parse(undefined)).toThrow(ValidationError)
  })

  it('still fails on wrong type', () => {
    expect(() => s.string().nullable().parse(123)).toThrow(ValidationError)
  })
})

describe('Schema.optional() and .nullable() instance methods', () => {
  it('optional() on an instance returns OptionalSchema', () => {
    const opt = s.string().optional()
    expect(opt).toBeInstanceOf(OptionalSchema)
    expect(opt.parse(undefined)).toBeUndefined()
    expect(opt.parse('a')).toBe('a')
  })

  it('nullable() on an instance returns NullableSchema', () => {
    const nul = s.string().nullable()
    expect(nul).toBeInstanceOf(NullableSchema)
    expect(nul.parse(null)).toBeNull()
  })
})

describe('Schema.refine()', () => {
  it('passes when refinement returns true', () => {
    const even = s.number().refine((n) => n % 2 === 0, 'must be even')
    expect(even.parse(4)).toBe(4)
  })

  it('throws when refinement returns false', () => {
    const even = s.number().refine((n) => n % 2 === 0, 'must be even')
    expect(() => even.parse(3)).toThrow(ValidationError)
  })

  it('uses default message when none provided', () => {
    const positive = s.number().refine((n) => n > 0)
    expect(() => positive.parse(-1)).toThrow('Refinement failed')
  })
})

describe('union via composition', () => {
  it('simulates union with safeParse', () => {
    const schemas = [s.string(), s.number()] as const
    function unionParse(val: unknown): string | number {
      for (const schema of schemas) {
        const r = schema.safeParse(val)
        if (r.success) return r.data
      }
      throw new ValidationError('No schema matched', [])
    }
    expect(unionParse('hi')).toBe('hi')
    expect(unionParse(42)).toBe(42)
    expect(() => unionParse(true)).toThrow(ValidationError)
  })
})

describe('safeParse()', () => {
  it('returns success on valid input', () => {
    const r = s.number().safeParse(5)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toBe(5)
  })

  it('returns error on invalid input', () => {
    const r = s.number().safeParse('bad')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error).toBeInstanceOf(ValidationError)
  })
})

describe('ValidationError', () => {
  it('has name, message, path properties', () => {
    const err = new ValidationError('test error', ['x', 'y'])
    expect(err.name).toBe('ValidationError')
    expect(err.message).toBe('test error')
    expect(err.path).toEqual(['x', 'y'])
  })

  it('defaults to empty path', () => {
    const err = new ValidationError('simple')
    expect(err.path).toEqual([])
  })

  it('toJSON returns serializable object', () => {
    const err = new ValidationError('bad', ['a'])
    const json = err.toJSON()
    expect(json.name).toBe('ValidationError')
    expect(json.message).toBe('bad')
    expect(json.path).toEqual(['a'])
  })

  it('toString includes path when present', () => {
    const err = new ValidationError('fail', ['a', 'b'])
    expect(err.toString()).toContain('a.b')
    expect(err.toString()).toContain('fail')
  })
})

describe('Infer type helper', () => {
  it('infers string type', () => {
    const schema = s.string()
    type T = Infer<typeof schema>
    const _test: T = 'hello'
    void _test
  })

  it('infers object type', () => {
    const schema = s.object({ name: s.string(), age: s.number() })
    type T = Infer<typeof schema>
    const _test: T = { name: 'a', age: 1 }
    void _test
  })
})

describe('Schema base class', () => {
  it('is abstract but can be extended', () => {
    expect(Schema).toBeDefined()
  })
})

describe('Constructor exports', () => {
  it('exports all schema classes', () => {
    expect(StringSchema).toBeDefined()
    expect(NumberSchema).toBeDefined()
    expect(BooleanSchema).toBeDefined()
    expect(ArraySchema).toBeDefined()
    expect(ObjectSchema).toBeDefined()
    expect(EnumSchema).toBeDefined()
    expect(LiteralSchema).toBeDefined()
    expect(OptionalSchema).toBeDefined()
    expect(NullableSchema).toBeDefined()
    expect(RefineSchema).toBeDefined()
  })
})
