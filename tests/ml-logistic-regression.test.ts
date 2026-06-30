import { describe, it, expect } from 'vitest'
import { LogisticRegression } from '../src/ml/logistic-regression.js'

describe('LogisticRegression', () => {
  it('fit predict on perfectly separable data', () => {
    // Points on left vs right of x=5
    const X = [[1], [2], [3], [7], [8], [9]]
    const y = [0, 0, 0, 1, 1, 1]
    const lr = new LogisticRegression({ fitIntercept: true, maxIter: 200 }).fit(X, y)
    const p = lr.predict(X)
    for (let i = 0; i < y.length; i++) {
      expect(p[i]!).toBe(y[i]!)
    }
  })

  it('predictProba returns values between 0 and 1', () => {
    const X = [[1], [2], [3], [7], [8], [9]]
    const y = [0, 0, 0, 1, 1, 1]
    const lr = new LogisticRegression({ maxIter: 200 }).fit(X, y)
    const probs = lr.predictProba(X)
    for (const p of probs) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })

  it('decision boundary is near 5', () => {
    const X = [[1], [2], [3], [7], [8], [9]]
    const y = [0, 0, 0, 1, 1, 1]
    const lr = new LogisticRegression({ fitIntercept: true, maxIter: 200 }).fit(X, y)
    // At x=5, probability should be near 0.5
    const probAt5 = lr.predictProba([[5]])[0]!
    expect(probAt5).toBeGreaterThan(0.01)
    expect(probAt5).toBeLessThan(0.99)
    // x=4 should be class 0, x=6 should be class 1
    expect(lr.predict([[4]])[0]).toBe(0)
    expect(lr.predict([[6]])[0]).toBe(1)
  })

  it('single feature with intercept', () => {
    const X = [
      [1, 2],
      [2, 3],
      [3, 4],
      [8, 9],
      [9, 10],
      [10, 11],
    ]
    const y = [0, 0, 0, 1, 1, 1]
    const lr = new LogisticRegression({ fitIntercept: true, maxIter: 200 }).fit(X, y)
    const p = lr.predict(X)
    for (let i = 0; i < y.length; i++) {
      expect(p[i]!).toBe(y[i]!)
    }
    expect(lr.coef_.length).toBe(2)
    expect(typeof lr.intercept_).toBe('number')
    expect(lr.classes_).toEqual([0, 1])
  })

  it('fit without intercept', () => {
    const X = [[1], [2], [3], [4]]
    const y = [0, 0, 1, 1]
    const lr = new LogisticRegression({ fitIntercept: false, maxIter: 200 }).fit(X, y)
    const p = lr.predict(X)
    expect(p.length).toBe(4)
    expect(lr.intercept_).toBe(0)
    expect(lr.coef_.length).toBe(1)
  })

  it('probabilities consistent with predict threshold', () => {
    const X = [[1], [2], [3], [7], [8], [9]]
    const y = [0, 0, 0, 1, 1, 1]
    const lr = new LogisticRegression({ maxIter: 200 }).fit(X, y)
    const probs = lr.predictProba(X)
    const preds = lr.predict(X)
    for (let i = 0; i < y.length; i++) {
      expect(probs[i]! >= 0.5 ? 1 : 0).toBe(preds[i]!)
    }
  })

  it('converges for easy data within tolerance', () => {
    const X = [[0.1], [0.2], [0.8], [0.9]]
    const y = [0, 0, 1, 1]
    const lr = new LogisticRegression({ maxIter: 50, tol: 1e-4 }).fit(X, y)
    const p = lr.predict(X)
    expect(p).toEqual([0, 0, 1, 1])
  })

  it('empty data throws', () => {
    const lr = new LogisticRegression()
    expect(() => lr.fit([], [])).toThrow('empty')
  })

  it('predict before fit throws', () => {
    const lr = new LogisticRegression()
    expect(() => lr.predict([[1]])).toThrow('must fit')
  })

  it('predictProba before fit throws', () => {
    const lr = new LogisticRegression()
    expect(() => lr.predictProba([[1]])).toThrow('must fit')
  })
})
