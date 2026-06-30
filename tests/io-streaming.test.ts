import { describe, it, expect, afterEach } from 'vitest'
import { unlinkSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { sep } from 'node:path'
import { createCsvParser, createJsonlParser, streamCsvFromFile, CsvParseError } from '../src/io/index.js'

let tmpDir: string | undefined

afterEach(() => {
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true })
    tmpDir = undefined
  }
})

function tempDir(): string {
  if (!tmpDir) {
    tmpDir = mkdtempSync(`${tmpdir()}${sep}speexkit-io-test-`)
  }
  return tmpDir
}

function tempFile(name: string, content: string): string {
  const path = `${tempDir()}${sep}${name}`
  writeFileSync(path, content, 'utf-8')
  return path
}

describe('createCsvParser', () => {
  it('parses basic CSV in a single chunk', () => {
    const parser = createCsvParser()
    const rows = parser.write('name,age\nAlice,30\nBob,25')
    const end = parser.end()
    expect([...rows, ...end]).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('parses CSV with quoted fields containing commas and newlines', () => {
    const parser = createCsvParser()
    const csv = 'name,desc\nAlice,"has a cat, and a dog"\nBob,"multiline\ndesc"'
    const rows = parser.write(csv)
    const end = parser.end()
    expect([...rows, ...end]).toEqual([
      { name: 'Alice', desc: 'has a cat, and a dog' },
      { name: 'Bob', desc: 'multiline\ndesc' },
    ])
  })

  it('handles escaped quotes', () => {
    const parser = createCsvParser()
    const csv = 'name,quote\nAlice,"she said ""hello"""\nBob,"""yes"'
    const rows = parser.write(csv)
    const end = parser.end()
    expect([...rows, ...end]).toEqual([
      { name: 'Alice', quote: 'she said "hello"' },
      { name: 'Bob', quote: '"yes' },
    ])
  })

  it('parses streamed input in multiple small chunks', () => {
    const parser = createCsvParser()
    const chunks = ['na', 'me,', 'age\n', 'Ali', 'ce,', '30\n', 'Bob', ',25']
    let result: Record<string, string>[] = []

    for (const chunk of chunks) {
      result = result.concat(parser.write(chunk))
    }
    result = result.concat(parser.end())

    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('handles \\r\\n line endings', () => {
    const parser = createCsvParser()
    const csv = 'name,age\r\nAlice,30\r\nBob,25\r\n'
    const rows = parser.write(csv)
    const end = parser.end()
    expect([...rows, ...end]).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('handles \\r line endings', () => {
    const parser = createCsvParser()
    const csv = 'name,age\rAlice,30\rBob,25'
    const rows = parser.write(csv)
    const end = parser.end()
    expect([...rows, ...end]).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('handles BOM character at start', () => {
    const parser = createCsvParser()
    const csv = '\ufeffname,age\nAlice,30\nBob,25'
    const rows = parser.write(csv)
    const end = parser.end()
    expect([...rows, ...end]).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('skips empty lines by default', () => {
    const parser = createCsvParser()
    const csv = 'name,age\n\nAlice,30\n\nBob,25\n'
    const result = parser.write(csv).concat(parser.end())
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('includes empty lines when skipEmptyLines is false', () => {
    const parser = createCsvParser({ skipEmptyLines: false })
    const csv = 'name,age\n\nAlice,30\n'
    const result = parser.write(csv).concat(parser.end())
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ name: '', age: '' })
    expect(result[1]).toEqual({ name: 'Alice', age: '30' })
  })

  it('uses custom delimiter', () => {
    const parser = createCsvParser({ delimiter: ';' })
    const csv = 'name;age\nAlice;30\nBob;25'
    const rows = parser.write(csv).concat(parser.end())
    expect(rows).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('works without headers', () => {
    const parser = createCsvParser({ hasHeader: false })
    const csv = 'Alice,30\nBob,25'
    const rows = parser.write(csv).concat(parser.end())
    expect(rows).toEqual([
      { '0': 'Alice', '1': '30' },
      { '0': 'Bob', '1': '25' },
    ])
  })

  it('quoted field split across chunks', () => {
    const parser = createCsvParser()
    const r1 = parser.write('name,desc\nAlice,"multiline\n')
    const r2 = parser.write('field content"\nBob,none\n')
    const r3 = parser.end()
    expect([...r1, ...r2, ...r3]).toEqual([
      { name: 'Alice', desc: 'multiline\nfield content' },
      { name: 'Bob', desc: 'none' },
    ])
  })

  it('returns empty array for empty input', () => {
    const parser = createCsvParser()
    expect(parser.write('').concat(parser.end())).toEqual([])
  })

  it('resets parser state', () => {
    const parser = createCsvParser()
    parser.write('name,val\nA,1\n').concat(parser.end())
    parser.reset()
    const rows = parser.write('name,val\nB,2\n').concat(parser.end())
    expect(rows).toEqual([{ name: 'B', val: '2' }])
  })

  it('throws CsvParseError on unclosed quote', () => {
    const parser = createCsvParser()
    parser.write('name,val\nAlice,"unclosed\n')
    expect(() => parser.end()).toThrow(CsvParseError)
    expect(() => parser.end()).toThrow('Unterminated quoted field')
  })

  it('handles header with only one row', () => {
    const parser = createCsvParser()
    const rows = parser.write('name,age').concat(parser.end())
    expect(rows).toEqual([])
  })

  it('handles trailing comma in header', () => {
    const parser = createCsvParser()
    const csv = 'name,age,\nAlice,30,\nBob,25,'
    const rows = parser.write(csv).concat(parser.end())
    expect(rows).toEqual([
      { name: 'Alice', age: '30', '': '' },
      { name: 'Bob', age: '25', '': '' },
    ])
  })

  it('strips BOM split across chunks', () => {
    const parser = createCsvParser()
    const r1 = parser.write('\ufeffna')
    const r2 = parser.write('me,age\nAlice,30\n')
    const rows = r1.concat(r2).concat(parser.end())
    expect(rows).toEqual([{ name: 'Alice', age: '30' }])
  })
})

describe('streamCsvFromFile', () => {
  it('streams CSV from a file', async () => {
    const path = tempFile('simple.csv', 'name,age\nAlice,30\nBob,25\n')
    const rows: Record<string, string>[] = []
    for await (const row of streamCsvFromFile(path)) {
      rows.push(row)
    }
    expect(rows).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('streams large CSV from file', async () => {
    const lineCount = 10_000
    const header = 'id,value\n'
    const lines: string[] = []
    for (let i = 0; i < lineCount; i++) {
      lines.push(`${i},val-${i}`)
    }
    const path = tempFile('large.csv', header + lines.join('\n') + '\n')

    let count = 0
    for await (const row of streamCsvFromFile(path, { chunkSize: 8192 })) {
      expect(Number.parseInt(row.id, 10)).toBe(count)
      expect(row.value).toBe(`val-${count}`)
      count++
    }
    expect(count).toBe(lineCount)
  })

  it('handles file with quoted fields and newlines', async () => {
    const csv = 'name,desc\nAlice,"hello\nworld"\nBob,"simple"\n'
    const path = tempFile('quoted.csv', csv)
    const rows: Record<string, string>[] = []
    for await (const row of streamCsvFromFile(path)) {
      rows.push(row)
    }
    expect(rows).toEqual([
      { name: 'Alice', desc: 'hello\nworld' },
      { name: 'Bob', desc: 'simple' },
    ])
  })

  it('throws on missing file', async () => {
    await expect(async () => {
      for await (const _ of streamCsvFromFile('/nonexistent/file.csv')) {
        // noop
      }
    }).rejects.toThrow()
  })
})

describe('createJsonlParser', () => {
  it('parses basic JSONL', () => {
    const parser = createJsonlParser()
    const data = parser.write('{"a":1}\n{"b":2}\n')
    const end = parser.end()
    expect([...data, ...end]).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('parses JSONL with various JSON types', () => {
    const parser = createJsonlParser()
    const data = parser.write('"string"\n42\nnull\ntrue\n{"nested":{"k":"v"}}\n')
    const end = parser.end()
    expect([...data, ...end]).toEqual(['string', 42, null, true, { nested: { k: 'v' } }])
  })

  it('parses streamed JSONL in multiple chunks', () => {
    const parser = createJsonlParser()
    const chunks = ['{"a"', ':1}\n{"b"', ':2}\n{"c"', ':3}\n']
    let result: unknown[] = []
    for (const chunk of chunks) {
      result = result.concat(parser.write(chunk))
    }
    result = result.concat(parser.end())
    expect(result).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }])
  })

  it('skips empty lines by default', () => {
    const parser = createJsonlParser()
    const data = parser.write('{"a":1}\n\n\n{"b":2}\n')
    const end = parser.end()
    expect([...data, ...end]).toEqual([{ a: 1 }, { b: 2 }])
  })

  it('handles incomplete line in buffer', () => {
    const parser = createJsonlParser()
    const r1 = parser.write('{"a":1}\n{"b":2}')
    expect(r1).toEqual([{ a: 1 }])

    const r2 = parser.write('\n{"c":3}\n')
    expect(r2).toEqual([{ b: 2 }, { c: 3 }])

    expect(parser.end()).toEqual([])
  })

  it('returns empty for empty input', () => {
    const parser = createJsonlParser()
    expect(parser.end()).toEqual([])
  })

  it('returns empty for write without newline then end', () => {
    const parser = createJsonlParser()
    expect(parser.write('')).toEqual([])
    const end = parser.end()
    expect(end).toEqual([])
  })

  it('throws on invalid JSON', () => {
    const parser = createJsonlParser()
    parser.write('{"valid":1}\n')
    expect(() => parser.write('invalid json\n')).toThrow(CsvParseError)
  })

  it('resets parser state', () => {
    const parser = createJsonlParser()
    parser.write('{"a":1}\n').concat(parser.end())
    parser.reset()
    const rows = parser.write('{"b":2}\n').concat(parser.end())
    expect(rows).toEqual([{ b: 2 }])
  })

  it('handles \\r\\n line endings', () => {
    const parser = createJsonlParser()
    const data = parser.write('{"a":1}\r\n{"b":2}\r\n')
    const end = parser.end()
    expect([...data, ...end]).toEqual([{ a: 1 }, { b: 2 }])
  })
})
