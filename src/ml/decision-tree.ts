/**
 * Decision Tree — CART (Classification and Regression Trees) classifier.
 *
 * Supports Gini impurity and entropy split criteria with configurable
 * depth, sample, and leaf constraints.  Provides feature importance
 * scores derived from impurity reduction.
 *
 * @example
 * ```ts
 * const dt = new DecisionTreeClassifier({ maxDepth: 3, criterion: 'gini' })
 * dt.fit(X, y)
 * const preds = dt.predict(X)
 * const probs = dt.predictProba(X)
 * ```
 */

export interface TreeNode {
  /** Feature index used for split (undefined for leaf) */
  featureIndex?: number
  /** Threshold value for the split (undefined for leaf) */
  threshold?: number
  /** Left child (feature <= threshold) */
  left?: TreeNode
  /** Right child */
  right?: TreeNode
  /** Predicted class (leaf only) */
  value?: number
  /** Class probabilities (leaf only) */
  probability?: number[]
  /** Gini / entropy value at this node */
  impurity?: number
  /** Number of training samples at this node */
  sampleCount?: number
}

export class DecisionTreeClassifier {
  private md: number | null
  private mss: number
  private msl: number
  private crit: 'gini' | 'entropy'
  private cls: number[] = []
  private nC = 0
  private nF = 0
  private root: TreeNode | null = null
  private impR: number[] = []
  private f = false

  /**
   * @param o - Configuration options
   * @param o.maxDepth - Maximum tree depth (default: null = unlimited)
   * @param o.minSamplesSplit - Minimum samples required to split (default: 2)
   * @param o.minSamplesLeaf - Minimum samples required in a leaf (default: 1)
   * @param o.criterion - Split quality metric (default: 'gini')
   */
  constructor(o?: {
    maxDepth?: number
    minSamplesSplit?: number
    minSamplesLeaf?: number
    criterion?: 'gini' | 'entropy'
  }) {
    this.md = o?.maxDepth ?? null
    this.mss = o?.minSamplesSplit ?? 2
    this.msl = o?.minSamplesLeaf ?? 1
    this.crit = o?.criterion ?? 'gini'
  }

  /**
   * Fit the decision tree on training data.
   * @param X - Training data, shape (n_samples, n_features)
   * @param y - Target labels, shape (n_samples,)
   */
  fit(X: number[][], y: number[]): this {
    const n = X.length
    if (!n) throw Error('DecisionTreeClassifier.fit: empty data')
    const p = X[0]!.length
    if (!p) throw Error('DecisionTreeClassifier.fit: zero features')
    if (y.length !== n) throw Error('DecisionTreeClassifier.fit: X and y length mismatch')

    this.cls = [...new Set(y)].sort((a, b) => a - b)
    this.nC = this.cls.length
    this.nF = p
    this.impR = new Array(p).fill(0)
    this.root = null

    const yNum = y.map((v) => {
      const idx = this.cls.indexOf(v)
      if (idx === -1) throw Error(`DecisionTreeClassifier.fit: unknown class ${v}`)
      return idx
    })

    const indices = Array.from({ length: n }, (_, i) => i)
    this.root = this.buildTree(X, yNum, indices, 0, this.impR)
    this.f = true
    return this
  }

  /**
   * Predict class labels for X.
   * @param X - Data, shape (n_samples, n_features)
   * @returns Predicted class labels, shape (n_samples,)
   */
  predict(X: number[][]): number[] {
    if (!this.f) throw Error('DecisionTreeClassifier: must fit before predict')
    return X.map((x) => {
      const leaf = this.traverse(x)
      return this.cls[leaf.value!]!
    })
  }

  /**
   * Predict class probabilities for X.
   * @param X - Data, shape (n_samples, n_features)
   * @returns Probability per class, shape (n_samples, n_classes)
   */
  predictProba(X: number[][]): number[][] {
    if (!this.f) throw Error('DecisionTreeClassifier: must fit before predictProba')
    return X.map((x) => {
      const leaf = this.traverse(x)
      return leaf.probability!
    })
  }

  /** Unique classes seen during fit. */
  get classes_(): number[] {
    return this.cls
  }

  /** Number of unique classes. */
  get nClasses_(): number {
    return this.nC
  }

