import { describe, it, expect } from 'vitest'
import { anovaOneWay, chiSquareTest, chiSquareGoodnessOfFit, mannWhitneyU, ttestInd } from '../src/stats/index.js'

describe('anovaOneWay', () => {
  it('basic case with 3 groups having different means', () => {
    const a = [1, 2, 3]
    const b = [4, 5, 6]
    const c = [7, 8, 9]
    const result = anovaOneWay(a, b, c)
    expect(result.fStatistic).toBeGreaterThan(0)
    expect(result.fStatistic).toBeCloseTo(27, 5)
    expect(result.pValue).toBeLessThan(0.01)
  })

  it('all groups identical should have very high p-value', () => {
    const a = [5, 5, 5]
    const b = [5, 5, 5]
    const c = [5, 5, 5]
    const result = anovaOneWay(a, b, c)
    expect(result.fStatistic).toBe(0)
    expect(result.pValue).toBe(1)
  })

  it('two groups should give related result to independent t-test', () => {
    const a = [2, 4, 6, 8, 10]
    const b = [1, 3, 5, 7, 9]
    const anovaResult = anovaOneWay(a, b)
    const ttestResult = ttestInd(a, b)
    const fFromT = ttestResult.statistic ** 2
    expect(anovaResult.fStatistic).toBeCloseTo(fFromT, 10)
    expect(anovaResult.pValue).toBeCloseTo(ttestResult.pValue, 5)
  })

  it('throws for fewer than 2 groups', () => {
    expect(() => anovaOneWay([1, 2, 3])).toThrow()
  })

  it('throws for empty group', () => {
    expect(() => anovaOneWay([], [1, 2, 3])).toThrow()
  })

  it('throws for no groups', () => {
    expect(() => anovaOneWay()).toThrow()
  })

  it('handles groups with different sizes', () => {
    const a = [1, 2]
    const b = [4, 5, 6]
    const c = [8, 9, 10, 11]
    const result = anovaOneWay(a, b, c)
    expect(result.fStatistic).toBeGreaterThan(0)
    expect(result.pValue).toBeLessThan(0.05)
  })
})

describe('chiSquareTest', () => {
  it('independence test with known contingency table', () => {
    const observed = [
      [30, 10],
      [20, 40],
    ]
    const result = chiSquareTest(observed)
    expect(result.chi2).toBeGreaterThan(0)
    expect(result.chi2).toBeCloseTo(16.667, 1)
    expect(result.pValue).toBeLessThan(0.001)
    expect(result.dof).toBe(1)
  })

  it('returns high p-value for independent variables', () => {
    const observed = [
      [25, 25],
      [25, 25],
    ]
    const result = chiSquareTest(observed)
    expect(result.chi2).toBeCloseTo(0, 5)
    expect(result.pValue).toBeGreaterThan(0.9)
    expect(result.dof).toBe(1)
  })

  it('works with larger contingency table', () => {
    const observed = [
      [10, 20, 30],
      [15, 25, 35],
    ]
    const result = chiSquareTest(observed)
    expect(result.dof).toBe(2)
    expect(result.chi2).toBeGreaterThan(0)
    expect(result.pValue).toBeGreaterThan(0)
  })

  it('throws for table with fewer than 2 rows', () => {
    expect(() => chiSquareTest([[10, 20]])).toThrow()
  })

  it('throws for table with fewer than 2 columns', () => {
    expect(() => chiSquareTest([[10], [20]])).toThrow()
  })

  it('throws for inconsistent row lengths', () => {
    expect(() => chiSquareTest([[10, 20], [30]])).toThrow()
  })

  it('throws for empty table', () => {
    expect(() => chiSquareTest([])).toThrow()
  })

  it('handles zero grand total', () => {
    expect(() =>
      chiSquareTest([
        [0, 0],
        [0, 0],
      ]),
    ).toThrow()
  })
})

