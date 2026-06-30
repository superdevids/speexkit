import { describe, it, expect } from 'vitest'
import { PCA } from '../src/ml/pca.js'

describe('PCA', () => {
  it('fit transform decorrelates 2D data', () => {
    // Data strongly correlated along y=x
    const X: number[][] = []
    for (let i = 0; i < 100; i++) {
      const base = i / 50
      X.push([base + Math.random() * 0.1, base + Math.random() * 0.1])
    }
    const pca = new PCA({ nComponents: 2 }).fit(X)
    const Xt = pca.transform(X)
    expect(Xt.length).toBe(100)
    expect(Xt[0]!.length).toBe(2)
    // First component should have much higher variance
    const v0 = pca.explainedVariance_[0]!
    const v1 = pca.explainedVariance_[1]!
    expect(v0).toBeGreaterThan(v1 * 10)
  })

  it('fit transform reduces dimensionality', () => {
    const X = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12],
    ]
    const pca = new PCA({ nComponents: 2 }).fit(X)
    const Xr = pca.transform(X)
    expect(Xr.length).toBe(4)
    expect(Xr[0]!.length).toBe(2)
    expect(pca.nComponents_).toBe(2)
    expect(pca.components_.length).toBe(2)
    expect(pca.components_[0]!.length).toBe(3)
    expect(pca.explainedVariance_.length).toBe(2)
  })

  it('keeping all components preserves variance sum', () => {
    const X = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ]
    const pca = new PCA().fit(X)
    expect(pca.nComponents_).toBe(2)
    const totalVar = pca.explainedVariance_.reduce((a, b) => a + b, 0)
    expect(totalVar).toBeGreaterThan(0)
  })

  it('fitTransform returns same result as fit then transform', () => {
    const X = [
      [2, 3],
      [5, 4],
      [9, 7],
      [1, 8],
    ]
    const pca1 = new PCA({ nComponents: 1 })
    const r1 = pca1.fitTransform(X)
    const pca2 = new PCA({ nComponents: 1 })
    const r2 = pca2.fit(X).transform(X)
    for (let i = 0; i < r1.length; i++) {
      expect(r1[i]![0]!).toBeCloseTo(r2[i]![0]!, 10)
    }
  })

  it('single feature', () => {
    const X = [[1], [2], [3], [4], [5]]
    const pca = new PCA({ nComponents: 1 }).fit(X)
    const Xt = pca.transform(X)
    expect(Xt.length).toBe(5)
    expect(Xt[0]!.length).toBe(1)
    expect(pca.explainedVariance_.length).toBe(1)
  })

  it('single sample', () => {
    const X = [[1, 2, 3]]
    const pca = new PCA().fit(X)
    // With 1 sample, variance is 0
    for (const v of pca.explainedVariance_) {
      expect(v).toBeCloseTo(0, 5)
    }
  })

  it('explained variance is non-negative', () => {
    const X = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]
    const pca = new PCA({ nComponents: 2 }).fit(X)
    for (const v of pca.explainedVariance_) {
      expect(v).toBeGreaterThanOrEqual(0)
    }
  })

  it('mean is correct', () => {
    const X = [
      [1, 10],
      [3, 20],
      [5, 30],
    ]
    const pca = new PCA().fit(X)
    expect(pca.mean_[0]!).toBeCloseTo(3, 10)
    expect(pca.mean_[1]!).toBeCloseTo(20, 10)
  })

  it('zero variance feature', () => {
    const X = [
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
    ]
    const pca = new PCA({ nComponents: 2 }).fit(X)
    // Second feature has zero variance, so second eigenvalue should be ~0
    expect(pca.explainedVariance_[1]!).toBeLessThan(1e-10)
  })

  it('empty data throws', () => {
    expect(() => new PCA().fit([])).toThrow('empty')
  })

  it('transform before fit throws', () => {
    const pca = new PCA()
    expect(() => pca.transform([[1]])).toThrow('must fit')
  })
})
