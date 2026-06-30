export interface DiffChunk {
  type: 'insert' | 'delete' | 'equal'
  value: string
}

export interface ObjectDiffResult {
  path: string
  type: 'added' | 'removed' | 'changed'
  oldValue?: unknown
  newValue?: unknown
}

/**
 * Split string into lines (preserving empty trailing for trailing newline).
 */
function splitLines(s: string): string[] {
  if (s === '') return []
  return s.split('\n')
}

/**
 * Deep clone a value supporting plain objects, arrays, Date, RegExp, and primitives.
 */
function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(deepClone) as T
  if (value instanceof Date) return new Date(value.getTime()) as T
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as T
  const obj: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    obj[key] = deepClone((value as Record<string, unknown>)[key])
  }
  return obj as T
}

/**
 * Merge adjacent same-type chunks.
 */
function mergeChunks(chunks: DiffChunk[]): DiffChunk[] {
  if (chunks.length === 0) return chunks
  const merged: DiffChunk[] = [{ ...chunks[0]! }]
  for (let i = 1; i < chunks.length; i++) {
    const last = merged[merged.length - 1]!
    const curr = chunks[i]!
    if (last.type === curr.type) {
      last.value += '\n' + curr.value
    } else {
      merged.push({ ...curr })
    }
  }
  return merged
}

/**
 * Myers O(ND) diff algorithm.
 * Returns list of DiffChunks where each chunk's value is a single line.
 */
function myersDiffInternal(aLines: string[], bLines: string[]): DiffChunk[] {
  const n = aLines.length
  const m = bLines.length
  const max = n + m

  const V = new Int32Array(2 * max + 3)
  V.fill(-1)
  V[1 + max] = 0

  const trace: Int32Array[] = []

  let reached = false
  for (let d = 0; d <= max; d++) {
    trace.push(new Int32Array(V))

    for (let k = -d; k <= d; k += 2) {
      const idx = k + max + 1
      let x: number
      if (k === -d || (k !== d && V[idx - 1]! < V[idx + 1]!)) {
        x = V[idx + 1]!
      } else {
        x = V[idx - 1]! + 1
      }
      let y = x - k

      while (x < n && y < m && aLines[x] === bLines[y]) {
        x++
        y++
      }

      V[idx] = x

      if (x >= n && y >= m) {
        reached = true
        break
      }
    }
    if (reached) break
  }

  const chunks: DiffChunk[] = []
  let x = n
  let y = m

  for (let d = trace.length - 1; d > 0; d--) {
    const prevSnap = trace[d - 1]!
    const k = x - y

    const idxBase = max + 1
    const prev_k =
      k === -d || (k !== d && (prevSnap[k - 1 + idxBase] ?? -1) < (prevSnap[k + 1 + idxBase] ?? -1))
        ? k + 1
        : k - 1

    const prev_x = prevSnap[prev_k + idxBase]!
    const prev_y = prev_x - prev_k

    while (x > prev_x && y > prev_y) {
      x--
      y--
      chunks.push({ type: 'equal', value: aLines[x]! })
    }

    if (x === prev_x) {
      y--
      chunks.push({ type: 'insert', value: bLines[y]! })
    } else {
      x--
      chunks.push({ type: 'delete', value: aLines[x]! })
    }

    x = prev_x
    y = prev_y
    if (x === 0 && y === 0) break
  }

  while (x > 0 && y > 0) {
    x--
    y--
    chunks.push({ type: 'equal', value: aLines[x]! })
  }
  while (x > 0) {
    x--
    chunks.push({ type: 'delete', value: aLines[x]! })
  }
  while (y > 0) {
    y--
    chunks.push({ type: 'insert', value: bLines[y]! })
  }

  chunks.reverse()
  return chunks
}

/**
 * Compute the shortest edit script between two strings using the Myers O(ND) algorithm.
 * Strings are split into lines for comparison.
 *
 * @param a - Original string
 * @param b - Modified string
 * @returns Array of DiffChunks representing the edit operations
 */
