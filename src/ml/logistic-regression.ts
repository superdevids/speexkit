/**
 * Logistic Regression for binary classification using IRLS (Iteratively Reweighted Least Squares).
 *
 * Uses the sigmoid link function and fits coefficients by iteratively solving
 * weighted least squares problems until convergence.
 *
 * @example
 * ```ts
 * const lr = new LogisticRegression({ fitIntercept: true, maxIter: 100 })
 * lr.fit(X, y)
 * const preds = lr.predict(X)
 * const probs = lr.predictProba(X)
 * ```
 */
export class LogisticRegression {
  private fi: boolean
  private mi: number
  private tol: number
  private coef: number[] = []
  private intc = 0
  private cls: number[] = []
  private f = false

  /**
   * @param o - Options
   * @param o.fitIntercept - Whether to include an intercept term (default: true)
   * @param o.maxIter - Maximum number of IRLS iterations (default: 100)
   * @param o.tol - Convergence tolerance (default: 1e-4)
   */
  constructor(o?: { fitIntercept?: boolean; maxIter?: number; tol?: number }) {
    this.fi = o?.fitIntercept ?? true
    this.mi = o?.maxIter ?? 100
    this.tol = o?.tol ?? 1e-4
  }

  /**
   * Fit the model on data X and binary labels y.
   * @param X - Training data, shape (n_samples, n_features)
   * @param y - Target labels, values in {0, 1}
   * @returns This instance
   */
  fit(X: number[][], y: number[]): this {
    const n = X.length
    if (!n) throw Error('LogisticRegression.fit: empty data')
    const p = X[0]!.length
    if (!p) throw Error('LogisticRegression.fit: zero features')

    this.cls = [...new Set(y)].sort((a, b) => a - b)

    const nCols = this.fi ? p + 1 : p
    const Xa = this.fi ? X.map((r) => [1, ...r]) : X.map((r) => [...r])

    // Initialize coefficients
    let beta = new Array(nCols).fill(0)
    const ridge = 1e-8

    for (let iter = 0; iter < this.mi; iter++) {
      // Compute linear predictor and probabilities
      const eta = new Array(n)
      const prob = new Array(n)
      for (let i = 0; i < n; i++) {
        let z = 0
        for (let j = 0; j < nCols; j++) z += Xa[i]![j]! * beta[j]!
        eta[i] = z
        prob[i] = sigmoid(z)
      }

      // Build weighted normal equations
      // X^T W X and X^T W z
      const XtWX = Array.from({ length: nCols }, () => new Array(nCols).fill(0))
      const XtWz = new Array(nCols).fill(0)

      for (let i = 0; i < n; i++) {
        const pv = prob[i]!
        const w = pv * (1 - pv) + 1e-15
        const z_i = eta[i]! + (y[i]! - pv) / w
        const sw = w

        for (let j = 0; j < nCols; j++) {
          XtWz[j] = XtWz[j]! + sw * Xa[i]![j]! * z_i
          for (let k = j; k < nCols; k++) {
            XtWX[j]![k] = XtWX[j]![k]! + sw * Xa[i]![j]! * Xa[i]![k]!
          }
        }
      }

      // Copy lower triangle
      for (let j = 0; j < nCols; j++) {
        for (let k = j + 1; k < nCols; k++) {
          XtWX[k]![j] = XtWX[j]![k]!
        }
      }

      // Add ridge regularization
      for (let j = 0; j < nCols; j++) {
        XtWX[j]![j] = XtWX[j]![j]! + ridge
      }

      // Solve (X^T W X) * beta_new = X^T W z
      const betaNew = solveLinear(XtWX, XtWz)

      // Check convergence
      let diff = 0
      for (let j = 0; j < nCols; j++) {
        const d = betaNew[j]! - beta[j]!
        diff += d * d
      }
      beta = betaNew
      if (Math.sqrt(diff) < this.tol) break
    }

    if (this.fi) {
      this.intc = beta[0]!
      this.coef = beta.slice(1)
    } else {
      this.intc = 0
      this.coef = beta
    }
    this.f = true
    return this
  }

  /**
   * Predict class labels for X.
   * @param X - Data, shape (n_samples, n_features)
   * @returns Predicted class labels, shape (n_samples,)
   */
  predict(X: number[][]): number[] {
    if (!this.f) throw Error('LogisticRegression: must fit before predict')
    return this.predictProba(X).map((p) => (p >= 0.5 ? 1 : 0))
  }

  /**
   * Predict class probabilities for X.
   * @param X - Data, shape (n_samples, n_features)
   * @returns Probability of class 1, shape (n_samples, 1)
   */
  predictProba(X: number[][]): number[] {
    if (!this.f) throw Error('LogisticRegression: must fit before predictProba')
    const p = this.coef.length
    return X.map((r) => {
      let z = this.intc
      for (let j = 0; j < p; j++) z += r[j]! * this.coef[j]!
      return sigmoid(z)
    })
  }

  /** Fitted coefficients (one per feature). */
  get coef_(): number[] {
    return this.coef
  }

  /** Intercept term. */
  get intercept_(): number {
    return this.intc
  }

  /** Unique class labels seen during fit. */
  get classes_(): number[] {
    return this.cls
  }
}

/** Sigmoid (logistic) function. */
function sigmoid(z: number): number {
  if (z > 36) return 1
  if (z < -36) return 0
  return 1 / (1 + Math.exp(-z))
}

/**
 * Solve linear system Ax = b using Gaussian elimination with partial pivoting.
 */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length
  const aug = A.map((r, i) => [...r, b[i]!])

  for (let c = 0; c < n; c++) {
    let maxVal = Math.abs(aug[c]![c]!)
    let maxRow = c
    for (let r = c + 1; r < n; r++) {
      const v = Math.abs(aug[r]![c]!)
      if (v > maxVal) {
        maxVal = v
        maxRow = r
      }
    }
    if (maxVal < 1e-14) throw Error('LogisticRegression: singular system encountered during IRLS')
    if (maxRow !== c) {
      const tmp = aug[c]
      aug[c] = aug[maxRow]!
      aug[maxRow] = tmp!
    }
    const piv = aug[c]![c]!
    for (let r = c + 1; r < n; r++) {
      const f = aug[r]![c]! / piv
      for (let j = c; j <= n; j++) aug[r]![j] = aug[r]![j]! - f * aug[c]![j]!
    }
  }

  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = aug[i]![n]!
    for (let j = i + 1; j < n; j++) s -= aug[i]![j]! * x[j]!
    x[i] = s / aug[i]![i]!
  }
  return x
}
