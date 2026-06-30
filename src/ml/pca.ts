/**
 * Principal Component Analysis (PCA) using eigendecomposition of the covariance matrix.
 *
 * Reduces dimensionality by projecting data onto the top principal components,
 * which are the eigenvectors of the covariance matrix sorted by descending eigenvalue.
 *
 * @example
 * ```ts
 * const pca = new PCA({ nComponents: 2 })
 * pca.fit(X)
 * const Xr = pca.transform(X)
 * ```
 */
export class PCA {
  private nc: number
  private mn: number[] = []
  private comp: number[][] = []
  private ev: number[] = []
  private f = false

  /**
   * @param o - Options
   * @param o.nComponents - Number of components to keep (default: all)
   */
  constructor(o?: { nComponents?: number }) {
    this.nc = o?.nComponents ?? 0
  }

  /**
   * Fit PCA on data X.
   * @param X - Training data, shape (n_samples, n_features)
   * @returns This instance
   */
  fit(X: number[][]): this {
    const n = X.length
    if (!n) throw Error('PCA.fit: empty data')
    const p = X[0]!.length
    if (!p) throw Error('PCA.fit: zero features')
    const nComp = this.nc > 0 ? Math.min(this.nc, p) : p

    // Center data
    this.mn = new Array(p).fill(0)
    for (let j = 0; j < p; j++) {
      let s = 0
      for (let i = 0; i < n; i++) s += X[i]![j]!
      this.mn[j] = s / n
    }

    const Xc = X.map((r) => r.map((v, j) => v - this.mn[j]!))

    // Covariance matrix: C = (1/(n-1)) * Xc^T * Xc
    const denom = n > 1 ? n - 1 : 1
    const C = Array.from({ length: p }, () => new Array(p).fill(0))
    for (let i = 0; i < p; i++) {
      for (let j = i; j < p; j++) {
        let s = 0
        for (let k = 0; k < n; k++) s += Xc[k]![i]! * Xc[k]![j]!
        C[i]![j] = s / denom
        if (i !== j) C[j]![i] = s / denom
      }
    }

    // Eigendecomposition via cyclic Jacobi
    const { eigenvalues, eigenvectors } = cyclicJacobi(C)

    // Store results
    this.ev = eigenvalues.slice(0, nComp)
    this.comp = eigenvectors.slice(0, nComp)
    this.f = true
    return this
  }

  /**
   * Apply dimensionality reduction to X.
   * @param X - Data, shape (n_samples, n_features)
   * @returns Transformed data, shape (n_samples, n_components)
   */
  transform(X: number[][]): number[][] {
    if (!this.f) throw Error('PCA: must fit before transform')
    const p = this.mn.length
    return X.map((r) => {
      const centered = r.map((v, j) => v - this.mn[j]!)
      return this.comp.map((comp) => {
        let s = 0
        for (let j = 0; j < p; j++) s += centered[j]! * comp[j]!
        return s
      })
    })
  }

  /**
   * Fit PCA and transform X in one step.
   * @param X - Training data, shape (n_samples, n_features)
   * @returns Transformed data, shape (n_samples, n_components)
   */
  fitTransform(X: number[][]): number[][] {
    return this.fit(X).transform(X)
  }

  /** Explained variance for each component. */
  get explainedVariance_(): number[] {
    return this.ev
  }

  /** Principal components (eigenvectors), each row is a component. */
  get components_(): number[][] {
    return this.comp
  }

  /** Mean of each feature used for centering. */
  get mean_(): number[] {
    return this.mn
  }

  /** Number of components. */
  get nComponents_(): number {
    return this.comp.length
  }
}

/**
 * Cyclic Jacobi eigendecomposition for symmetric matrices.
 * Returns eigenvalues (descending) and corresponding eigenvectors (rows).
 */
function cyclicJacobi(A: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = A.length

  // Working copy
  const M = A.map((r) => [...r])

  // Eigenvector matrix (identity)
  const V = Array.from({ length: n }, (_, i) => {
    const row = new Array(n).fill(0)
    row[i] = 1
    return row
  })

  const tol = 1e-12
  const maxSweeps = 20

  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let maxOff = 0

    // One sweep: visit every off-diagonal pair once
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const Apq = M[p]![q]!
        const absA = Math.abs(Apq)
        if (absA > maxOff) maxOff = absA

        if (absA < tol) continue

        const App = M[p]![p]!
        const Aqq = M[q]![q]!

        // Compute rotation angle: tan(2θ) = 2*Apq / (App - Aqq)
        const theta = 0.5 * Math.atan2(2 * Apq, App - Aqq)
        const c = Math.cos(theta)
        const s = Math.sin(theta)

        // Update diagonal elements
        const AppNew = c * c * App + s * s * Aqq - 2 * s * c * Apq
        const AqqNew = s * s * App + c * c * Aqq + 2 * s * c * Apq

        M[p]![p] = AppNew
        M[q]![q] = AqqNew
        M[p]![q] = 0
        M[q]![p] = 0

        // Update remaining rows/columns
        for (let r = 0; r < n; r++) {
          if (r === p || r === q) continue
          const Aip = M[r]![p]!
          const Aiq = M[r]![q]!
          M[r]![p] = c * Aip - s * Aiq
          M[p]![r] = M[r]![p]!
          M[r]![q] = s * Aip + c * Aiq
          M[q]![r] = M[r]![q]!
        }

        // Update eigenvector matrix V = V * R
        for (let r = 0; r < n; r++) {
          const Vrp = V[r]![p]!
          const Vrq = V[r]![q]!
          V[r]![p] = c * Vrp - s * Vrq
          V[r]![q] = s * Vrp + c * Vrq
        }
      }
    }

    if (maxOff < tol) break
  }

  // Extract eigenvalues from diagonal
  const eigenvalues = new Array(n)
  for (let i = 0; i < n; i++) eigenvalues[i] = M[i]![i]!

  // Sort by eigenvalue descending
  const idx = eigenvalues.map((_, i) => i).sort((a, b) => eigenvalues[b]! - eigenvalues[a]!)

  const sortedVals = idx.map((i) => eigenvalues[i]!)

  // Eigenvectors as rows: eigvecs[component_index][feature_index]
  const sortedVecs = idx.map((compIdx) => {
    const vec = new Array(n)
    for (let r = 0; r < n; r++) vec[r] = V[r]![compIdx]!
    return vec
  })

  return { eigenvalues: sortedVals, eigenvectors: sortedVecs }
}
