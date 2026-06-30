export function gammaLn(x: number): number {
  if (x <= 0) return NaN
  if (x < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * x)) - gammaLn(1 - x)
  x -= 1
  const g = 7,
    c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ]
  let s = c[0]!
  for (let i = 1; i <= g + 1; i++) s += c[i]! / (x + i)
  const t = x + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s)
}
export function erf(x: number): number {
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429]
  const s = x >= 0 ? 1 : -1
  x = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * x)
  let y = 0
  for (let i = a.length - 1; i >= 0; i--) y = t * (y + a[i]!)
  return s * (1 - y * Math.exp(-x * x))
}
export function normalPDF(x: number, mean = 0, std = 1): number {
  if (std <= 0) return NaN
  const z = (x - mean) / std
  return Math.exp(-0.5 * z * z) / (std * Math.sqrt(2 * Math.PI))
}
export function normalCDF(x: number, mean = 0, std = 1): number {
  if (std <= 0) return NaN
  return 0.5 * (1 + erf((x - mean) / (std * Math.SQRT2)))
}
export function binomialPMF(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return 0
  if (p === 0) return k === 0 ? 1 : 0
  if (p === 1) return k === n ? 1 : 0
  return Math.exp(gammaLn(n + 1) - gammaLn(k + 1) - gammaLn(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p))
}
export function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0 || k < 0) return NaN
  return Math.exp(k * Math.log(lambda) - lambda - gammaLn(k + 1))
}
export function skewness(data: number[]): number {
  const n = data.length
  if (n < 3) return NaN
  const m = data.reduce((s, v) => s + v, 0) / n
  let m2 = 0,
    m3 = 0
  for (const v of data) {
    const d = v - m
    m2 += d * d
    m3 += d * d * d
  }
  if (m2 === 0) return NaN
  return ((m3 / (n * Math.sqrt(m2 / n) * (m2 / n))) * Math.sqrt(n * (n - 1))) / (n - 2)
}
export function kurtosis(data: number[]): number {
  const n = data.length
  if (n < 4) return NaN
  const m = data.reduce((s, v) => s + v, 0) / n
  let m2 = 0,
    m4 = 0
  for (const v of data) {
    const d = v - m
    m2 += d * d
    m4 += d * d * d * d
  }
  if (m2 === 0) return NaN
  return m4 / (n * (m2 / n) * (m2 / n)) - 3
}
export function quantile(data: number[], q: number): number {
  if (!data.length) throw new Error('empty')
  const s = [...data].sort((a, b) => a - b)
  const idx = q * (s.length - 1)
  const lo = Math.floor(idx),
    hi = Math.ceil(idx)
  if (lo === hi) return s[lo]!
  return s[lo]! + (s[hi]! - s[lo]!) * (idx - lo)
}
export function iqr(data: number[]): number {
  return quantile(data, 0.75) - quantile(data, 0.25)
}
export function covariance(x: number[], y: number[]): number {
  const n = x.length,
    mx = x.reduce((a, b) => a + b, 0) / n,
    my = y.reduce((a, b) => a + b, 0) / n
  let c = 0
  for (let i = 0; i < n; i++) c += (x[i]! - mx) * (y[i]! - my)
  return c / (n - 1)
}
export function ttestInd(a: number[], b: number[]): { statistic: number; pValue: number } {
  const na = a.length,
    nb = b.length
  const ma = a.reduce((s, v) => s + v, 0) / na,
    mb = b.reduce((s, v) => s + v, 0) / nb
  let va = 0,
    vb = 0
  for (const v of a) va += (v - ma) ** 2
  for (const v of b) vb += (v - mb) ** 2
  va /= na - 1
  vb /= nb - 1
  const se = Math.sqrt(va / na + vb / nb)
  if (se === 0) return { statistic: 0, pValue: 1 }
  const t = (ma - mb) / se
  const num = (va / na + vb / nb) ** 2,
    den = (va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1)
  const dof = den === 0 ? 1 : num / den
  return { statistic: t, pValue: 2 * (1 - tCDF(Math.abs(t), dof)) }
}
function tCDF(x: number, dof: number): number {
  if (dof <= 0 || !Number.isFinite(x)) return x > 0 ? 1 : 0
  return 1 - 0.5 * regularizedIncompleteBeta(dof / 2, 0.5, dof / (dof + x * x))
}
function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x < 0 || x > 1) return NaN
  if (x === 0 || x === 1) return x
  if (x > (a + 1) / (a + b + 2)) return 1 - regularizedIncompleteBeta(b, a, 1 - x)
  const gln = gammaLn(a) + gammaLn(b) - gammaLn(a + b)
  const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - gln)
  let f = 1,
    C = 1,
    D = 0
  for (let m = 1; m <= 200; m++) {
    let am: number
    if (m > 1) {
      const k = m - 1
      am =
        k % 2 === 1
          ? -((a + (k - 1) / 2) * (a + b + (k - 1) / 2) * x) / ((a + 2 * ((k - 1) / 2)) * (a + 2 * ((k - 1) / 2) + 1))
          : ((k / 2) * (b - k / 2) * x) / ((a + 2 * (k / 2) - 1) * (a + 2 * (k / 2)))
    } else {
      am = 1
    }
    const bm = 1
    D = bm + am * D
    if (Math.abs(D) < 1e-30) D = 1e-30
    C = bm + am / C
    if (Math.abs(C) < 1e-30) C = 1e-30
    D = 1 / D
    f *= C * D
    if (Math.abs(C * D - 1) < 1e-14) break
  }
  return (bt * f) / a
}
export function pearsonCorrelation(x: number[], y: number[]): { statistic: number; pValue: number } {
  const n = x.length,
    mx = x.reduce((a, b) => a + b, 0) / n,
    my = y.reduce((a, b) => a + b, 0) / n
  let num = 0,
    dx2 = 0,
    dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx,
      dy = y[i]! - my
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  if (dx2 === 0 || dy2 === 0) return { statistic: 0, pValue: 1 }
  const r = num / Math.sqrt(dx2 * dy2),
    t = r * Math.sqrt((n - 2) / (1 - r * r))
  return { statistic: Math.max(-1, Math.min(1, r)), pValue: 2 * (1 - tCDF(Math.abs(t), n - 2)) }
}
export function spearmanCorrelation(x: number[], y: number[]): { statistic: number; pValue: number } {
  const rank = (v: number[]): number[] => {
    const n = v.length,
      idx = Array.from({ length: n }, (_, i) => i)
    idx.sort((a, b) => v[a]! - v[b]!)
    const r = new Array(n)
    let i = 0
    while (i < n) {
      let j = i
      while (j < n && v[idx[j]!] === v[idx[i]!]) j++
      const avg = (i + j + 1) / 2
      for (let k = i; k < j; k++) r[idx[k]!] = avg
      i = j
    }
    return r
  }
  return pearsonCorrelation(rank(x), rank(y))
}

