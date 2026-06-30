import { describe, it, expect } from 'vitest'
import { DBSCAN } from '../src/ml/dbscan.js'

describe('DBSCAN', () => {
  it('finds two well-separated clusters', () => {
    const X = [
      [1, 1],
      [1.5, 1],
      [1, 1.5],
      [10, 10],
      [10.5, 10],
      [10, 10.5],
    ]
    const db = new DBSCAN({ eps: 1, minSamples: 2 }).fit(X)
    expect(db.nClusters_).toBe(2)
    expect(db.labels_[0]).toBe(db.labels_[1])
    expect(db.labels_[0]).toBe(db.labels_[2])
    expect(db.labels_[3]).toBe(db.labels_[4])
    expect(db.labels_[3]).toBe(db.labels_[5])
    expect(db.labels_[0]).not.toBe(db.labels_[3])
  })

  it('finds three clusters', () => {
    const X = [
      [1, 1],
      [1.5, 1],
      [10, 10],
      [10.5, 10],
      [20, 20],
      [20.5, 20],
    ]
    const db = new DBSCAN({ eps: 1, minSamples: 2 }).fit(X)
    expect(db.nClusters_).toBe(3)
  })

  it('correctly identifies noise points', () => {
    const X = [
      [1, 1],
      [1.5, 1],
      [1, 1.5],
      [10, 10],
      [10.5, 10],
      [10, 10.5],
      [99, 99],
    ]
    const db = new DBSCAN({ eps: 1, minSamples: 2 }).fit(X)
    expect(db.labels_[6]).toBe(-1)
    expect(db.nClusters_).toBe(2)
  })

  it('produces different results with different eps values', () => {
    const X = [
      [1, 1],
      [2, 2],
      [3, 3],
      [10, 10],
    ]
    const dbSmall = new DBSCAN({ eps: 0.5, minSamples: 2 }).fit(X)
    const dbLarge = new DBSCAN({ eps: 2, minSamples: 2 }).fit(X)
    // Small eps: mostly noise or single points
    expect(dbSmall.nClusters_).toBeLessThanOrEqual(dbLarge.nClusters_)
    // Large eps: first 3 points should be together
    expect(dbLarge.labels_[0]).toBe(dbLarge.labels_[1])
    expect(dbLarge.labels_[0]).toBe(dbLarge.labels_[2])
  })

  it('responds to different minSamples values', () => {
    const X = [
      [1, 1],
      [1.5, 1],
      [1, 1.5],
      [10, 10],
    ]
    // With minSamples=4, no point can be core (only 4 points in total, each has at most 3 neighbors)
    const db1 = new DBSCAN({ eps: 1, minSamples: 4 }).fit(X)
    // With minSamples=2, first 3 points form a cluster
    const db2 = new DBSCAN({ eps: 1, minSamples: 2 }).fit(X)
    expect(db1.nClusters_).toBe(0)
    expect(db2.nClusters_).toBe(1)
  })

  it('detects a single cluster', () => {
    const X = [
      [1, 1],
      [1.1, 1],
      [1, 1.1],
      [1.05, 1.05],
    ]
    const db = new DBSCAN({ eps: 0.2, minSamples: 2 }).fit(X)
    expect(db.nClusters_).toBe(1)
    for (const l of db.labels_) {
      expect(l).toBe(0)
    }
  })

  it('marks all points as noise when eps is too small', () => {
    const X = [
      [1, 1],
      [2, 2],
      [3, 3],
    ]
    const db = new DBSCAN({ eps: 0.01, minSamples: 2 }).fit(X)
    expect(db.nClusters_).toBe(0)
    for (const l of db.labels_) {
      expect(l).toBe(-1)
    }
  })

  it('works with Manhattan distance', () => {
    const X = [
      [1, 1],
      [1.5, 1],
      [1, 1.5],
      [10, 10],
      [10.5, 10],
      [10, 10.5],
    ]
    const db = new DBSCAN({ eps: 1, minSamples: 2, metric: 'manhattan' }).fit(X)
    expect(db.nClusters_).toBe(2)
    expect(db.labels_[0]).toBe(db.labels_[1])
    expect(db.labels_[3]).toBe(db.labels_[4])
    expect(db.labels_[0]).not.toBe(db.labels_[3])
  })

  it('reports core sample indices correctly', () => {
    const X = [
      [1, 1],
      [1.1, 1],
      [1, 1.1],
      [10, 10],
    ]
    const db = new DBSCAN({ eps: 0.2, minSamples: 3 }).fit(X)
    // Only first 3 points are within eps of each other
    // With minSamples=3, all 3 are core if each has 3 neighbors (including itself)
    expect(db.coreSampleIndices_.length).toBeGreaterThanOrEqual(2)
    for (const idx of db.coreSampleIndices_) {
      expect(idx).toBeLessThan(3)
    }
  })

  it('fitPredict returns labels directly', () => {
    const X = [
      [1, 1],
      [1.5, 1],
      [10, 10],
      [10.5, 10],
    ]
    const db = new DBSCAN({ eps: 1, minSamples: 2 })
    const labels = db.fitPredict(X)
    expect(labels).toEqual(db.labels_)
  })

  it('throws on empty data', () => {
    const db = new DBSCAN()
    expect(() => db.fit([])).toThrow('empty')
  })

  it('accessing properties before fit throws', () => {
    const db = new DBSCAN()
    expect(() => db.labels_).toThrow('must fit')
    expect(() => db.coreSampleIndices_).toThrow('must fit')
    expect(() => db.nClusters_).toThrow('must fit')
  })
})
