/**
 * DBSCAN (Density-Based Spatial Clustering of Applications with Noise).
 *
 * Groups points that are closely packed together, marking points that lie
 * alone in low-density regions as noise.  Supports Euclidean and Manhattan
 * distance metrics.
 *
 * @example
 * ```ts
 * const db = new DBSCAN({ eps: 0.5, minSamples: 5 })
 * const labels = db.fitPredict(X)
 * // labels[i] === -1  → noise
 * // labels[i] >=  0  → cluster id
 * ```
 */
export class DBSCAN {
  private eps: number
  private minP: number
  private metric: 'euclidean' | 'manhattan'
  private labels: number[] = []
  private core: number[] = []
  private nC = 0
  private f = false

  /**
   * @param o - Configuration options
   * @param o.eps - Maximum distance between two points to be considered neighbors (default: 0.5)
   * @param o.minSamples - Minimum points in eps-neighborhood to form a core point (default: 5)
   * @param o.metric - Distance metric (default: 'euclidean')
   */
  constructor(o?: { eps?: number; minSamples?: number; metric?: 'euclidean' | 'manhattan' }) {
    this.eps = o?.eps ?? 0.5
    this.minP = o?.minSamples ?? 5
    this.metric = o?.metric ?? 'euclidean'
  }

  /**
   * Fit DBSCAN to data.
   * @param X - Data, shape (n_samples, n_features)
   */
  fit(X: number[][]): this {
    const n = X.length
    if (!n) throw Error('DBSCAN.fit: empty data')

    const labels = new Array<number>(n).fill(-2)
    let clusterId = -1

    for (let i = 0; i < n; i++) {
      if (labels[i] !== -2) continue

      const neighbors = this.regionQuery(X, i)

      if (neighbors.length < this.minP) {
        labels[i] = -1
        continue
      }

      clusterId++
      labels[i] = clusterId

      let seedIdx = 0
      while (seedIdx < neighbors.length) {
        const q = neighbors[seedIdx]!
        seedIdx++

        if (labels[q] === -1) {
          labels[q] = clusterId
          continue
        }

        if (labels[q] !== -2) continue

        labels[q] = clusterId

        const qNeighbors = this.regionQuery(X, q)
        if (qNeighbors.length >= this.minP) {
          for (const nb of qNeighbors) {
            if (labels[nb] === -2 || labels[nb] === -1) {
              neighbors.push(nb)
            }
          }
        }
      }
    }

    this.labels = labels
    this.nC = clusterId + 1

    const coreIdx: number[] = []
    for (let i = 0; i < n; i++) {
      const nb = this.regionQuery(X, i)
      if (nb.length >= this.minP) coreIdx.push(i)
    }
    this.core = coreIdx
    this.f = true
    return this
  }

  /**
   * Fit DBSCAN and return cluster labels.
   * @param X - Data, shape (n_samples, n_features)
   * @returns Cluster labels (-1 = noise, 0+ = cluster id)
   */
  fitPredict(X: number[][]): number[] {
    // biome-ignore lint/suspicious/noFocusedTests: ML training method, not test focus
    this.fit(X)
    return this.labels
  }

  /** Cluster labels (-1 = noise, 0+ = cluster id). */
  get labels_(): number[] {
    if (!this.f) throw Error('DBSCAN: must fit before accessing labels')
    return this.labels
  }

  /** Indices of core samples (points with >= minSamples neighbors within eps). */
  get coreSampleIndices_(): number[] {
    if (!this.f) throw Error('DBSCAN: must fit before accessing core samples')
    return this.core
  }

  /** Number of clusters found (excluding noise). */
  get nClusters_(): number {
    if (!this.f) throw Error('DBSCAN: must fit before accessing nClusters')
    return this.nC
  }

  // ── private helpers ──────────────────────────────────────

  private dist(a: number[], b: number[]): number {
    if (this.metric === 'manhattan') {
      let s = 0
      for (let i = 0; i < a.length; i++) s += Math.abs(a[i]! - b[i]!)
      return s
    }
    let s = 0
    for (let i = 0; i < a.length; i++) {
      const d = a[i]! - b[i]!
      s += d * d
    }
    return Math.sqrt(s)
  }

  private regionQuery(X: number[][], idx: number): number[] {
    const nb: number[] = []
    const xi = X[idx]!
    for (let i = 0; i < X.length; i++) {
      if (this.dist(xi, X[i]!) <= this.eps) {
        nb.push(i)
      }
    }
    return nb
  }
}