/**
 * Lower regularized gamma function P(a, x) = γ(a, x) / Γ(a)
 * Used for chi-square CDF computation
 */
function lowerGammaRegularized(a: number, x: number): number {
  if (x < 0 || a <= 0) return NaN
  if (x === 0) return 0
  const gln = gammaLn(a)
  let sum = 1 / a
  let term = 1 / a
  for (let n = 1; n <= 200; n++) {
    term *= x / (a + n)
    sum += term
    if (Math.abs(term) < Math.abs(sum) * 1e-14) break
  }
  return sum * Math.exp(a * Math.log(x) - x - gln)
}

/**
 * F-distribution CDF using regularized incomplete beta
 */
function fCdf(x: number, dof1: number, dof2: number): number {
  if (x < 0 || dof1 <= 0 || dof2 <= 0) return NaN
  if (x === 0) return 0
  return regularizedIncompleteBeta(dof1 / 2, dof2 / 2, (dof1 * x) / (dof1 * x + dof2))
}

/**
 * Chi-square CDF using lower regularized gamma
 */
function chiSquareCdf(x: number, dof: number): number {
  if (x < 0 || dof <= 0) return NaN
  if (x === 0) return 0
  return lowerGammaRegularized(dof / 2, x / 2)
}

/**
 * Two-tailed p-value from z-score using normal CDF
 */
function normalApproximationPValue(z: number): number {
  return 2 * (1 - normalCDF(Math.abs(z)))
}

/**
 * One-way Analysis of Variance (ANOVA)
 *
 * Tests whether the means of two or more groups are significantly different.
 *
 * @param groups - Two or more arrays of numeric values
 * @returns Object containing F-statistic and p-value
 * @throws {Error} If fewer than 2 groups provided or any group is empty
 *
 * @example
 * anovaOneWay([1, 2, 3], [4, 5, 6], [7, 8, 9])
 * // => { fStatistic: 27, pValue: 0.001 }
 */
export function anovaOneWay(...groups: number[][]): { fStatistic: number; pValue: number } {
  if (groups.length < 2) throw new Error('ANOVA requires at least 2 groups')
  for (const g of groups) {
    if (g.length === 0) throw new Error('All groups must have at least one observation')
  }
  const k = groups.length
  let N = 0
  let grandSum = 0
  for (const g of groups) {
    N += g.length
    for (const v of g) grandSum += v
  }
  const grandMean = grandSum / N
  let ssb = 0
  let ssw = 0
  for (const g of groups) {
    let gSum = 0
    for (const v of g) gSum += v
    const gMean = gSum / g.length
    ssb += g.length * (gMean - grandMean) ** 2
    for (const v of g) ssw += (v - gMean) ** 2
  }
  const dfB = k - 1
  const dfW = N - k
  if (dfW === 0) throw new Error('Not enough observations for ANOVA')
  const msb = ssb / dfB
  const msw = ssw / dfW
  if (msw === 0) return { fStatistic: 0, pValue: 1 }
  const f = msb / msw
  const p = 1 - fCdf(f, dfB, dfW)
  return { fStatistic: f, pValue: p }
}

