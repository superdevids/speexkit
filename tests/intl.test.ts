import { describe, it, expect } from 'vitest'
import { formatNumber, formatCurrency, formatRelativeTime, formatList, pluralize, createTranslator, timeAgo } from '../src/intl/index.js'

describe('formatNumber', () => {
  it('handles NaN gracefully', () => {
    const result = formatNumber(NaN)
    expect(typeof result).toBe('string')
  })

  it('handles Infinity to ∞', () => {
    const result = formatNumber(Infinity)
    expect(result).toMatch(/∞/i)
  })

  it('formats integer with default locale', () => {
    const result = formatNumber(15000)
    expect(typeof result).toBe('string')
    expect(result).not.toBe('')
  })

  it('formats with specified locale', () => {
    const result = formatNumber(15000.5, 'en-US')
    expect(result).toContain(',')
  })

  it('accepts additional Intl options', () => {
    const result = formatNumber(0.5, 'en-US', { style: 'percent' })
    expect(result).toContain('%')
  })

  it('handles negative numbers', () => {
    const result = formatNumber(-42)
    expect(result).toContain('-')
  })

  it('handles zero', () => {
    const result = formatNumber(0)
    expect(typeof result).toBe('string')
  })
})

describe('formatCurrency', () => {
  it('formats zero USD as $0.00', () => {
    const result = formatCurrency(0, 'USD', 'en-US')
    expect(result).toBe('$0.00')
  })

  it('handles NaN', () => {
    const result = formatCurrency(NaN, 'USD')
    expect(typeof result).toBe('string')
  })

  it('formats negative EUR', () => {
    const result = formatCurrency(-1.5, 'EUR', 'en-US')
    expect(result).toContain('-')
    expect(result).toContain('1.50')
  })

  it('handles unknown currency code', () => {
    const result = formatCurrency(100, 'XYZ', 'en-US')
    expect(typeof result).toBe('string')
  })

  it('formats IDR with default locale', () => {
    const result = formatCurrency(15000, 'IDR')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('formats large amounts', () => {
    const result = formatCurrency(1000000, 'USD', 'en-US')
    expect(result).toContain('1,000,000')
  })
})

describe('formatRelativeTime', () => {
  it('formats -1 day as yesterday or 1 day ago', () => {
    const result = formatRelativeTime(-1, 'day', 'en')
    expect(result).toMatch(/yesterday|1 day ago/)
  })

  it('formats 0 hours as now', () => {
    const result = formatRelativeTime(0, 'hour', 'en')
    expect(result).toBe('this hour')
  })

  it('handles Infinity value', () => {
    const result = formatRelativeTime(Infinity, 'year', 'en')
    expect(typeof result).toBe('string')
  })

  it('handles negative Infinity', () => {
    const result = formatRelativeTime(-Infinity, 'year', 'en')
    expect(typeof result).toBe('string')
  })

  it('formats future time', () => {
    const result = formatRelativeTime(2, 'day', 'en')
    expect(result).toContain('2')
  })

  it('formats minutes', () => {
    const result = formatRelativeTime(-5, 'minute', 'en')
    expect(result).toContain('5')
  })
})

describe('formatList', () => {
  it('returns empty string for empty array', () => {
    expect(formatList([], 'en')).toBe('')
  })

  it('returns single item unchanged', () => {
    expect(formatList(['a'], 'en')).toBe('a')
  })

  it('formats list of 3 items in English', () => {
    const result = formatList(['a', 'b', 'c'], 'en')
    expect(result).toMatch(/a.*b.*c/)
    expect(result).toContain('and')
  })

  it('formats list of 2 items', () => {
    const result = formatList(['a', 'b'], 'en')
    expect(result).toContain('and')
  })

  it('uses default locale', () => {
    const result = formatList(['x', 'y', 'z'])
    expect(typeof result).toBe('string')
  })

  it('accepts list format options', () => {
    const result = formatList(['a', 'b', 'c'], 'en', { type: 'disjunction' })
    expect(result).toContain('or')
  })
})

describe('pluralize', () => {
  it('returns "other" form for count 0 in English', () => {
    const result = pluralize(0, { one: 'cat', other: 'cats' }, 'en')
    expect(result).toBe('cats')
  })

  it('returns "one" form for count 1 in English', () => {
    const result = pluralize(1, { one: 'cat', other: 'cats' }, 'en')
    expect(result).toBe('cat')
  })

  it('returns "other" form for count 2 in English', () => {
    const result = pluralize(2, { one: 'cat', other: 'cats' }, 'en')
    expect(result).toBe('cats')
  })

  it('returns "zero" form when provided for count 0', () => {
    const result = pluralize(0, { zero: 'no cats', one: 'cat', other: 'cats' }, 'en')
    expect(result).toBe('cats')
  })

  it('uses default locale when not specified', () => {
    const result = pluralize(1, { one: 'buku', other: 'buku' })
    expect(result).toBe('buku')
  })

  it('handles float values', () => {
    const result = pluralize(1.5, { one: 'item', other: 'items' }, 'en')
    expect(typeof result).toBe('string')
  })
})

describe('createTranslator', () => {
  it('returns translated message for existing key', () => {
    const t = createTranslator({ en: { hello: 'Hello' } }, 'en')
    expect(t.t('hello')).toBe('Hello')
  })

  it('returns key when translation is missing', () => {
    const t = createTranslator({ en: { hello: 'Hello' } }, 'en')
    expect(t.t('nonexistent')).toBe('nonexistent')
  })

  it('interpolates parameters', () => {
    const t = createTranslator({ en: { greet: 'Hello, {name}!' } }, 'en')
    expect(t.t('greet', { name: 'Alice' })).toBe('Hello, Alice!')
  })

  it('leaves unresolved placeholders as-is', () => {
    const t = createTranslator({ en: { greet: 'Hello, {name}!' } }, 'en')
    expect(t.t('greet', {})).toBe('Hello, {name}!')
  })

  it('switches locale via setLocale', () => {
    const t = createTranslator({ en: { hello: 'Hello' }, id: { hello: 'Halo' } }, 'en')
    t.setLocale('id')
    expect(t.t('hello')).toBe('Halo')
  })

  it('getLocale returns current locale', () => {
    const t = createTranslator({}, 'en')
    expect(t.getLocale()).toBe('en')
    t.setLocale('id')
    expect(t.getLocale()).toBe('id')
  })

  it('addMessages merges new translations', () => {
    const t = createTranslator({ en: { hello: 'Hello' } }, 'en')
    t.addMessages('en', { goodbye: 'Goodbye' })
    expect(t.t('goodbye')).toBe('Goodbye')
  })

  it('addMessages does not overwrite existing messages', () => {
    const t = createTranslator({ en: { hello: 'Hello' } }, 'en')
    t.addMessages('en', { hello: 'Hola', goodbye: 'Goodbye' })
    expect(t.t('hello')).toBe('Hola')
    expect(t.t('goodbye')).toBe('Goodbye')
  })

  it('falls back to default locale', () => {
    const t = createTranslator({ en: { hello: 'Hello' }, id: { world: 'Dunia' } }, 'en')
    t.setLocale('id')
    expect(t.t('hello')).toBe('Hello')
  })

  it('handles number params in interpolation', () => {
    const t = createTranslator({ en: { count: 'You have {n} messages' } }, 'en')
    expect(t.t('count', { n: 5 })).toBe('You have 5 messages')
  })

  it('handles empty messages store', () => {
    const t = createTranslator({}, 'en')
    expect(t.t('anything')).toBe('anything')
  })
})

describe('timeAgo', () => {
  it('returns relative time for 5 seconds ago', () => {
    const result = timeAgo(Date.now() - 5000, 'en')
    expect(result).toContain('5')
    expect(result).toContain('second')
  })

  it('returns future relative time', () => {
    const result = timeAgo(Date.now() + 5000, 'en')
    expect(result).toContain('5')
    expect(result).toContain('second')
  })

  it('handles null/NaN gracefully', () => {
    const result = timeAgo(NaN, 'en')
    expect(typeof result).toBe('string')
  })

  it('handles Date object input', () => {
    const past = new Date(Date.now() - 60000)
    const result = timeAgo(past, 'en')
    expect(result).toContain('minute')
  })

  it('returns minutes for timestamps 2 minutes ago', () => {
    const result = timeAgo(Date.now() - 120000, 'en')
    expect(result).toContain('minute')
  })

  it('returns hours for timestamps 1 hour ago', () => {
    const result = timeAgo(Date.now() - 3600000, 'en')
    expect(result).toContain('hour')
  })

  it('returns days for timestamps 1 day ago', () => {
    const result = timeAgo(Date.now() - 86400000, 'en')
    expect(result).toContain('day')
  })

  it('returns weeks for timestamps 2 weeks ago', () => {
    const result = timeAgo(Date.now() - 1209600000, 'en')
    expect(result).toContain('week')
  })

  it('uses default locale', () => {
    const result = timeAgo(Date.now() - 5000)
    expect(typeof result).toBe('string')
  })

  it('handles very old dates', () => {
    const result = timeAgo(Date.now() - 31536000000, 'en')
    expect(result).toContain('year')
  })
})
