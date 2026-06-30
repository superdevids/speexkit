import { createReadStream, watch } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * Options for CSV parsing.
 */
export interface CsvOptions {
  delimiter?: string
  header?: boolean
  skipEmptyLines?: boolean
}

/**
 * Parses a CSV string into an array of records (objects).
 *
 * @param input - CSV string
 * @param options - Optional parsing options
 */
export function parseCsv(input: string, options?: CsvOptions): Record<string, string>[] {
  const { delimiter = ',', header = true, skipEmptyLines = true } = options ?? {}

  const lines = input.split(/\r?\n/)
  const rows: string[][] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (skipEmptyLines && trimmed.length === 0) continue
    const values = parseCsvLine(trimmed, delimiter)
    rows.push(values)
  }

  if (rows.length === 0) return []

  if (header) {
    const [head, ...body] = rows
    if (head === undefined) return []
    return body.map((row) => {
      const record: Record<string, string> = {}
      for (let i = 0; i < head.length; i++) {
        if (head[i] === '__proto__' || head[i] === 'constructor' || head[i] === 'prototype') continue
        record[head[i]!] = row[i] ?? ''
      }
      return record
    })
  }

  return rows.map((row) => {
    const record: Record<string, string> = {}
    for (let i = 0; i < row.length; i++) {
      record[String(i)] = row[i]!
    }
    return record
  })
}

/**
 * Error thrown when malformed CSV input is encountered during streaming.
 */
export class CsvParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CsvParseError'
  }
}

/**
 * Options for the streaming CSV parser.
 */
export interface CsvParserOptions {
  delimiter?: string
  chunkSize?: number
  hasHeader?: boolean
  skipEmptyLines?: boolean
}

/**
 * Streaming CSV parser that processes data in chunks.
 * Handles quoted fields, multiline values, escaped quotes,
 * and different line endings without buffering the entire input.
 */
export interface CsvParser {
  write(chunk: string): Record<string, string>[]
  end(): Record<string, string>[]
  reset(): void
}

/**
 * Creates a streaming CSV parser that processes data in chunks.
 *
 * The parser uses a state machine to track the current position,
 * quoted fields, and escape sequences. It buffers incomplete lines
 * between chunks, handling multiline quoted fields and all
 * common line-ending styles (\n, \r\n, \r).
 *
 * @param options - Parser configuration
 * @returns A CsvParser instance
 *
 * @example
 * ```ts
 * const parser = createCsvParser()
 * const rows1 = parser.write('name,age\nAlice,30\n')
 * const rows2 = parser.write('Bob,25')
 * const rows3 = parser.end()
 * // rows1: [{ name: 'Alice', age: '30' }]
 * // rows2: []
 * // rows3: [{ name: 'Bob', age: '25' }]
 * ```
 */
