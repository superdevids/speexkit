import { describe, it, expect } from 'vitest'
import { NDArray } from '../src/nlarray/index.js'

// ---------------------------------------------------------------------------
// Helper: approximate equality with tolerance
// ---------------------------------------------------------------------------
function approx(a: number, b: number, tol: number = 1e-8): boolean {
  return Math.abs(a - b) < tol
}

function approxArr(a: number[], b: number[], tol: number = 1e-8): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!approx(a[i]!, b[i]!, tol)) return false
  }
  return true
}

function approxND(a: NDArray, b: NDArray, tol: number = 1e-8): boolean {
  if (a.shape.length !== b.shape.length) return false
  for (let i = 0; i < a.shape.length; i++) {
    if (a.shape[i] !== b.shape[i]) return false
  }
  const da = a.data as readonly number[]
  const db = b.data as readonly number[]
  for (let i = 0; i < da.length; i++) {
    if (!approx(da[i]!, db[i]!, tol)) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// SVD Tests
// ---------------------------------------------------------------------------
describe('NDArray.svd', () => {
  it('1. basic 2×2 matrix reconstruction', () => {
    const A = NDArray.from([
      [1, 2],
      [3, 4],
    ])
    const { U, S, Vt } = NDArray.svd(A)
    // Reconstruct: A ≈ U * diag(S) * Vt
    const Sigma = NDArray.diag(S)
    const reconstructed = (U.matmul(Sigma) as NDArray<number>).matmul(Vt) as NDArray<number>
    expect(approxND(reconstructed, A as NDArray<number>, 1e-10)).toBe(true)
  })

  it('2. SVD: 3×2 rectangular matrix', () => {
    const A = NDArray.from([
      [1, 2],
      [3, 4],
      [5, 6],
    ])
    const { U, S, Vt } = NDArray.svd(A)
    expect(U.shape).toEqual([3, 3])
    expect(S.shape).toEqual([2])
    expect(Vt.shape).toEqual([2, 2])
    // Build padded Sigma (3×2) with singular values on diagonal
    // For [3,2] row-major: [s0, 0, 0, s1, 0, 0] = diag(s0,s1) in top 2x2
    const sv = Array.from(S.data as readonly number[])
    const padData = new Array<number>(6).fill(0)
    padData[0] = sv[0]!
    padData[3] = sv[1]!
    const SigmaPad = new NDArray(padData, [3, 2])
    const reconstructed = (U.matmul(SigmaPad) as NDArray<number>).matmul(Vt) as NDArray<number>
    expect(approxND(reconstructed, A as NDArray<number>, 1e-10)).toBe(true)
  })

  it('3. SVD: 2×3 rectangular matrix', () => {
    const A = NDArray.from([
      [1, 2, 3],
      [4, 5, 6],
    ])
    const { U, S, Vt } = NDArray.svd(A)
    expect(U.shape).toEqual([2, 2])
    expect(S.shape).toEqual([2])
    expect(Vt.shape).toEqual([3, 3])
    // Build padded Sigma (2×3) with singular values on diagonal
    const sv = Array.from(S.data as readonly number[])
    const padData = new Array<number>(6).fill(0)
    padData[0] = sv[0]!
    padData[4] = sv[1]!
    const SigmaPad = new NDArray(padData, [2, 3])
    const reconstructed = (U.matmul(SigmaPad) as NDArray<number>).matmul(Vt) as NDArray<number>
    expect(approxND(reconstructed, A as NDArray<number>, 1e-10)).toBe(true)
  })

  it('4. SVD: identity matrix (singular values all 1)', () => {
    const I = NDArray.eye(4)
    const { S } = NDArray.svd(I)
    const sv = Array.from(S.data as readonly number[])
    expect(sv.length).toBe(4)
    for (let i = 0; i < 4; i++) {
      expect(approx(sv[i]!, 1, 1e-10)).toBe(true)
    }
  })

  it('5. SVD: rank-deficient matrix (one singular value near 0)', () => {
    // Matrix with linearly dependent columns: col2 = 2 * col1
    const A = NDArray.from([
      [1, 2],
      [2, 4],
      [3, 6],
    ])
    const { S } = NDArray.svd(A)
    const sv = Array.from(S.data as readonly number[])
    // One singular value should be near 0
    const minSV = Math.min(...sv)
    expect(minSV < 1e-10).toBe(true)
  })

  it('6. SVD: orthogonality check (U*U^T ≈ I)', () => {
    const A = NDArray.from([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 10],
    ])
    const { U } = NDArray.svd(A)
    const Ut = U.transpose() as NDArray<number>
    const product = (U as NDArray<number>).matmul(Ut) as NDArray<number>
    const I = NDArray.eye(3)
    expect(approxND(product, I, 1e-10)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// where (3-arg) Tests
// ---------------------------------------------------------------------------
describe('NDArray.where (3-arg)', () => {
  it('7. where 3-arg: basic select', () => {
    const cond = NDArray.from([true, false, true, false])
    const x = NDArray.from([10, 20, 30, 40])
    const y = NDArray.from([1, 2, 3, 4])
    const result = NDArray.where(cond, x, y)
    expect(result.toList()).toEqual([10, 2, 30, 4])
  })

  it('8. where 3-arg: broadcasting with scalar', () => {
    const cond = NDArray.from([true, false, true])
    const result = NDArray.where(cond, 99, 0)
    expect(result.toList()).toEqual([99, 0, 99])
  })

  it('9. where 3-arg: different shapes error', () => {
    const cond = NDArray.from([true, false])
    const x = NDArray.from([1, 2, 3])
    const y = NDArray.from([4, 5, 6])
    expect(() => NDArray.where(cond, x, y)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// polyfit Tests
// ---------------------------------------------------------------------------
describe('NDArray.polyfit', () => {
  it('10. polyfit: linear data (degree 1)', () => {
    const x = [0, 1, 2, 3, 4]
    const y = [2, 4, 6, 8, 10] // y = 2 + 2x
    const coeffs = NDArray.polyfit(x, y, 1)
    expect(coeffs.length).toBe(2)
    expect(approx(coeffs[0]!, 2, 1e-8)).toBe(true)
    expect(approx(coeffs[1]!, 2, 1e-8)).toBe(true)
  })

  it('11. polyfit: quadratic data (degree 2)', () => {
    const x = [-2, -1, 0, 1, 2]
    const y = [4, 1, 0, 1, 4] // y = x^2
    const coeffs = NDArray.polyfit(x, y, 2)
    expect(coeffs.length).toBe(3)
    expect(approx(coeffs[0]!, 0, 1e-8)).toBe(true) // c0 ≈ 0
    expect(approx(coeffs[1]!, 0, 1e-8)).toBe(true) // c1 ≈ 0
    expect(approx(coeffs[2]!, 1, 1e-8)).toBe(true) // c2 ≈ 1
  })

  it('12. polyfit: degree too high (error)', () => {
    const x = [0, 1, 2]
    const y = [0, 1, 4]
    expect(() => NDArray.polyfit(x, y, 3)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// polyval Tests
// ---------------------------------------------------------------------------
describe('NDArray.polyval', () => {
  it('13. polyval: evaluate polynomial', () => {
    // p(x) = 1 + 2x + 3x^2
    const coeffs = [1, 2, 3]
    const x = [0, 1, 2]
    const result = NDArray.polyval(coeffs, x)
    // p(0) = 1, p(1) = 6, p(2) = 17
    expect(result.length).toBe(3)
    expect(approx(result[0]!, 1, 1e-10)).toBe(true)
    expect(approx(result[1]!, 6, 1e-10)).toBe(true)
    expect(approx(result[2]!, 17, 1e-10)).toBe(true)
  })

  it('14. polyfit + polyval roundtrip', () => {
    // Generate points from y = 3 - 2x + x^2
    const x = [0, 1, 2, 3, 4, 5]
    const trueCoeffs = [3, -2, 1]
    const y = NDArray.polyval(trueCoeffs, x)
    const fitted = NDArray.polyfit(x, y, 2)
    expect(approxArr(fitted, trueCoeffs, 1e-8)).toBe(true)
    // Evaluate fitted polynomial
    const yFitted = NDArray.polyval(fitted, x)
    expect(approxArr(yFitted, y, 1e-8)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// FFT Tests
// ---------------------------------------------------------------------------
describe('NDArray.fft / ifft', () => {
  it('15. FFT: single frequency (sine wave)', () => {
    const n = 128
    const f = 10
    const t = Array.from({ length: n }, (_, i) => i / n)
    const signal = t.map((x) => Math.sin(2 * Math.PI * f * x))
    const fft = NDArray.fft(signal)
    // Magnitude spectrum
    const mag = Array.from({ length: n / 2 }, (_, i) => Math.sqrt(fft.real[i]! ** 2 + fft.imag[i]! ** 2))
    // Peak should be at index 10
    const peakIdx = mag.indexOf(Math.max(...mag))
    expect(peakIdx).toBe(f)
  })

  it('16. FFT: IFFT roundtrip', () => {
    const signal = [1.0, 0.5, -0.5, -1.0, 0.5, -0.5, 1.0, 0.0]
    const fft = NDArray.fft(signal)
    const ifft = NDArray.ifft(Array.from(fft.real), Array.from(fft.imag))
    expect(approxArr(Array.from(ifft.real), signal, 1e-10)).toBe(true)
  })

  it('17. FFT: zero frequency (DC)', () => {
    const n = 8
    const signal = new Array<number>(n).fill(5)
    const fft = NDArray.fft(signal)
    // DC component should be n * 5 = 40
    expect(approx(fft.real[0]!, 40, 1e-10)).toBe(true)
    // All other bins should be ~0
    for (let i = 1; i < n; i++) {
      expect(approx(fft.real[i]!, 0, 1e-10)).toBe(true)
      expect(approx(fft.imag[i]!, 0, 1e-10)).toBe(true)
    }
  })

  it('18. FFT: power of 2 check', () => {
    expect(() => NDArray.fft([1, 2, 3])).toThrow(/power of 2/)
    expect(() => NDArray.fft([1, 2, 3, 4, 5])).toThrow(/power of 2/)
    // Should work for power of 2
    expect(() => NDArray.fft([1, 2, 3, 4])).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Boolean Indexing Tests
// ---------------------------------------------------------------------------
describe('NDArray boolean / fancy indexing', () => {
  it('19. Boolean indexing: getByMask', () => {
    const a = NDArray.from([10, 20, 30, 40, 50])
    const mask = NDArray.from([true, false, true, false, true])
    const result = a.getByMask(mask)
    expect(result.toList()).toEqual([10, 30, 50])
    expect(result.shape).toEqual([3])
  })

  it('20. Boolean indexing: setByMask', () => {
    const a = NDArray.from([1, 2, 3, 4])
    const mask = NDArray.from([true, false, true, false])
    a.setByMask(mask, NDArray.from([99, 88]))
    expect(a.toList()).toEqual([99, 2, 88, 4])
  })

  it('Fancy indexing: get with index array', () => {
    const a = NDArray.from([10, 20, 30, 40, 50])
    const result = a.get([0, 2, 4])
    expect(result.toList()).toEqual([10, 30, 50])
  })

  it('Fancy indexing: set with index array', () => {
    const a = NDArray.from([1, 2, 3, 4, 5])
    a.setByIndices([99, 88], [0, 4])
    expect(a.toList()).toEqual([99, 2, 3, 4, 88])
  })
})
