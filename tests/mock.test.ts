import { describe, it, expect } from 'vitest'
import {
  seedRandom,
  fakeName,
  fakeFirstName,
  fakeLastName,
  fakeFullName,
  fakeEmail,
  fakePhone,
  fakeUUID,
  fakeAddress,
  fakeCity,
  fakeStreet,
  fakeCompany,
  fakeJobTitle,
  fakeDepartment,
  fakeLorem,
  fakeSentence,
  fakeParagraph,
  fakeInt,
  fakeFloat,
  fakeBoolean,
  fakeDate,
  fakeColor,
  fakeUrl,
  fakeAvatar,
  fakeFromSchema,
} from '../src/mock/index.js'

describe('seedRandom', () => {
  it('returns deterministic sequence when seeded with number', () => {
    seedRandom(42)
    const a = fakeInt(0, 100)
    seedRandom(42)
    const b = fakeInt(0, 100)
    expect(a).toBe(b)
  })

  it('same seed produces same sequence of multiple calls', () => {
    seedRandom(99)
    const seq1 = [fakeInt(0, 100), fakeInt(0, 100), fakeInt(0, 100)]
    seedRandom(99)
    const seq2 = [fakeInt(0, 100), fakeInt(0, 100), fakeInt(0, 100)]
    expect(seq1).toEqual(seq2)
  })

  it('different seeds produce different sequences', () => {
    seedRandom(1)
    const a = fakeInt(0, 1_000_000)
    seedRandom(2)
    const b = fakeInt(0, 1_000_000)
    expect(a).not.toBe(b)
  })

  it('accepts undefined and uses random seed without throwing', () => {
    expect(() => seedRandom(undefined as unknown as number)).not.toThrow()
  })

  it('produces stable values across two identical seeds', () => {
    seedRandom(1234)
    const first = fakeName()
    seedRandom(1234)
    const second = fakeName()
    expect(first).toBe(second)
  })
})

describe('fakeName', () => {
  it('always returns a string', () => {
    for (let i = 0; i < 100; i++) {
      expect(typeof fakeName()).toBe('string')
    }
  })

  it('returns non-empty string', () => {
    expect(fakeName().length).toBeGreaterThan(0)
  })

  it('contains a space separating first and last name', () => {
    const name = fakeName()
    expect(name).toContain(' ')
  })

  it('produces varied output across calls', () => {
    const names = new Set(Array.from({ length: 50 }, () => fakeName()))
    expect(names.size).toBeGreaterThan(10)
  })
})

describe('fakeFirstName', () => {
  it('returns a string', () => {
    expect(typeof fakeFirstName()).toBe('string')
  })

  it('returns non-empty string', () => {
    expect(fakeFirstName().length).toBeGreaterThan(0)
  })
})

describe('fakeLastName', () => {
  it('returns a string', () => {
    expect(typeof fakeLastName()).toBe('string')
  })

  it('returns non-empty string', () => {
    expect(fakeLastName().length).toBeGreaterThan(0)
  })
})

describe('fakeFullName', () => {
  it('returns object with firstName, lastName, fullName', () => {
    const result = fakeFullName()
    expect(result).toHaveProperty('firstName')
    expect(result).toHaveProperty('lastName')
    expect(result).toHaveProperty('fullName')
  })

  it('fullName equals firstName + space + lastName', () => {
    const { firstName, lastName, fullName } = fakeFullName()
    expect(fullName).toBe(`${firstName} ${lastName}`)
  })

  it('accepts gender parameter without throwing', () => {
    expect(() => fakeFullName('male')).not.toThrow()
    expect(() => fakeFullName('female')).not.toThrow()
  })
})

