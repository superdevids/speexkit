import { describe, it, expect } from 'vitest'
import {
  StandardScaler, MinMaxScaler, LinearRegression, KMeans,
  LabelEncoder, KNN,
  trainTestSplit, confusionMatrix, accuracyScore, r2Score,
  meanSquaredError, meanAbsoluteError, euclideanDistance,
  manhattanDistance, cosineSimilarity,
} from '../src/ml/index.js'

describe('StandardScaler', () => {
  it('fit transform roundtrip', () => {
    const X = [[1, 2], [3, 4], [5, 6]]
    const s = new StandardScaler().fit(X)
    const t = s.transform(X)
    expect(t[0]![0]!).toBeCloseTo(-1.2247, 3)
    expect(t[2]![1]!).toBeCloseTo(1.2247, 3)
    const r = s.inverseTransform(t)
    for (let i = 0; i < X.length; i++)
      for (let j = 0; j < X[0]!.length; j++)
        expect(r[i]![j]!).toBeCloseTo(X[i]![j]!, 10)
  })
  it('fitTransform works', () => {
    const X = [[1, 2], [3, 4], [5, 6]]
    const s = new StandardScaler()
    const t = s.fitTransform(X)
    expect(t[0]![0]!).toBeCloseTo(-1.2247, 3)
  })
})

describe('MinMaxScaler', () => {
  it('fit transform defaults to [0,1]', () => {
    const X = [[1, 2], [3, 4], [5, 6]]
    const s = new MinMaxScaler().fit(X)
    const t = s.transform(X)
    expect(t[0]![0]!).toBe(0)
    expect(t[2]![0]!).toBe(1)
    expect(t[1]![1]!).toBe(0.5)
  })
  it('custom featureRange', () => {
    const X = [[1], [3], [5]]
    const s = new MinMaxScaler({ featureRange: [-1, 1] }).fit(X)
    const t = s.transform(X)
    expect(t[0]![0]!).toBe(-1)
    expect(t[2]![0]!).toBe(1)
    expect(t[1]![0]!).toBe(0)
  })
})

describe('trainTestSplit', () => {
  it('returns correct split ratio', () => {
    const X = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]]
    const y = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]
    const [Xt, Xte, yt, yte] = trainTestSplit(X, y, { testSize: 0.3, randomState: 42 })
    expect(Xt.length).toBe(7)
    expect(Xte.length).toBe(3)
    expect(yt.length).toBe(7)
    expect(yte.length).toBe(3)
  })
  it('seed reproducibility', () => {
    const X = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]]
    const y = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]
    const [Xt1, , yt1] = trainTestSplit(X, y, { testSize: 0.3, randomState: 42 })
    const [Xt2, , yt2] = trainTestSplit(X, y, { testSize: 0.3, randomState: 42 })
    expect(Xt1).toEqual(Xt2)
    expect(yt1).toEqual(yt2)
  })
  it('no shuffle returns sequential split', () => {
    const X = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]]
    const y = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]
    const [Xt, Xte, yt, yte] = trainTestSplit(X, y, { testSize: 0.3, shuffle: false })
    expect(Xt.length).toBe(7)
    expect(Xte.length).toBe(3)
    expect(yt).toEqual([0, 0, 0, 0, 0, 1, 1])
    expect(yte).toEqual([1, 1, 1])
  })
})

describe('LinearRegression', () => {
  it('fit on simple linear data', () => {
    const X = [[1], [2], [3], [4], [5]]
    const y = [3, 5, 7, 9, 11]
    const m = new LinearRegression().fit(X, y)
    const p = m.predict(X)
    for (let i = 0; i < y.length; i++) expect(p[i]!).toBeCloseTo(y[i]!, 10)
    expect(m.score(X, y)).toBeCloseTo(1, 10)
    expect(m.coef[0]!).toBeCloseTo(2, 5)
    expect(m.intercept).toBeCloseTo(1, 5)
  })
})

describe('KMeans', () => {
  it('fit predict on simple 2D clusters', () => {
    const X = [[0, 0], [1, 0], [0, 1], [10, 10], [11, 10], [10, 11]]
    const m = new KMeans({ nClusters: 2, randomState: 42 }).fit(X)
    const l = m.predict(X)
    expect(l[0]!).toBe(l[1]!)
    expect(l[0]!).toBe(l[2]!)
    expect(l[3]!).toBe(l[4]!)
    expect(l[3]!).toBe(l[5]!)
    expect(l[0]!).not.toBe(l[3]!)
    expect(m.clusterCenters_.length).toBe(2)
    expect(m.inertia_).toBeGreaterThan(0)
  })
})