export function createCsvParser(options?: CsvParserOptions): CsvParser {
  const { delimiter = ',', hasHeader = true, skipEmptyLines = true } = options ?? {}

  let buffer = ''
  let pos = 0
  let inQuotes = false
  let currentField = ''
  let currentRow: string[] = []
  let headers: string[] | null = null
  let headerRead = false
  let bomStripped = false

  function stripBom(text: string): string {
    if (text.charCodeAt(0) === 0xfeff) {
      return text.slice(1)
    }
    return text
  }

  function finalizeRow(row: string[]): Record<string, string> | null {
    if (!bomStripped && row.length > 0) {
      row[0] = stripBom(row[0]!)
      bomStripped = true
    }

    if (skipEmptyLines && row.length === 1 && row[0] === '') {
      return null
    }

    if (!headerRead) {
      headerRead = true
      if (hasHeader) {
        headers = row
        return null
      }
      const record: Record<string, string> = {}
      for (let i = 0; i < row.length; i++) {
        record[String(i)] = row[i]!
      }
      return record
    }

    if (headers) {
      const record: Record<string, string> = {}
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i]!
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
        record[key] = row[i] ?? ''
      }
      return record
    }

    const record: Record<string, string> = {}
    for (let i = 0; i < row.length; i++) {
      record[String(i)] = row[i]!
    }
    return record
  }

  function processBuffer(endOfInput: boolean): Record<string, string>[] {
    const result: Record<string, string>[] = []

    while (pos < buffer.length) {
      const ch = buffer[pos]!

      if (inQuotes) {
        if (ch === '"') {
          if (pos + 1 < buffer.length && buffer[pos + 1] === '"') {
            currentField += '"'
            pos += 2
          } else {
            inQuotes = false
            pos++
          }
        } else {
          currentField += ch
          pos++
        }
      } else if (ch === '"') {
        inQuotes = true
        pos++
      } else if (ch === delimiter) {
        currentRow.push(currentField)
        currentField = ''
        pos++
      } else if (ch === '\n') {
        currentRow.push(currentField)
        currentField = ''
        const row = finalizeRow(currentRow)
        if (row !== null) result.push(row)
        currentRow = []
        pos++
      } else if (ch === '\r') {
        currentRow.push(currentField)
        currentField = ''
        const row = finalizeRow(currentRow)
        if (row !== null) result.push(row)
        currentRow = []
        pos++
        if (pos < buffer.length && buffer[pos] === '\n') {
          pos++
        }
      } else {
        currentField += ch
        pos++
      }
    }

    if (endOfInput) {
      if (inQuotes) {
        throw new CsvParseError('Unterminated quoted field at end of input')
      }
      if (currentField.length > 0 || currentRow.length > 0) {
        currentRow.push(currentField)
        currentField = ''
        const row = finalizeRow(currentRow)
        if (row !== null) result.push(row)
        currentRow = []
      }
      buffer = ''
      pos = 0
    } else {
      buffer = buffer.slice(pos)
      pos = 0
    }

    return result
  }

  return {
    write(chunk: string): Record<string, string>[] {
      buffer += chunk
      return processBuffer(false)
    },

    end(): Record<string, string>[] {
      return processBuffer(true)
    },

    reset(): void {
      buffer = ''
      pos = 0
      inQuotes = false
      currentField = ''
      currentRow = []
      headers = null
      headerRead = false
      bomStripped = false
    },
  }
}

/**
 * Streams rows from a CSV file using Node.js `fs.createReadStream`.
 *
 * The file is read in chunks (default 64 KB) and parsed incrementally.
 * Each row is yielded as soon as it is complete, keeping memory usage
 * proportional to the chunk size rather than the file size.
 *
 * @param filePath - Path to the CSV file
 * @param options - Parser options (chunkSize controls the read buffer)
 * @returns An async iterable yielding row objects
 *
 * @example
 * ```ts
 * for await (const row of streamCsvFromFile('data.csv')) {
 *   console.log(row.name, row.age)
 * }
 * ```
 */
export async function* streamCsvFromFile(filePath: string, options?: CsvParserOptions): AsyncIterable<Record<string, string>> {
  const parser = createCsvParser(options)
  const stream = createReadStream(filePath, {
    encoding: 'utf-8',
    highWaterMark: options?.chunkSize ?? 65536,
  })

  try {
    for await (const chunk of stream) {
      const rows = parser.write(chunk as string)
      for (const row of rows) {
        yield row
      }
    }
    const rows = parser.end()
    for (const row of rows) {
      yield row
    }
  } finally {
    stream.destroy()
  }
}

/**
 * Options for the streaming JSONL parser.
 */
export interface JsonlParserOptions {
  skipEmptyLines?: boolean
}

/**
 * Streaming JSONL parser that processes line-delimited JSON in chunks.
 */
export interface JsonlParser {
  write(chunk: string): unknown[]
  end(): unknown[]
  reset(): void
}

/**
 * Creates a streaming JSONL parser that processes line-delimited JSON in chunks.
 *
 * Each line is parsed as a separate JSON value. Incomplete lines are buffered
 * between chunks. Empty lines are skipped by default.
 *
 * @returns A JsonlParser instance
 *
 * @example
 * ```ts
 * const parser = createJsonlParser()
 * const r1 = parser.write('{"a":1}\n{"b":2}\n')
 * const r2 = parser.write('{"c":3}')
 * const r3 = parser.end()
 * // r1: [{a: 1}, {b: 2}]
 * // r2: []
 * // r3: [{c: 3}]
 * ```
 */
