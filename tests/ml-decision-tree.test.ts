import { describe, it, expect } from 'vitest'
import { DecisionTreeClassifier } from '../src/ml/decision-tree.js'

describe('DecisionTreeClassifier', () => {
  it('solves XOR problem', () => {
    const X = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]
    const y = [0, 1, 1, 0]
    const dt = new DecisionTreeClassifier({ maxDepth: 3 }).fit(X, y)
    const p = dt.predict(X)
    expect(p).toEqual([0, 1, 1, 0])
  })

  it('classifies iris-like data (3 classes)', () => {
    const X = [
      [1, 1],
      [2, 1],
      [1, 2],
      [5, 5],
      [6, 5],
      [5, 6],
      [9, 9],
      [10, 9],
      [9, 10],
    ]
    const y = [0, 0, 0, 1, 1, 1, 2, 2, 2]
    const dt = new DecisionTreeClassifier({ maxDepth: 3 }).fit(X, y)
    const p = dt.predict(X)
    expect(p).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2])
  })

  it('perfectly separates linearly separable data', () => {
    const X = [[1], [2], [3], [10], [11], [12]]
    const y = [0, 0, 0, 1, 1, 1]
    const dt = new DecisionTreeClassifier().fit(X, y)
    const p = dt.predict(X)
    expect(p).toEqual([0, 0, 0, 1, 1, 1])
  })

  it('respects maxDepth limiting', () => {
    const X = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]
    const y = [0, 1, 1, 0]

    const dt1 = new DecisionTreeClassifier({ maxDepth: 1 }).fit(X, y)
    const p1 = dt1.predict(X)

    const dt3 = new DecisionTreeClassifier({ maxDepth: 3 }).fit(X, y)
    const p3 = dt3.predict(X)

    // depth 1 should be worse than depth 3 for XOR
    const acc1 = p1.filter((v, i) => v === y[i]).length / y.length
    const acc3 = p3.filter((v, i) => v === y[i]).length / y.length
    expect(acc1).toBeLessThan(acc3)
  })

  it('computes feature importances that sum to 1', () => {
    // Only the first feature is informative
    const X = [
      [1, 99],
      [2, 88],
      [3, 77],
      [10, 66],
      [11, 55],
      [12, 44],
    ]
    const y = [0, 0, 0, 1, 1, 1]
    const dt = new DecisionTreeClassifier({ maxDepth: 2 }).fit(X, y)
    const imp = dt.featureImportances_
    expect(imp.length).toBe(2)
    const sum = imp.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 5)
    // First feature should be more important
    expect(imp[0]!).toBeGreaterThan(imp[1]!)
  })

  it('predictProba returns probabilities that sum to 1', () => {
    const X = [
      [1, 1],
      [2, 1],
      [5, 5],
      [6, 5],
    ]
    const y = [0, 0, 1, 1]
    const dt = new DecisionTreeClassifier({ maxDepth: 2 }).fit(X, y)
    const probs = dt.predictProba(X)
    for (const row of probs) {
      const sum = row.reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1, 5)
    }
  })

  it('works with a single feature', () => {
    const X = [[0.1], [0.2], [0.8], [0.9]]
    const y = [0, 0, 1, 1]
    const dt = new DecisionTreeClassifier().fit(X, y)
    const p = dt.predict(X)
    expect(p).toEqual([0, 0, 1, 1])
  })

  it('throws on empty data', () => {
    const dt = new DecisionTreeClassifier()
    expect(() => dt.fit([], [])).toThrow('empty')
  })

  it('throws on length mismatch', () => {
    const dt = new DecisionTreeClassifier()
    expect(() => dt.fit([[1], [2]], [0])).toThrow('length mismatch')
  })

  it('predict before fit throws', () => {
    const dt = new DecisionTreeClassifier()
    expect(() => dt.predict([[1]])).toThrow('must fit')
  })

  it('predictProba before fit throws', () => {
    const dt = new DecisionTreeClassifier()
    expect(() => dt.predictProba([[1]])).toThrow('must fit')
  })

  it('gini and entropy produce identical results on clean data', () => {
    const X = [
      [1, 1],
      [2, 1],
      [5, 5],
      [6, 5],
    ]
    const y = [0, 0, 1, 1]
    const dtGini = new DecisionTreeClassifier({ criterion: 'gini', maxDepth: 2 }).fit(X, y)
    const dtEnt = new DecisionTreeClassifier({ criterion: 'entropy', maxDepth: 2 }).fit(X, y)
    expect(dtGini.predict(X)).toEqual(dtEnt.predict(X))
  })

  it('tree structure is inspectable after fit', () => {
    const X = [[1], [2], [3], [4]]
    const y = [0, 0, 1, 1]
    const dt = new DecisionTreeClassifier({ maxDepth: 2 }).fit(X, y)
    const tree = dt.tree_
    expect(tree).not.toBeNull()
    expect(tree!.sampleCount).toBe(4)
    expect(tree!.featureIndex).toBeDefined()
    expect(tree!.threshold).toBeDefined()
    expect(tree!.left).toBeDefined()
    expect(tree!.right).toBeDefined()
  })
})
