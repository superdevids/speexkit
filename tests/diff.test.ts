import { describe, it, expect } from 'vitest'
import { textDiff, unifiedDiff, objectDiff, patch } from '../src/diff/index.js'

describe('textDiff', () => {
  it('returns empty array when both strings are empty', () => {
    expect(textDiff('', '')).toEqual([])
  })

  it('returns removal when second string is empty', () => {
    const result = textDiff('a', '')
    expect(result.length).toBeGreaterThan(0)
    expect(result.some((c) => c.type === 'delete')).toBe(true)
  })

  it('returns addition when first string is empty', () => {
    const result = textDiff('', 'a')
    expect(result.length).toBeGreaterThan(0)
    expect(result.some((c) => c.type === 'insert')).toBe(true)
  })

  it('returns no change for identical strings', () => {
    const result = textDiff('abc', 'abc')
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('equal')
  })

  it('detects single character change', () => {
    const result = textDiff('abc', 'abd')
    expect(result.length).toBeGreaterThan(0)
    expect(result).not.toEqual([{ type: 'equal', value: 'abc' }])
  })

  it('handles large strings without OOM', () => {
    const a = 'x'.repeat(10000)
    const b = 'y'.repeat(10000)
    expect(() => textDiff(a, b)).not.toThrow()
    const result = textDiff(a, b)
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles multi-line strings', () => {
    const a = 'line1\nline2\nline3'
    const b = 'line1\nchanged\nline3'
    const result = textDiff(a, b)
    expect(result.length).toBeGreaterThan(0)
    expect(result).not.toEqual([{ type: 'equal', value: a }])
  })

  it('handles completely different strings', () => {
    const result = textDiff('hello', 'world')
    expect(result.length).toBeGreaterThan(0)
  })

  it('merges adjacent same-type chunks', () => {
    const result = textDiff('a\nb\nc', 'd\ne\nf')
    const inserts = result.filter((c) => c.type === 'insert')
    expect(inserts.length).toBe(1)
  })

  it('handles string with trailing newline', () => {
    const result = textDiff('a\n', 'b\n')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('unifiedDiff', () => {
  it('returns empty string for identical content', () => {
    expect(unifiedDiff('hello', 'hello')).toBe('')
  })

  it('returns unified format for changed content', () => {
    const result = unifiedDiff('abc', 'abd')
    expect(result).toContain('--- ')
    expect(result).toContain('+++ ')
    expect(result).toContain('@@ ')
  })

  it('includes file labels when provided', () => {
    const result = unifiedDiff('a', 'b', { fromFile: 'old.txt', toFile: 'new.txt' })
    expect(result).toContain('--- old.txt')
    expect(result).toContain('+++ new.txt')
  })

  it('respects context lines parameter', () => {
    const a = 'a\nb\nc\nd\ne\nf\ng'
    const b = 'a\nb\nc\nx\ne\nf\ng'
    const result = unifiedDiff(a, b, { context: 1 })
    expect(result).toContain('@@ ')
  })

  it('handles empty old string', () => {
    const result = unifiedDiff('', 'new content')
    expect(result).toContain('+new content')
  })

  it('handles empty new string', () => {
    const result = unifiedDiff('old content', '')
    expect(result).toContain('-old content')
  })

  it('produces valid unified diff format with +/- markers', () => {
    const result = unifiedDiff('hello\nworld', 'hello\nthere')
    const lines = result.split('\n')
    const hasPlus = lines.some((l) => l.startsWith('+'))
    const hasMinus = lines.some((l) => l.startsWith('-'))
    expect(hasPlus).toBe(true)
    expect(hasMinus).toBe(true)
  })

  it('handles large diff gracefully', () => {
    const a = Array.from({ length: 100 }, (_, i) => `line${i}`).join('\n')
    const b = Array.from({ length: 100 }, (_, i) => `line${i + 50}`).join('\n')
    expect(() => unifiedDiff(a, b)).not.toThrow()
  })
})

describe('objectDiff', () => {
  it('returns empty array for identical objects', () => {
    expect(objectDiff({}, {})).toEqual([])
  })

  it('returns empty array for deeply equal nested objects', () => {
    expect(objectDiff({ a: { b: 1 } }, { a: { b: 1 } })).toEqual([])
  })

  it('handles null first arg without crashing', () => {
    const result = objectDiff(null as unknown as Record<string, unknown>, { a: 1 })
    expect(Array.isArray(result)).toBe(true)
  })

  it('detects type change', () => {
    const result = objectDiff({ a: 1 }, { a: '1' })
    expect(result.some((d) => d.type === 'changed' && d.path === 'a')).toBe(true)
  })

  it('detects nested object changes', () => {
    const result = objectDiff({ a: { b: 1 } }, { a: { b: 2 } })
    expect(result.some((d) => d.path === 'a.b' && d.type === 'changed')).toBe(true)
  })

  it('detects array diffs', () => {
    const result = objectDiff({ a: [1, 2, 3] }, { a: [1, 2, 4] })
    expect(result.some((d) => d.type === 'changed' && d.path.includes('2'))).toBe(true)
  })

  it('detects added key', () => {
    const result = objectDiff({ a: 1 }, { a: 1, b: 2 })
    expect(result.some((d) => d.path === 'b' && d.type === 'added')).toBe(true)
  })

  it('detects removed key', () => {
    const result = objectDiff({ a: 1, b: 2 }, { a: 1 })
    expect(result.some((d) => d.type === 'removed')).toBe(true)
  })

  it('handles deeply nested arrays', () => {
    const result = objectDiff(
      { a: [{ b: 1 }, { b: 2 }] },
      { a: [{ b: 1 }, { b: 3 }] },
    )
    expect(result.some((d) => d.path.includes('b'))).toBe(true)
  })

  it('ignores __proto__ keys', () => {
    const a = { a: 1 } as Record<string, unknown>
    const b = { a: 1, __proto__: { evil: true } } as Record<string, unknown>
    expect(() => objectDiff(a, b)).not.toThrow()
  })

  it('handles array length changes', () => {
    const result = objectDiff({ a: [1, 2] }, { a: [1, 2, 3] })
    expect(result.some((d) => d.type === 'added')).toBe(true)
  })

  it('detects changed value types in arrays', () => {
    const result = objectDiff({ a: [1] }, { a: ['1'] })
    expect(result.some((d) => d.type === 'changed')).toBe(true)
  })

  it('handles null values', () => {
    const result = objectDiff({ a: null }, { a: null })
    expect(result).toEqual([])
  })
})

describe('patch', () => {
  it('applies object diffs to produce new object', () => {
    const diffs = objectDiff({ a: 1, b: 2 }, { a: 1, b: 3 })
    const result = patch({ a: 1, b: 2 }, diffs)
    expect(result).toEqual({ a: 1, b: 3 })
  })

  it('applies addition diffs', () => {
    const diffs = [{ path: 'c', type: 'added' as const, newValue: 3 }]
    const result = patch({ a: 1 }, diffs)
    expect(result).toEqual({ a: 1, c: 3 })
  })

  it('applies removal diffs', () => {
    const diffs = [{ path: 'a', type: 'removed' as const, oldValue: 1 }]
    const result = patch({ a: 1, b: 2 }, diffs)
    expect(result).toEqual({ b: 2 })
  })

  it('applies nested path additions', () => {
    const diffs = [{ path: 'a.b', type: 'added' as const, newValue: 42 }]
    const result = patch({}, diffs)
    expect(result).toEqual({ a: { b: 42 } })
  })

  it('does not mutate original object', () => {
    const original = { a: 1 }
    const diffs = objectDiff(original, { a: 2 })
    patch(original, diffs)
    expect(original).toEqual({ a: 1 })
  })

  it('handles empty diffs array', () => {
    const result = patch({ a: 1 }, [])
    expect(result).toEqual({ a: 1 })
  })

  it('throws when first arg is null', () => {
    expect(() => patch(null as unknown as Record<string, unknown>, [])).not.toThrow()
  })

  it('handles nested array paths', () => {
    const result = patch(
      { items: [1, 2, 3] },
      [{ path: 'items.1', type: 'changed' as const, oldValue: 2, newValue: 99 }],
    )
    expect(result.items[1]).toBe(99)
  })
})