export function textDiff(a: string, b: string): DiffChunk[] {
  const aLines = splitLines(a)
  const bLines = splitLines(b)
  const chunks = myersDiffInternal(aLines, bLines)
  return mergeChunks(chunks)
}

/**
 * Format a diff as a unified-format string, similar to `git diff`.
 *
 * @param a - Original string
 * @param b - Modified string
 * @param opts - Options for formatting
 * @param opts.context - Number of context lines before/after changes (default 3)
 * @param opts.fromFile - Label for original file (default "a")
 * @param opts.toFile - Label for file (default "b")
 * @returns Unified diff string
 */
export function unifiedDiff(
  a: string,
  b: string,
  opts?: { context?: number; fromFile?: string; toFile?: string },
): string {
  const context = opts?.context ?? 3
  const fromFile = opts?.fromFile ?? 'a'
  const toFile = opts?.toFile ?? 'b'

  const diff = textDiff(a, b)

  const entries: { type: 'insert' | 'delete' | 'equal'; value: string }[] = []
  for (const chunk of diff) {
    const lines = chunk.value.split('\n')
    for (const line of lines) {
      entries.push({ type: chunk.type, value: line })
    }
  }

  if (entries.length === 0) return ''
  if (entries.every((e) => e.type === 'equal')) return ''

  const changeIndices: number[] = []
  for (let i = 0; i < entries.length; i++) {
    if (entries[i]!.type !== 'equal') {
      changeIndices.push(i)
    }
  }

  const hunks: { start: number; end: number }[] = []
  let hunkStart = Math.max(0, changeIndices[0]! - context)
  let hunkEnd = Math.min(entries.length - 1, changeIndices[0]! + context)

  for (let i = 1; i < changeIndices.length; i++) {
    const idx = changeIndices[i]!
    const expandedEnd = Math.min(entries.length - 1, idx + context)
    if (idx - context <= hunkEnd + 1) {
      hunkEnd = expandedEnd
    } else {
      hunks.push({ start: hunkStart, end: hunkEnd })
      hunkStart = Math.max(0, idx - context)
      hunkEnd = expandedEnd
    }
  }
  hunks.push({ start: hunkStart, end: hunkEnd })

  const output: string[] = []
  output.push(`--- ${fromFile}`)
  output.push(`+++ ${toFile}`)

  for (const hunk of hunks) {
    const hunkEntries = entries.slice(hunk.start, hunk.end + 1)

    let oldLine = 1
    let newLine = 1
    for (let i = 0; i < hunk.start; i++) {
      if (entries[i]!.type === 'equal' || entries[i]!.type === 'delete') oldLine++
      if (entries[i]!.type === 'equal' || entries[i]!.type === 'insert') newLine++
    }

    const oldCount = hunkEntries.filter((e) => e.type === 'equal' || e.type === 'delete').length
    const newCount = hunkEntries.filter((e) => e.type === 'equal' || e.type === 'insert').length

    output.push(`@@ -${oldLine},${oldCount} +${newLine},${newCount} @@`)

    for (const entry of hunkEntries) {
      if (entry.type === 'equal') {
        output.push(' ' + entry.value)
      } else if (entry.type === 'delete') {
        output.push('-' + entry.value)
      } else {
        output.push('+' + entry.value)
      }
    }
  }

  return output.join('\n') + '\n'
}

/**
 * Check if a value is a non-null object (plain object or array).
 */
function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object'
}

/**
 * Recursively compare two objects and return a list of differences.
 *
 * Detects added, removed, and changed keys at any depth.
 * Arrays are compared element-wise with numeric indices as path segments.
 * Prototype pollution keys (__proto__, constructor, prototype) are ignored.
 *
 * @param a - Original object
 * @param b - Modified object
 * @returns Array of ObjectDiffResult
 */