describe('LabelEncoder', () => {
  it('fit transform on strings', () => {
    const y = ['cat', 'dog', 'bird', 'dog', 'cat']
    const e = new LabelEncoder().fit(y)
    const t = e.transform(y)
    expect(t).toEqual([1, 2, 0, 2, 1])
    expect(e.classes_).toEqual(['bird', 'cat', 'dog'])
  })
  it('fit transform on numbers', () => {
    const y = [10, 20, 10, 30]
    const e = new LabelEncoder().fit(y)
    expect(e.transform(y)).toEqual([0, 1, 0, 2])
  })
  it('inverseTransform', () => {
    const y = ['a', 'b', 'c']
    const e = new LabelEncoder().fit(y)
    expect(e.inverseTransform([0, 1, 2])).toEqual(['a', 'b', 'c'])
    expect(e.inverseTransform([2, 0, 1])).toEqual(['c', 'a', 'b'])
  })
  it('unseen label throws', () => {
    const e = new LabelEncoder().fit(['a', 'b'])
    expect(() => e.transform(['c'])).toThrow('unknown label')
  })
  it('fitTransform', () => {
    const t = new LabelEncoder().fitTransform(['x', 'y', 'x'])
    expect(t).toEqual([0, 1, 0])
  })
})

describe('KNN', () => {
  it('fit predict on simple 2D classification', () => {
    const X = [[0, 0], [1, 0], [0, 1], [10, 10], [11, 10], [10, 11]]
    const y = [0, 0, 0, 1, 1, 1]
    const knn = new KNN({ nNeighbors: 3 }).fit(X, y)
    expect(knn.predict([[0.5, 0.5]])).toEqual([0])
    expect(knn.predict([[10.5, 10.5]])).toEqual([1])
  })
  it('predictProbabilities sum to 1', () => {
    const X = [[0, 0], [1, 0], [0, 1], [10, 10], [11, 10], [10, 11]]
    const y = [0, 0, 0, 1, 1, 1]
    const knn = new KNN({ nNeighbors: 3 }).fit(X, y)
    const probs = knn.predictProbabilities([[5, 5]])
    expect(probs[0]!.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
  })
  it('distance weighting', () => {
    const X = [[0, 0], [10, 10], [11, 10]]
    const y = [0, 1, 1]
    const knn = new KNN({ nNeighbors: 2, weights: 'distance' }).fit(X, y)
    const p = knn.predict([[6, 6]])
    expect(p[0]!).toBe(1)
  })
})

describe('metrics', () => {
  it('accuracyScore perfect = 1', () => {
    expect(accuracyScore([0, 1, 2], [0, 1, 2])).toBe(1)
    expect(accuracyScore([0, 1, 2], [0, 1, 0])).toBeCloseTo(2 / 3, 10)
  })
  it('r2Score perfect = 1', () => {
    expect(r2Score([1, 2, 3], [1, 2, 3])).toBe(1)
    expect(r2Score([1, 2, 3], [3, 2, 1])).toBeLessThan(0)
  })
  it('meanSquaredError perfect = 0', () => {
    expect(meanSquaredError([1, 2, 3], [1, 2, 3])).toBe(0)
    expect(meanSquaredError([1, 2, 3], [2, 3, 4])).toBe(1)
  })
  it('meanAbsoluteError perfect = 0', () => {
    expect(meanAbsoluteError([1, 2, 3], [1, 2, 3])).toBe(0)
    expect(meanAbsoluteError([1, 2, 3], [2, 3, 4])).toBe(1)
  })
})

describe('distances', () => {
  it('euclideanDistance known values', () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5)
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0)
  })
  it('manhattanDistance known values', () => {
    expect(manhattanDistance([0, 0], [3, 4])).toBe(7)
    expect(manhattanDistance([1, 2, 3], [1, 2, 3])).toBe(0)
  })
  it('cosineSimilarity edge cases', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1)
    expect(cosineSimilarity([1, 0], [-1, 0])).toBe(-1)
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0)
  })
})

describe('confusionMatrix', () => {
  it('square matrix with correct dimensions', () => {
    const yt = [0, 0, 1, 1, 2, 2]
    const yp = [0, 1, 1, 0, 2, 2]
    const cm = confusionMatrix(yt, yp)
    expect(cm.length).toBe(3)
    expect(cm[0]!.length).toBe(3)
    expect(cm[0]![0]!).toBe(1)
    expect(cm[0]![1]!).toBe(1)
    expect(cm[1]![0]!).toBe(1)
    expect(cm[1]![1]!).toBe(1)
    expect(cm[2]![2]!).toBe(2)
  })
  it('binary matrix', () => {
    const cm = confusionMatrix([0, 0, 1, 1], [0, 1, 0, 1])
    expect(cm[0]![0]!).toBe(1)
    expect(cm[0]![1]!).toBe(1)
    expect(cm[1]![0]!).toBe(1)
    expect(cm[1]![1]!).toBe(1)
  })
})