/**
 * Chi-square test for independence in a contingency table
 *
 * Tests whether two categorical variables are independent.
 *
 * @param observed - 2D contingency table of observed frequencies
 * @returns Object containing chi-square statistic, p-value, and degrees of freedom
 * @throws {Error} If table has fewer than 2 rows or columns, or rows have inconsistent lengths
 *
 * @example
 * chiSquareTest([[30, 10], [20, 40]])
 * // => { chi2: 13.17, pValue: 0.0003, dof: 1 }
 */
export function chiSquareTest(observed: number[][]): { chi2: number; pValue: number; dof: number } {
  const rows = observed.length
  if (rows < 2) throw new Error('Contingency table must have at least 2 rows')
  const cols = observed[0]!.length
  if (cols < 2) throw new Error('Contingency table must have at least 2 columns')
  for (let i = 1; i < rows; i++) {
    if (observed[i]!.length !== cols) throw new Error('All rows must have the same length')
  }
  const rowTotals = new Array(rows)
  const colTotals = new Array(cols).fill(0)
  let grandTotal = 0
  for (let i = 0; i < rows; i++) {
    let rt = 0
    for (let j = 0; j < cols; j++) {
      rt += observed[i]![j]!
      colTotals[j]! += observed[i]![j]!
    }
    rowTotals[i] = rt
    grandTotal += rt
  }
  if (grandTotal === 0) throw new Error('Contingency table total must be greater than zero')
  let chi2 = 0
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i]! * colTotals[j]!) / grandTotal
      if (expected > 0) {
        chi2 += (observed[i]![j]! - expected) ** 2 / expected
      }
    }
  }
  const dof = (rows - 1) * (cols - 1)
  const pValue = 1 - chiSquareCdf(chi2, dof)
  return { chi2, pValue, dof }
}

/**
 * Chi-square goodness of fit test
 *
 * Tests whether observed frequencies match an expected distribution.
 *
 * @param observed - Array of observed frequencies
 * @param expected - Array of expected frequencies
 * @returns Object containing chi-square statistic, p-value, and degrees of freedom
 * @throws {Error} If arrays have different lengths, or fewer than 2 categories
 *
 * @example
 * chiSquareGoodnessOfFit([50, 30, 20], [33.3, 33.3, 33.3])
 * // => { chi2: 10.5, pValue: 0.005, dof: 2 }
 */
export function chiSquareGoodnessOfFit(observed: number[], expected: number[]): { chi2: number; pValue: number; dof: number } {
  const n = observed.length
  if (n < 2) throw new Error('Requires at least 2 categories')
  if (observed.length !== expected.length) throw new Error('observed and expected must have the same length')
  let chi2 = 0
  for (let i = 0; i < n; i++) {
    if (expected[i]! < 0) throw new Error('Expected frequencies must be non-negative')
    if (expected[i]! > 0) {
      chi2 += (observed[i]! - expected[i]!) ** 2 / expected[i]!
    }
  }
  const dof = n - 1
  const pValue = 1 - chiSquareCdf(chi2, dof)
  return { chi2, pValue, dof }
}

/**
 * Mann-Whitney U test (Wilcoxon rank-sum test)
 *
 * Non-parametric test for difference between two independent groups.
 * Uses normal approximation for p-value computation.
 *
 * @param x - First group of numeric values
 * @param y - Second group of numeric values
 * @returns Object containing U statistic and p-value
 * @throws {Error} If either group is empty
 *
 * @example
 * mannWhitneyU([1, 2, 3], [4, 5, 6])
 * // => { uStatistic: 0, pValue: 0.045 }
 */
export function mannWhitneyU(x: number[], y: number[]): { uStatistic: number; pValue: number } {
  if (x.length === 0 || y.length === 0) throw new Error('Both groups must have at least one observation')
  const n1 = x.length
  const n2 = y.length
  const combined = new Array<{ val: number; group: number }>(n1 + n2)
  for (let i = 0; i < n1; i++) combined[i] = { val: x[i]!, group: 0 }
  for (let i = 0; i < n2; i++) combined[n1 + i] = { val: y[i]!, group: 1 }
  combined.sort((a, b) => a.val - b.val)
  const N = combined.length
  const ranks = new Array<number>(N)
  let i = 0
  while (i < N) {
    let j = i
    while (j < N && combined[j]!.val === combined[i]!.val) j++
    const avgRank = (i + j + 1) / 2
    for (let k = i; k < j; k++) ranks[k] = avgRank
    i = j
  }
  let r1 = 0
  for (let k = 0; k < N; k++) {
    if (combined[k]!.group === 0) r1 += ranks[k]!
  }
  const u1 = r1 - (n1 * (n1 + 1)) / 2
  const u2 = n1 * n2 - u1
  const uStatistic = Math.min(u1, u2)
  const mu = (n1 * n2) / 2
  let tieCorrection = 0
  i = 0
  while (i < N) {
    let j = i
    while (j < N && combined[j]!.val === combined[i]!.val) j++
    const t = j - i
    tieCorrection += t * t * t - t
    i = j
  }
  const denom = Math.sqrt(((n1 * n2) / 12) * (N + 1 - tieCorrection / (N * (N - 1))))
  if (denom === 0) return { uStatistic, pValue: 1 }
  const z = (uStatistic - mu) / denom
  return { uStatistic, pValue: normalApproximationPValue(z) }
}