export function objectDiff(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): ObjectDiffResult[] {
  const results: ObjectDiffResult[] = []

  function walk(aVal: unknown, bVal: unknown, path: string): void {
    if (aVal === bVal) return

    const aIsArr = Array.isArray(aVal)
    const bIsArr = Array.isArray(bVal)

    if (aIsArr && bIsArr) {
      const aArr = aVal as unknown[]
      const bArr = bVal as unknown[]
      const maxLen = Math.max(aArr.length, bArr.length)
      for (let i = 0; i < maxLen; i++) {
        const itemPath = path ? `${path}.${i}` : `${i}`
        if (i >= aArr.length) {
          results.push({ path: itemPath, type: 'added', newValue: bArr[i] })
        } else if (i >= bArr.length) {
          results.push({ path: itemPath, type: 'removed', oldValue: aArr[i] })
        } else if (isObject(aArr[i]) && isObject(bArr[i])) {
          walk(aArr[i], bArr[i], itemPath)
        } else if (aArr[i] !== bArr[i]) {
          results.push({ path: itemPath, type: 'changed', oldValue: aArr[i], newValue: bArr[i] })
        }
      }
      return
    }

    if (isObject(aVal) && isObject(bVal)) {
      const aKeys = Object.keys(aVal).filter(
        (k) => k !== '__proto__' && k !== 'constructor' && k !== 'prototype',
      )
      const bKeys = Object.keys(bVal).filter(
        (k) => k !== '__proto__' && k !== 'constructor' && k !== 'prototype',
      )
      const allKeys = [...new Set([...aKeys, ...bKeys])]

      for (const key of allKeys) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
        const itemPath = path ? `${path}.${key}` : key

        if (!Object.prototype.hasOwnProperty.call(aVal, key)) {
          results.push({ path: itemPath, type: 'added', newValue: bVal[key] })
        } else if (!Object.prototype.hasOwnProperty.call(bVal, key)) {
          results.push({ path: itemPath, type: 'removed', oldValue: aVal[key] })
        } else {
          walk(aVal[key], bVal[key], itemPath)
        }
      }
      return
    }

    results.push({ path, type: 'changed', oldValue: aVal, newValue: bVal })
  }

  walk(a, b, '')
  return results
}

/**
 * Set a value at a dot-notation path on an object, creating intermediate objects/arrays as needed.
 */
function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current: unknown = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!
    const nextKey = parts[i + 1]!
    const currentObj = current as Record<string, unknown>
    if (!(key in currentObj)) {
      currentObj[key] = /^\d+$/.test(nextKey) ? [] : {}
    }
    current = currentObj[key]!
  }
  ;(current as Record<string, unknown>)[parts[parts.length - 1]!] = value
}

/**
 * Delete a key at a dot-notation path on an object.
 */
function unsetAtPath(obj: Record<string, unknown>, path: string): void {
  const parts = path.split('.')
  let current: unknown = obj
  for (let i = 0; i < parts.length - 1; i++) {
    current = (current as Record<string, unknown>)[parts[i]!]
  }
  delete (current as Record<string, unknown>)[parts[parts.length - 1]!]
}

/**
 * Apply an array of object diffs to a deep clone of the original object.
 *
 * For 'added': sets the value at the given path.
 * For 'removed': deletes the key at the given path.
 * For 'changed': sets the new value at the given path.
 *
 * @param obj - Original object
 * @param diffs - Array of ObjectDiffResult to apply
 * @returns A new object with all diffs applied
 */
export function patch(
  obj: Record<string, unknown>,
  diffs: ObjectDiffResult[],
): Record<string, unknown> {
  const result = deepClone(obj)
  for (const diff of diffs) {
    if (diff.type === 'added') {
      setAtPath(result, diff.path, diff.newValue)
    } else if (diff.type === 'removed') {
      unsetAtPath(result, diff.path)
    } else if (diff.type === 'changed') {
      setAtPath(result, diff.path, diff.newValue)
    }
  }
  return result
}