describe('chiSquareGoodnessOfFit', () => {
  it('basic goodness of fit test', () => {
    const observed = [50, 30, 20]
    const expected = [33.3, 33.3, 33.3]
    const result = chiSquareGoodnessOfFit(observed, expected)
    expect(result.chi2).toBeGreaterThan(0)
    expect(result.pValue).toBeLessThan(0.05)
    expect(result.dof).toBe(2)
  })

  it('perfect fit returns high p-value', () => {
    const observed = [25, 25, 25, 25]
    const expected = [25, 25, 25, 25]
    const result = chiSquareGoodnessOfFit(observed, expected)
    expect(result.chi2).toBe(0)
    expect(result.pValue).toBe(1)
    expect(result.dof).toBe(3)
  })

  it('throws for mismatched array lengths', () => {
    expect(() => chiSquareGoodnessOfFit([10, 20], [10, 20, 30])).toThrow()
  })

  it('throws for fewer than 2 categories', () => {
    expect(() => chiSquareGoodnessOfFit([10], [10])).toThrow()
  })

  it('throws for empty arrays', () => {
    expect(() => chiSquareGoodnessOfFit([], [])).toThrow()
  })

  it('throws for negative expected frequencies', () => {
    expect(() => chiSquareGoodnessOfFit([10, 20], [-5, 35])).toThrow()
  })

  it('handles zero expected frequency gracefully', () => {
    const observed = [10, 20]
    const expected = [0, 30]
    const result = chiSquareGoodnessOfFit(observed, expected)
    expect(result.chi2).toBeGreaterThan(0)
    expect(result.pValue).toBeGreaterThan(0)
  })
})

describe('mannWhitneyU', () => {
  it('basic comparison where groups are different', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [6, 7, 8, 9, 10]
    const result = mannWhitneyU(x, y)
    expect(result.uStatistic).toBe(0)
    expect(result.pValue).toBeLessThan(0.05)
  })

  it('identical groups should have high p-value', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [1, 2, 3, 4, 5]
    const result = mannWhitneyU(x, y)
    expect(result.uStatistic).toBeGreaterThan(0)
    expect(result.pValue).toBeGreaterThan(0.1)
  })

  it('small sample exact (both groups <= 20)', () => {
    const x = [2, 4, 6, 8]
    const y = [1, 3, 5, 7]
    const result = mannWhitneyU(x, y)
    expect(result.uStatistic).toBeGreaterThanOrEqual(0)
    expect(result.pValue).toBeGreaterThan(0)
  })

  it('identifies clear difference between groups', () => {
    const x = [1, 2, 3, 4, 5]
    const y = [10, 11, 12, 13, 14]
    const result = mannWhitneyU(x, y)
    expect(result.uStatistic).toBe(0)
    expect(result.pValue).toBeLessThan(0.05)
  })

  it('throws for empty first group', () => {
    expect(() => mannWhitneyU([], [1, 2, 3])).toThrow()
  })

  it('throws for empty second group', () => {
    expect(() => mannWhitneyU([1, 2, 3], [])).toThrow()
  })

  it('throws for both empty groups', () => {
    expect(() => mannWhitneyU([], [])).toThrow()
  })

  it('handles ties correctly', () => {
    const x = [1, 1, 2, 2]
    const y = [3, 3, 4, 4]
    const result = mannWhitneyU(x, y)
    expect(result.uStatistic).toBe(0)
    expect(result.pValue).toBeLessThan(0.05)
  })

  it('large sample approximation works', () => {
    const x = Array.from({ length: 25 }, (_, i) => i)
    const y = Array.from({ length: 25 }, (_, i) => i + 10)
    const result = mannWhitneyU(x, y)
    expect(result.uStatistic).toBeGreaterThan(0)
    expect(result.pValue).toBeLessThan(0.05)
  })

  it('asymmetric group sizes', () => {
    const x = [1, 2, 3]
    const y = [10, 11, 12, 13, 14]
    const result = mannWhitneyU(x, y)
    expect(result.uStatistic).toBe(0)
    expect(result.pValue).toBeLessThan(0.05)
  })
})
