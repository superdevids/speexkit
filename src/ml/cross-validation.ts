/**
 * Cross-validation utilities for evaluating estimator performance.
 *
 * Provides K-Fold index splitting and cross-val-score evaluation.
 *
 * @example
 * ```ts
 * // K-Fold iterator
 * for (const { trainIndices, testIndices } of kFold(X, y, 5)) {
 *   // use indices to split data
 * }
 *
 * // Cross-val scoring
 * const scores = crossValScore(estimator, X, y, { cv: 5, scoring: 'accuracy' })
 * ```
 */

export interface EstimatorLike {
  fit(X: number[][], y: number[]): void
  predict(X: number[][]): number[]
}

export interface KFoldResult {
  trainIndices: number[]
  testIndices: number[]
}

/**
 * Generate K-Fold cross-validation indices.
 *
 * @param X - Data array (used only for length)
 * @param y - Label array (used only for length)
 * @param nSplits - Number of folds (default: 5)
 * @param shuffle - Whether to shuffle indices before splitting (default: false)
 * @param randomState - Seed for reproducible shuffling
 * @yields Objects with trainIndices and testIndices arrays
 */
export function* kFold(X: unknown[], _y: unknown[], nSplits = 5, shuffle?: boolean, randomState?: number): Generator<KFoldResult> {
  const n = X.length
  if (!n) throw Error('kFold: empty data')
  if (nSplits < 2) throw Error('kFold: nSplits must be >= 2')
  if (nSplits > n) nSplits = n

  const indices = Array.from({ length: n }, (_, i) => i)

  if (shuffle) {
    let s = randomState ?? Date.now()
    const r = () => {
      s |= 0
      s = (s + 0x6d2b79f5) | 0
      let t = Math.imul(s ^ (s >>> 15), 1 | s)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j]!, indices[i]!]
    }
  }

  const foldSize = Math.floor(n / nSplits)
  const remainder = n % nSplits

  let start = 0
  for (let fold = 0; fold < nSplits; fold++) {
    const extra = fold < remainder ? 1 : 0
    const testSize = foldSize + extra
    const testIndices = indices.slice(start, start + testSize)
    const trainIndices = [...indices.slice(0, start), ...indices.slice(start + testSize)]
    yield { trainIndices, testIndices }
    start += testSize
  }
}

export interface CrossValOptions {
  /** Number of folds (default: 5) */
  cv?: number
  /** Scoring metric (default: 'accuracy') */
  scoring?: 'accuracy' | 'r2' | 'negMeanSquaredError'
  /** Whether to shuffle before splitting (default: false) */
  shuffle?: boolean
  /** Random seed for shuffling */
  randomState?: number
}

/**
 * Compute cross-validation scores for an estimator.
 *
 * @param estimator - Object with fit(X, y) and predict(X) methods
 * @param X - Feature data, shape (n_samples, n_features)
 * @param y - Target labels, shape (n_samples,)
 * @param options - Cross-validation options
 * @returns Array of scores, one per fold
 */
export function crossValScore(estimator: EstimatorLike, X: number[][], y: number[], options?: CrossValOptions): number[] {
  const nSplits = options?.cv ?? 5
  const scoring = options?.scoring ?? 'accuracy'
  const scores: number[] = []

  for (const { trainIndices, testIndices } of kFold(X, y, nSplits, options?.shuffle, options?.randomState)) {
    const XTrain = trainIndices.map((i) => [...X[i]!])
    const yTrain = trainIndices.map((i) => y[i]!)
    const XTest = testIndices.map((i) => [...X[i]!])
    const yTest = testIndices.map((i) => y[i]!)

    estimator.fit(XTrain, yTrain)
    const yPred = estimator.predict(XTest)

    switch (scoring) {
      case 'accuracy': {
        let correct = 0
        for (let i = 0; i < yTest.length; i++) {
          if (yTest[i] === yPred[i]) correct++
        }
        scores.push(correct / yTest.length)
        break
      }
      case 'r2': {
        const meanY = yTest.reduce((a, b) => a + b, 0) / yTest.length
        let ssRes = 0
        let ssTot = 0
        for (let i = 0; i < yTest.length; i++) {
          ssRes += (yTest[i]! - yPred[i]!) ** 2
          ssTot += (yTest[i]! - meanY) ** 2
        }
        scores.push(ssTot === 0 ? (ssRes === 0 ? 1 : 0) : 1 - ssRes / ssTot)
        break
      }
      case 'negMeanSquaredError': {
        let sse = 0
        for (let i = 0; i < yTest.length; i++) {
          sse += (yTest[i]! - yPred[i]!) ** 2
        }
        scores.push(-sse / yTest.length)
        break
      }
    }
  }

  return scores
}