describe('fakeEmail', () => {
  it('contains @ symbol', () => {
    expect(fakeEmail()).toContain('@')
  })

  it('contains a domain after @', () => {
    const email = fakeEmail()
    const parts = email.split('@')
    expect(parts.length).toBe(2)
    expect(parts[1].length).toBeGreaterThan(0)
  })

  it('uses custom domain when provided', () => {
    const email = fakeEmail({ domain: 'mycorp.com' })
    expect(email).toMatch(/@mycorp\.com$/)
  })

  it('uses custom name when provided', () => {
    const email = fakeEmail({ name: 'john' })
    expect(email).toMatch(/^john@/)
  })
})

describe('fakePhone', () => {
  it('returns a string', () => {
    expect(typeof fakePhone()).toBe('string')
  })

  it('returns Indonesian format by default', () => {
    expect(fakePhone()).toMatch(/^\+62 /)
  })

  it('returns US format when country is US', () => {
    expect(fakePhone({ country: 'US' })).toMatch(/^\+1 \(/)
  })
})

describe('fakeUUID', () => {
  it('matches UUID v4 format (xxxxxxxx-xxxx-4xxx-axxx-xxxxxxxxxxxx)', () => {
    const uuid = fakeUUID()
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('produces unique values across calls', () => {
    const uuids = new Set(Array.from({ length: 100 }, () => fakeUUID()))
    expect(uuids.size).toBe(100)
  })

  it('is 36 characters long', () => {
    expect(fakeUUID().length).toBe(36)
  })
})

describe('fakeAddress', () => {
  it('returns object with street, city, state, zip, country keys', () => {
    const addr = fakeAddress()
    expect(addr).toHaveProperty('street')
    expect(addr).toHaveProperty('city')
    expect(addr).toHaveProperty('state')
    expect(addr).toHaveProperty('zip')
    expect(addr).toHaveProperty('country')
  })

  it('street, city, state, zip, country are strings', () => {
    const addr = fakeAddress()
    expect(typeof addr.street).toBe('string')
    expect(typeof addr.city).toBe('string')
    expect(typeof addr.state).toBe('string')
    expect(typeof addr.zip).toBe('string')
    expect(typeof addr.country).toBe('string')
  })

  it('country defaults to Indonesia', () => {
    expect(fakeAddress().country).toBe('Indonesia')
  })

  it('street is non-empty', () => {
    expect(fakeAddress().street.length).toBeGreaterThan(0)
  })

  it('city is non-empty', () => {
    expect(fakeAddress().city.length).toBeGreaterThan(0)
  })
})

describe('fakeCity', () => {
  it('returns a string', () => {
    expect(typeof fakeCity()).toBe('string')
  })

  it('returns non-empty string', () => {
    expect(fakeCity().length).toBeGreaterThan(0)
  })
})

describe('fakeStreet', () => {
  it('returns a string', () => {
    expect(typeof fakeStreet()).toBe('string')
  })

  it('returns non-empty string', () => {
    expect(fakeStreet().length).toBeGreaterThan(0)
  })
})

describe('fakeCompany', () => {
  it('returns a string', () => {
    expect(typeof fakeCompany()).toBe('string')
  })

  it('starts with PT ', () => {
    expect(fakeCompany()).toMatch(/^PT /)
  })
})

describe('fakeJobTitle', () => {
  it('returns a string', () => {
    expect(typeof fakeJobTitle()).toBe('string')
  })

  it('returns non-empty string', () => {
    expect(fakeJobTitle().length).toBeGreaterThan(0)
  })
})

describe('fakeDepartment', () => {
  it('returns a string', () => {
    expect(typeof fakeDepartment()).toBe('string')
  })

  it('returns non-empty string', () => {
    expect(fakeDepartment().length).toBeGreaterThan(0)
  })
})

describe('fakeLorem', () => {
  it('returns string with default 50 words', () => {
    const result = fakeLorem()
    expect(result.split(' ').length).toBe(50)
  })

  it('returns string with specified word count', () => {
    const result = fakeLorem(10)
    expect(result.split(' ').length).toBe(10)
  })

  it('returns empty string for 0 words', () => {
    expect(fakeLorem(0)).toBe('')
  })

  it('handles negative word count (returns empty)', () => {
    expect(fakeLorem(-1)).toBe('')
  })
})

describe('fakeSentence', () => {
  it('returns a string ending with period', () => {
    const sentence = fakeSentence()
    expect(sentence.endsWith('.')).toBe(true)
  })

  it('starts with uppercase letter', () => {
    const sentence = fakeSentence()
    expect(sentence[0]).toMatch(/[A-Z]/)
  })

  it('returns empty string for 0 words', () => {
    const result = fakeSentence(0, 0)
    expect(result).toBe('.')
  })

  it('handles negative minWords', () => {
    const result = fakeSentence(-1)
    expect(typeof result).toBe('string')
  })
})

describe('fakeParagraph', () => {
  it('returns a string', () => {
    expect(typeof fakeParagraph()).toBe('string')
  })

  it('returns non-empty string', () => {
    expect(fakeParagraph().length).toBeGreaterThan(0)
  })

  it('contains sentences separated by spaces', () => {
    const para = fakeParagraph(3)
    expect(para).toMatch(/\. .+\./)
  })

  it('returns empty string for 0 sentences', () => {
    expect(fakeParagraph(0)).toBe('')
  })

  it('handles negative sentence count', () => {
    expect(fakeParagraph(-1)).toBe('')
  })
})

describe('fakeFromSchema', () => {
  it('generates data matching schema with string type', () => {
    const result = fakeFromSchema({ name: 'string' })
    expect(typeof result.name).toBe('string')
  })

  it('generates data matching schema with number type', () => {
    const result = fakeFromSchema({ age: 'number' })
    expect(typeof result.age).toBe('number')
  })

  it('generates data matching schema with boolean type', () => {
    const result = fakeFromSchema({ active: 'boolean' })
    expect(typeof result.active).toBe('boolean')
  })

  it('generates data matching schema with email type', () => {
    const result = fakeFromSchema({ contact: 'email' })
    expect(result.contact).toContain('@')
  })

  it('handles multi-field schemas', () => {
    const result = fakeFromSchema({ name: 'string', age: 'number' })
    expect(typeof result.name).toBe('string')
    expect(typeof result.age).toBe('number')
  })

  it('handles empty schema', () => {
    const result = fakeFromSchema({})
    expect(result).toEqual({})
  })

  it('handles schema-like object with parse method', () => {
    const schema = {
      parse: () => 'parsed',
      _def: { description: 'test' },
    }
    const result = fakeFromSchema(schema)
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('name')
    expect(result).toHaveProperty('email')
  })
})

describe('fakeInt', () => {
  it('returns min when min equals max', () => {
    expect(fakeInt(5, 5)).toBe(5)
  })

  it('handles swapped bounds', () => {
    const result = fakeInt(10, 5)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('returns integer in [min, max]', () => {
    const result = fakeInt(3, 7)
    expect(result).toBeGreaterThanOrEqual(3)
    expect(result).toBeLessThanOrEqual(7)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('works with negative ranges', () => {
    const result = fakeInt(-10, -1)
    expect(result).toBeGreaterThanOrEqual(-10)
    expect(result).toBeLessThanOrEqual(-1)
  })

  it('works with zero range', () => {
    expect(fakeInt(0, 0)).toBe(0)
  })
})

describe('fakeFloat', () => {
  it('returns value between 0 and 1 for (0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const val = fakeFloat(0, 1)
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })

  it('returns float, not integer', () => {
    const vals = Array.from({ length: 50 }, () => fakeFloat(0, 1))
    const hasFraction = vals.some((v) => v !== Math.floor(v))
    expect(hasFraction).toBe(true)
  })

  it('handles negative range', () => {
    const val = fakeFloat(-5, 5)
    expect(val).toBeGreaterThanOrEqual(-5)
    expect(val).toBeLessThan(5)
  })

  it('respects decimal precision parameter', () => {
    for (let i = 0; i < 50; i++) {
      const val = fakeFloat(0, 10, 2)
      const parts = String(val).split('.')
      if (parts.length > 1) {
        expect(parts[1].length).toBeLessThanOrEqual(2)
      }
    }
  })

  it('returns min value when min == max', () => {
    const val = fakeFloat(7.5, 7.5)
    expect(val).toBe(7.5)
  })
})

describe('fakeBoolean', () => {
  it('returns a boolean', () => {
    expect(typeof fakeBoolean()).toBe('boolean')
  })

  it('returns both true and false over many calls', () => {
    const results = new Set(Array.from({ length: 100 }, () => fakeBoolean()))
    expect(results.has(true)).toBe(true)
    expect(results.has(false)).toBe(true)
  })

  it('produces roughly 50/50 distribution over 10000 calls', () => {
    const trueCount = Array.from({ length: 10000 }, () => fakeBoolean()).filter(Boolean).length
    expect(trueCount).toBeGreaterThan(4500)
    expect(trueCount).toBeLessThan(5500)
  })
})

describe('fakeDate', () => {
  it('returns a Date instance', () => {
    expect(fakeDate()).toBeInstanceOf(Date)
  })

  it('returns valid date (non-NaN)', () => {
    expect(isNaN(fakeDate().getTime())).toBe(false)
  })

  it('returns the same date when start equals end', () => {
    const d = new Date('2025-01-01')
    const result = fakeDate(d, d)
    expect(result.getTime()).toBe(d.getTime())
  })

  it('returns date within specified range', () => {
    const start = new Date('2020-01-01')
    const end = new Date('2020-12-31')
    const result = fakeDate(start, end)
    expect(result.getTime()).toBeGreaterThanOrEqual(start.getTime())
    expect(result.getTime()).toBeLessThanOrEqual(end.getTime())
  })

  it('handles reversed start/end', () => {
    const start = new Date('2025-01-01')
    const end = new Date('2020-01-01')
    const result = fakeDate(start, end)
    expect(isNaN(result.getTime())).toBe(false)
  })

  it('uses epoch start when start is omitted', () => {
    const end = new Date('2025-01-01')
    const result = fakeDate(undefined, end)
    expect(result.getTime()).toBeGreaterThanOrEqual(0)
    expect(result.getTime()).toBeLessThanOrEqual(end.getTime())
  })

  it('uses current time as default end', () => {
    const start = new Date('2025-01-01')
    const before = Date.now()
    const result = fakeDate(start)
    const after = Date.now()
    expect(result.getTime()).toBeGreaterThanOrEqual(start.getTime())
    expect(result.getTime()).toBeLessThanOrEqual(after)
  })
})

describe('fakeColor', () => {
  it('returns string in #RRGGBB format', () => {
    const color = fakeColor()
    expect(color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('lowercase hex digits', () => {
    const color = fakeColor()
    expect(color).toBe(color.toLowerCase())
  })

  it('produces variety', () => {
    const colors = new Set(Array.from({ length: 50 }, () => fakeColor()))
    expect(colors.size).toBeGreaterThan(10)
  })
})

describe('fakeUrl', () => {
  it('returns string starting with https://', () => {
    expect(fakeUrl()).toMatch(/^https:\/\//)
  })

  it('returns valid URL structure', () => {
    const url = fakeUrl()
    expect(url).toMatch(/^https:\/\/[a-z]+\.[a-z.]+\/[a-z]+$/)
  })

  it('produces varied output', () => {
    const urls = new Set(Array.from({ length: 20 }, () => fakeUrl()))
    expect(urls.size).toBeGreaterThan(5)
  })
})

describe('fakeAvatar', () => {
  it('returns a string URL', () => {
    expect(typeof fakeAvatar()).toBe('string')
  })

  it('contains pravatar.cc', () => {
    expect(fakeAvatar()).toContain('pravatar.cc')
  })

  it('accepts gender parameter', () => {
    expect(() => fakeAvatar('male')).not.toThrow()
    expect(() => fakeAvatar('female')).not.toThrow()
  })
})