  /**
   * Normalized feature importances (higher = more important).
   * Each feature's total impurity reduction is divided by the sum
   * over all features.
   */
  get featureImportances_(): number[] {
    const total = this.impR.reduce((a, b) => a + b, 0)
    if (total === 0) return new Array(this.nF).fill(0)
    return this.impR.map((v) => v / total)
  }

  /** Root of the fitted tree (can be inspected). */
  get tree_(): TreeNode | null {
    return this.root
  }

  // ── private helpers ──────────────────────────────────────

  private impurity(counts: number[], total: number): number {
    if (total === 0) return 0
    if (this.crit === 'entropy') {
      let h = 0
      for (const c of counts) {
        if (c > 0) {
          const p = c / total
          h -= p * Math.log2(p)
        }
      }
      return h
    }
    // gini
    let g = 1
    for (const c of counts) {
      const p = c / total
      g -= p * p
    }
    return g
  }

  private buildTree(X: number[][], y: number[], indices: number[], depth: number, impR: number[]): TreeNode {
    const n = indices.length
    const counts = new Array(this.nC).fill(0)
    for (const i of indices) counts[y[i]!]!++

    let majority = 0
    let maxC = 0
    for (let c = 0; c < this.nC; c++) {
      if (counts[c]! > maxC) {
        maxC = counts[c]!
        majority = c
      }
    }

    const nodeImp = this.impurity(counts, n)

    const isPure = nodeImp < 1e-15
    const reachedDepth = this.md !== null && depth >= this.md
    const tooFew = n < this.mss

    if (isPure || reachedDepth || tooFew) {
      return {
        value: majority,
        probability: counts.map((c) => c / n),
        impurity: nodeImp,
        sampleCount: n,
      }
    }

    const best = this.findBestSplit(X, y, indices, counts, n, nodeImp)
    if (!best) {
      return {
        value: majority,
        probability: counts.map((c) => c / n),
        impurity: nodeImp,
        sampleCount: n,
      }
    }

    const leftIdx: number[] = []
    const rightIdx: number[] = []
    for (const i of indices) {
      if (X[i]![best.feat]! <= best.thresh) {
        leftIdx.push(i)
      } else {
        rightIdx.push(i)
      }
    }

    impR[best.feat] = (impR[best.feat] ?? 0) + best.gain * n

    const left = this.buildTree(X, y, leftIdx, depth + 1, impR)
    const right = this.buildTree(X, y, rightIdx, depth + 1, impR)

    return {
      featureIndex: best.feat,
      threshold: best.thresh,
      left,
      right,
      impurity: nodeImp,
      sampleCount: n,
    }
  }

  private findBestSplit(
    X: number[][],
    y: number[],
    indices: number[],
    parentCounts: number[],
    n: number,
    parentImp: number,
  ): { feat: number; thresh: number; gain: number } | null {
    let bestFeat = -1
    let bestThresh = 0
    let bestGain = -1

    for (let f = 0; f < this.nF; f++) {
      const sorted = indices.map((i) => ({ val: X[i]![f]!, idx: i })).sort((a, b) => a.val - b.val)

      const leftCounts = new Array(this.nC).fill(0)
      let leftTotal = 0

      for (let j = 0; j < n - 1; j++) {
        const lbl = y[sorted[j]!.idx]!
        leftCounts[lbl]!++
        leftTotal++

        const rightTotal = n - leftTotal

        if (leftTotal < this.msl || rightTotal < this.msl) continue

        const curVal = sorted[j]!.val
        const nextVal = sorted[j + 1]!.val
        if (curVal === nextVal) continue

        const threshold = (curVal + nextVal) / 2

        const rightCounts = new Array(this.nC).fill(0)
        for (let c = 0; c < this.nC; c++) {
          rightCounts[c] = parentCounts[c]! - leftCounts[c]!
        }

        const leftImp = this.impurity(leftCounts, leftTotal)
        const rightImp = this.impurity(rightCounts, rightTotal)
        const gain = parentImp - (leftTotal / n) * leftImp - (rightTotal / n) * rightImp

        if (gain > bestGain) {
          bestGain = gain
          bestFeat = f
          bestThresh = threshold
        }
      }
    }

    if (bestFeat === -1) return null
    return { feat: bestFeat, thresh: bestThresh, gain: bestGain }
  }

  private traverse(x: number[]): TreeNode {
    let node = this.root!
    while (node.featureIndex !== undefined) {
      if (x[node.featureIndex]! <= node.threshold!) {
        node = node.left!
      } else {
        node = node.right!
      }
    }
    return node
  }
}
