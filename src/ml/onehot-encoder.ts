/**
 * OneHotEncoder for converting categorical features into binary columns.
 *
 * Each categorical column is expanded into one binary column per unique category.
 * Supports dropping the first category per feature to avoid multicollinearity.
 *
 * @example
 * ```ts
 * const enc = new OneHotEncoder({ drop: 'first' })
 * enc.fit([['red', 'small'], ['blue', 'large']])
 * const encoded = enc.transform([['red', 'large']])
 * ```
 */
export class OneHotEncoder {
  private d: 'first' | null
  private cats: Map<number, string[]> = new Map()
  private colOffsets: number[] = []
  private totalCols = 0
  private f = false

  /**
   * @param o - Options
   * @param o.sparseOutput - Not supported; dense output always (default: false)
   * @param o.drop - If 'first', drops the first category of each feature (default: null)
   */
  constructor(o?: { sparseOutput?: boolean; drop?: 'first' | null }) {
    this.d = o?.drop ?? null
    if (o?.sparseOutput) throw Error('OneHotEncoder: sparseOutput not supported, use dense')
  }

  /**
   * Fit the encoder on data X.
   * @param X - Categorical data, shape (n_samples, n_features)
   * @returns This instance
   */
  fit(X: (string | number)[][]): this {
    const n = X.length
    if (!n) throw Error('OneHotEncoder.fit: empty data')
    const p = X[0]!.length
    if (!p) throw Error('OneHotEncoder.fit: zero features')

    this.cats = new Map()

    for (let j = 0; j < p; j++) {
      const unique = new Set<string | number>()
      for (let i = 0; i < n; i++) unique.add(X[i]![j]!)
      const sorted = [...unique].map(String).sort()
      this.cats.set(j, sorted)
    }

    this._computeOffsets(p)
    this.f = true
    return this
  }

  /**
   * Transform categorical data into one-hot encoded binary matrix.
   * @param X - Categorical data, shape (n_samples, n_features)
   * @returns Binary matrix, shape (n_samples, n_encoded_features)
   */
  transform(X: (string | number)[][]): number[][] {
    if (!this.f) throw Error('OneHotEncoder: must fit before transform')
    const p = this.cats.size
    return X.map((row) => {
      const result = new Array(this.totalCols).fill(0)
      for (let j = 0; j < p; j++) {
        const val = String(row[j]!)
        const cats = this.cats.get(j)!
        const start = this.colOffsets[j]!
        if (this.d === 'first') {
          const idx = cats.indexOf(val)
          if (idx > 0) result[start + idx - 1] = 1
        } else {
          const idx = cats.indexOf(val)
          if (idx >= 0) result[start + idx] = 1
        }
      }
      return result
    })
  }

  /**
   * Fit and transform in one step.
   * @param X - Categorical data, shape (n_samples, n_features)
   * @returns Binary matrix, shape (n_samples, n_encoded_features)
   */
  fitTransform(X: (string | number)[][]): number[][] {
    return this.fit(X).transform(X)
  }

  /**
   * Inverse transform: convert binary columns back to categorical values.
   * @param X - Binary matrix, shape (n_samples, n_encoded_features)
   * @returns Categorical data, shape (n_samples, n_features)
   */
  inverseTransform(X: number[][]): (string | number)[][] {
    if (!this.f) throw Error('OneHotEncoder: must fit before inverseTransform')
    const p = this.cats.size
    return X.map((row) => {
      const result: (string | number)[] = new Array(p)
      for (let j = 0; j < p; j++) {
        const cats = this.cats.get(j)!
        const start = this.colOffsets[j]!
        const nCats = this.d === 'first' ? cats.length - 1 : cats.length
        let found = -1
        for (let k = 0; k < nCats; k++) {
          if (row[start + k]! === 1) {
            found = k
            break
          }
        }
        if (found < 0) {
          if (this.d !== 'first') {
            throw Error(`OneHotEncoder: no active category found for feature ${j}`)
          }
        }
        const catIdx = this.d === 'first' ? found + 1 : found
        result[j] = cats[catIdx]!
      }
      return result
    })
  }

  /** Unique categories per feature (as strings). */
  get categories_(): Map<number, string[]> {
    return this.cats
  }

  private _computeOffsets(p: number): void {
    this.colOffsets = new Array(p)
    this.totalCols = 0
    for (let j = 0; j < p; j++) {
      this.colOffsets[j] = this.totalCols
      const nCats = this.cats.get(j)!.length
      this.totalCols += this.d === 'first' ? nCats - 1 : nCats
    }
  }
}
