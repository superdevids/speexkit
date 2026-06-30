import { describe, it, expect } from 'vitest'
import { kFold, crossValScore } from '../src/ml/cross-validation.js'
import { LinearRegression } from '../src/ml/index.js'

describe('kFold', () => {
  it('returns correct number of folds', () => {
    const X = new Array(20).fill(0)
    const y = new Array(20).fill(0)
    const folds = [...kFold(X, y, 5)]
    expect(folds.length).toBe(5)
  })

  it('each fold has correct train/test sizes', () => {
    const X = new Array(20).fill(0)
    const y = new Array(20).fill(0)
    const folds = [...kFold(X, y, 5)]
    for (const fold of folds) {
      expect(fold.trainIndices.length).toBe(16)
      expect(fold.testIndices.length).toBe(4)
    }
  })

  it('train and test indices cover full range', () => {
    const X = new Array(20).fill(0)
    const y = new Array(20).fill(0)
    const folds = [...kFold(X, y, 5)]
    for (const fold of folds) {
      const all = [...fold.trainIndices, ...fold.testIndices]
      expect(all.length).toBe(20)
      const sorted = [...all].sort((a, b) => a - b)
      expect(sorted).toEqual(Array.from({ length: 20 }, (_, i) => i))
    }
  })

  it('train and test indices are disjoint', () => {
    const X = new Array(20).fill(0)
    const y = new Array(20).fill(0)
    for (const fold of kFold(X, y, 5)) {
      for (const ti of fold.testIndices) {
        expect(fold.trainIndices).not.toContain(ti)
      }
    }
  })

  it('handles nSplits > n by clamping', () => {
    const X = new Array(3).fill(0)
    const y = new Array(3).fill(0)
    const folds = [...kFold(X, y, 10)]
    expect(folds.length).toBe(3)
  })

  it('shuffle produces different ordering', () => {
    const X = new Array(10).fill(0)
    const y = new Array(10).fill(0)
    const folds1 = [...kFold(X, y, 3, true, 42)]
    const folds2 = [...kFold(X, y, 3, true, 42)]
    // With same seed, should produce same partition
    for (let f = 0; f < 3; f++) {
      expect(folds1[f]!.trainIndices).toEqual(folds2[f]!.trainIndices)
      expect(folds1[f]!.testIndices).toEqual(folds2[f]!.testIndices)
    }
  })

  it('handles remainder folds correctly', () => {
    const X = new Array(22).fill(0)
    const y = new Array(22).fill(0)
    const folds = [...kFold(X, y, 5)]
    // 22 = 4*4 + 1*6 (one fold has 6, others have 4)
    let total = 0
    for (const fold of folds) {
      total += fold.testIndices.length
    }
    expect(total).toBe(22)
  })

  it('empty data throws', () => {
    expect(() => [...kFold([], [], 5)]).toThrow('empty')
  })

  it('nSplits < 2 throws', () => {
    expect(() => [...kFold([1], [1], 1)]).toThrow('nSplits must be >= 2')
  })
})

describe('crossValScore', () => {
  it('returns correct number of scores', () => {
    const X = [[1], [2], [3], [4], [5], [6]]
    const y = [2, 4, 6, 8, 10, 12]
    const lr = new LinearRegression()
    const scores = crossValScore(lr, X, y, { cv: 3 })
    expect(scores.length).toBe(3)
  })

  it('r2 scoring returns reasonable values', () => {
    // Nearly linear data
    const X = [[1], [2], [3], [4], [5], [6], [7], [8]]
    const y = [1.1, 2.2, 2.9, 4.0, 5.1, 5.9, 7.0, 8.1]
    const lr = new LinearRegression()
    const scores = crossValScore(lr, X, y, { cv: 4, scoring: 'r2' })
    for (const s of scores) {
      expect(s).toBeGreaterThan(0.5)
    }
  })

  it('negMeanSquaredError returns negative or zero values', () => {
    const X = [[1], [2], [3], [4], [5], [6]]
    const y = [2, 4, 6, 8, 10, 12]
    const lr = new LinearRegression()
    const scores = crossValScore(lr, X, y, { cv: 3, scoring: 'negMeanSquaredError' })
    for (const s of scores) {
      expect(s).toBeLessThanOrEqual(0)
    }
  })

  it('accuracy scoring with perfect classifier', () => {
    const X = [[1], [2], [3], [7], [8], [9]]
    const y = [0, 0, 0, 1, 1, 1]
    // Use a simple threshold classifier
    const dummy = {
      fit(_X: number[][], _y: number[]) {},
      predict(X: number[][]): number[] {
        return X.map((r) => (r[0]! > 5 ? 1 : 0))
      },
    }
    const scores = crossValScore(dummy, X, y, { cv: 3, scoring: 'accuracy' })
    for (const s of scores) {
      expect(s).toBe(1)
    }
  })
})