export function createJsonlParser(options?: JsonlParserOptions): JsonlParser {
  const { skipEmptyLines = true } = options ?? {}
  let buffer = ''

  function processBuffer(endOfInput: boolean): unknown[] {
    const result: unknown[] = []
    const splitIdx = buffer.lastIndexOf('\n')

    let complete: string[]

    if (endOfInput) {
      complete = buffer.length > 0 ? [buffer] : []
      buffer = ''
    } else if (splitIdx === -1) {
      return []
    } else {
      complete = buffer.slice(0, splitIdx).split('\n')
      buffer = buffer.slice(splitIdx + 1)
    }

    for (const line of complete) {
      const trimmed = line.trim()
      if (skipEmptyLines && trimmed.length === 0) continue
      try {
        result.push(JSON.parse(trimmed))
      } catch (e) {
        throw new CsvParseError(`Invalid JSONL: ${(e as Error).message} — near: ${trimmed.slice(0, 80)}`)
      }
    }

    return result
  }

  return {
    write(chunk: string): unknown[] {
      buffer += chunk
      return processBuffer(false)
    },

    end(): unknown[] {
      return processBuffer(true)
    },

    reset(): void {
      buffer = ''
    },
  }
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}

/**
 * Converts an array of records to a CSV string.
 */
export function stringifyCsv(data: Record<string, unknown>[], options?: { delimiter?: string }): string {
  const { delimiter = ',' } = options ?? {}
  if (data.length === 0) return ''

  const headers = Object.keys(data[0]!)
  const lines: string[] = [headers.map((v) => escapeCsvField(v, delimiter)).join(delimiter)]

  for (const record of data) {
    const row = headers.map((h) => escapeCsvField(String(record[h] ?? ''), delimiter))
    lines.push(row.join(delimiter))
  }

  return lines.join('\n')
}

function escapeCsvField(value: string, delimiter: string): string {
  if (value.includes('"') || value.includes(delimiter) || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Safely parses a JSON string, returning the default value or null on failure.
 */
export function safeJsonParse<T>(input: string, default_?: T): T | null {
  try {
    return JSON.parse(input) as T
  } catch {
    return default_ ?? null
  }
}

/**
 * Reads an environment variable with optional default.
 */
export function env(name: string, default_?: string): string {
  const value = process.env[name]
  return value ?? default_ ?? ''
}

/**
 * Reads an environment variable as an integer.
 */
export function envInt(name: string, default_?: number): number {
  const value = process.env[name]
  if (value === undefined || value === '') return default_ ?? 0
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? (default_ ?? 0) : parsed
}

/**
 * Reads an environment variable as a boolean.
 */
export function envBool(name: string, default_?: boolean): boolean {
  const value = process.env[name]
  if (value === undefined || value === '') return default_ ?? false
  return value === 'true' || value === '1' || value === 'yes'
}

export function envArray(name: string, default_?: string[]): string[] {
  const value = typeof process !== 'undefined' ? process.env[name] : undefined
  if (value === undefined || value === '') return default_ ?? []
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

export function safeJsonStringify(value: unknown, default_?: string): string {
  try {
    const r = JSON.stringify(value)
    return r !== undefined ? r : (default_ ?? '')
  } catch {
    return default_ ?? ''
  }
}

/**
 * Reads and parses a JSON file from disk.
 *
 * @param path - File path to read
 * @returns Parsed JSON value
 */
export async function readJSONFile<T = unknown>(path: string): Promise<T> {
  let content: string
  try {
    content = await readFile(path, 'utf-8')
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'ENOENT') {
      throw new Error(`File not found: ${path}`)
    }
    throw new Error(`Failed to read file: ${path} — ${(err as Error).message}`)
  }
  try {
    return JSON.parse(content) as T
  } catch {
    throw new Error(`Invalid JSON in file: ${path}`)
  }
}

/**
 * Stringifies data as JSON and writes it to a file, creating the parent
 * directory if it does not exist.
 *
 * @param path - File path to write
 * @param data - Data to serialize
 * @param opts - Optional formatting options
 */
export async function writeJSONFile(
  path: string,
  data: unknown,
  opts?: { spaces?: number; replacer?: (key: string, value: unknown) => unknown },
): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const json = JSON.stringify(data, opts?.replacer as ((key: string, value: unknown) => unknown) | undefined, opts?.spaces)
  await writeFile(path, json, 'utf-8')
}

/**
 * Watches a file for changes using `fs.watch`.
 *
 * Returns an object with a `stop()` method to stop watching.
 *
 * @param path - File path to watch
 * @param onChange - Callback invoked with the event type
 */
export function watchFile(path: string, onChange: (event: 'change' | 'rename') => void): { stop(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null

  const watcher = watch(path, (event) => {
    if (event !== 'change' && event !== 'rename') return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      onChange(event)
      timer = null
    }, 100)
  })

  return {
    stop(): void {
      watcher.close()
    },
  }
}
