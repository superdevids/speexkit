import { describe, it, expect } from 'vitest'
import { OneHotEncoder } from '../src/ml/onehot-encoder.js'

describe('OneHotEncoder', () => {
  it('basic encoding with two categories', () => {
    const X = [
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ]
    const enc = new OneHotEncoder().fit(X)
    const t = enc.transform(X)
    expect(t.length).toBe(3)
    expect(t[0]!.length).toBe(4) // a,b (2) + b,c (2) = 4
    expect(t[0]!).toEqual([1, 0, 1, 0])
    expect(t[1]!).toEqual([1, 0, 0, 1])
    expect(t[2]!).toEqual([0, 1, 0, 1])
  })

  it('inverseTransform roundtrip', () => {
    const X = [
      ['red', 'small'],
      ['blue', 'large'],
      ['red', 'medium'],
    ]
    const enc = new OneHotEncoder().fit(X)
    const t = enc.transform(X)
    const r = enc.inverseTransform(t)
    for (let i = 0; i < X.length; i++) {
      expect(r[i]![0]!).toBe(X[i]![0]!)
      expect(r[i]![1]!).toBe(X[i]![1]!)
    }
  })

  it('drop first', () => {
    const X = [['a'], ['b'], ['c']]
    const enc = new OneHotEncoder({ drop: 'first' }).fit(X)
    const t = enc.transform(X)
    expect(t[0]!.length).toBe(2) // 3 categories - 1 dropped
    expect(t[0]!).toEqual([0, 0])
    expect(t[1]!).toEqual([1, 0])
    expect(t[2]!).toEqual([0, 1])
  })

  it('drop first roundtrip', () => {
    const X = [
      ['y', 'q'],
      ['z', 'r'],
      ['x', 'p'],
    ]
    const enc = new OneHotEncoder({ drop: 'first' }).fit(X)
    const t = enc.transform(X)
    const r = enc.inverseTransform(t)
    for (let i = 0; i < X.length; i++) {
      expect(r[i]![0]!).toBe(X[i]![0]!)
      expect(r[i]![1]!).toBe(X[i]![1]!)
    }
  })

  it('single category', () => {
    const X = [['a'], ['a'], ['a']]
    const enc = new OneHotEncoder().fit(X)
    const t = enc.transform(X)
    expect(t[0]!.length).toBe(1)
    expect(t[0]!).toEqual([1])
    expect(t[1]!).toEqual([1])
  })

  it('single sample', () => {
    const X = [['cat']]
    const enc = new OneHotEncoder().fit(X)
    const t = enc.transform(X)
    expect(t.length).toBe(1)
    expect(t[0]!.length).toBe(1)
    expect(t[0]![0]!).toBe(1)
  })

  it('numeric categories', () => {
    const X = [
      [10, 100],
      [20, 200],
      [10, 200],
    ]
    const enc = new OneHotEncoder().fit(X)
    const t = enc.transform(X)
    expect(t[0]!.length).toBe(4) // 2 + 2 = 4
    expect(t[0]!).toEqual([1, 0, 1, 0])
    expect(t[1]!).toEqual([0, 1, 0, 1])
    expect(t[2]!).toEqual([1, 0, 0, 1])
  })

  it('fitTransform returns same as fit then transform', () => {
    const X = [
      ['a', '1'],
      ['b', '2'],
      ['a', '2'],
    ]
    const enc1 = new OneHotEncoder()
    const r1 = enc1.fitTransform(X)
    const enc2 = new OneHotEncoder()
    const r2 = enc2.fit(X).transform(X)
    for (let i = 0; i < r1.length; i++) {
      for (let j = 0; j < r1[0]!.length; j++) {
        expect(r1[i]![j]!).toBe(r2[i]![j]!)
      }
    }
  })

  it('empty data throws', () => {
    expect(() => new OneHotEncoder().fit([])).toThrow('empty')
  })

  it('transform before fit throws', () => {
    const enc = new OneHotEncoder()
    expect(() => enc.transform([['a']])).toThrow('must fit')
  })

  it('inverseTransform with unknown row throws', () => {
    const X = [['a'], ['b']]
    const enc = new OneHotEncoder().fit(X)
    expect(() => enc.inverseTransform([[0, 0]])).toThrow('no active category')
  })

  it('sparseOutput option throws', () => {
    expect(() => new OneHotEncoder({ sparseOutput: true })).toThrow('sparseOutput not supported')
  })
})
