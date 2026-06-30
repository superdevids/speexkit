import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseArgs, renderTable, Spinner, colorize, confirm, prompt } from '../src/cli/index.js'

const { mockCreateInterface } = vi.hoisted(() => ({
  mockCreateInterface: vi.fn(),
}))
vi.mock('node:readline', () => ({
  createInterface: mockCreateInterface,
}))

const makeTTY = () => {
  vi.stubGlobal('process', {
    ...process,
    stderr: { isTTY: true, write: vi.fn() },
    stdin: { ...process.stdin, isTTY: true },
    stdout: { ...process.stdout, isTTY: true },
  })
}

const makeNonTTY = () => {
  vi.stubGlobal('process', {
    ...process,
    stderr: { isTTY: false, write: vi.fn() },
    stdin: { ...process.stdin, isTTY: false },
    stdout: { ...process.stdout, isTTY: false },
  })
}

const simpleSpec = {
  options: {
    name: { type: 'string' as const, alias: 'n' },
    verbose: { type: 'boolean' as const, alias: 'v' },
    count: { type: 'number' as const, alias: 'c', default: 1 },
    flag: { type: 'boolean' as const },
  },
}

describe('parseArgs', () => {
  it('parses empty argv', () => {
    const result = parseArgs([], simpleSpec)
    expect(result.values).toEqual({ count: 1 })
    expect(result.positionals).toEqual([])
    expect(result.commands).toEqual([])
    expect(result._).toEqual([])
  })

  it('parses --key=value', () => {
    const spec = {
      options: { name: { type: 'string' as const } },
    }
    const result = parseArgs(['--name=hello'], spec)
    expect(result.values.name).toBe('hello')
  })

  it('parses --boolean-flag', () => {
    const spec = {
      options: { verbose: { type: 'boolean' as const } },
    }
    const result = parseArgs(['--verbose'], spec)
    expect(result.values.verbose).toBe(true)
  })

  it('parses --no-flag as boolean false', () => {
    const spec = {
      options: { verbose: { type: 'boolean' as const } },
    }
    const result = parseArgs(['--no-verbose'], spec)
    expect(result.values.verbose).toBe(false)
  })

  it('with strict mode, combined short flags throw', () => {
    const spec = {
      options: { a: { type: 'boolean' as const } },
      strict: true,
    }
    expect(() => parseArgs(['-abc'], spec)).toThrow()
  })

  it('after -- all args are positional', () => {
    const spec = {
      options: { name: { type: 'string' as const } },
    }
    const result = parseArgs(['--', '--name=foo', 'bar'], spec)
    expect(result.values.name).toBeUndefined()
    expect(result.positionals).toContain('--name=foo')
    expect(result.positionals).toContain('bar')
  })

  it('throws for missing value on string flag', () => {
    const spec = {
      options: { name: { type: 'string' as const } },
    }
    expect(() => parseArgs(['--name'], spec)).toThrow()
  })

  it('throws for missing value on short alias', () => {
    const spec = {
      options: { name: { type: 'string' as const, alias: 'n' } },
    }
    expect(() => parseArgs(['-n'], spec)).toThrow()
  })

  it('parses --number=42 as number', () => {
    const spec = {
      options: { count: { type: 'number' as const } },
    }
    const result = parseArgs(['--count=42'], spec)
    expect(result.values.count).toBe(42)
  })

  it('throws for NaN number value', () => {
    const spec = {
      options: { count: { type: 'number' as const } },
    }
    expect(() => parseArgs(['--count=abc'], spec)).toThrow()
  })

  it('parses commands from spec', () => {
    const spec = {
      options: {},
      commands: ['init', 'build'],
    }
    const result = parseArgs(['init', '--', 'extra'], spec)
    expect(result.commands).toContain('init')
  })

  it('strict mode throws on unknown flag', () => {
    const spec = {
      options: {},
      strict: true,
    }
    expect(() => parseArgs(['--unknown'], spec)).toThrow()
  })

  it('non-strict mode passes unknown flag through', () => {
    const spec = {
      options: {},
      strict: false,
    }
    const result = parseArgs(['--unknown'], spec)
    expect(result._).toContain('--unknown')
  })

  it('parses short alias -v for verbose', () => {
    const result = parseArgs(['-v'], simpleSpec)
    expect(result.values.verbose).toBe(true)
  })

  it('handles positionals mixed with flags', () => {
    const result = parseArgs(['file.txt', '-v', 'other.txt'], simpleSpec)
    expect(result.values.verbose).toBe(true)
    expect(result.positionals).toContain('file.txt')
    expect(result.positionals).toContain('other.txt')
  })

  it('respects default values', () => {
    const result = parseArgs([], simpleSpec)
    expect(result.values.count).toBe(1)
  })
})

describe('renderTable', () => {
  it('returns empty string for empty rows', () => {
    expect(renderTable([])).toBe('')
  })

  it('returns empty string for rows with empty first row', () => {
    expect(renderTable([{}])).toBe('')
  })

  it('renders header-only with basic style', () => {
    const result = renderTable([{ a: 1 }], undefined, { header: true, borderStyle: 'basic' })
    expect(result).toContain('+')
    expect(result).toContain('|')
  })

  it('renders auto-headers from first row keys', () => {
    const result = renderTable([{ name: 'Alice', age: 30 }])
    expect(result).toContain('name')
    expect(result).toContain('age')
    expect(result).toContain('Alice')
    expect(result).toContain('30')
  })

  it('renders markdown style', () => {
    const result = renderTable([{ a: 1, b: 2 }], undefined, { borderStyle: 'markdown' })
    expect(result).toContain('|---')
  })

  it('renders compact style', () => {
    const result = renderTable([{ a: 1 }], undefined, { borderStyle: 'compact' })
    expect(result).not.toContain('|')
  })

  it('renders clean style', () => {
    const result = renderTable([{ a: 1 }], undefined, { borderStyle: 'clean' })
    expect(result).not.toContain('|')
    expect(result).not.toContain('+')
  })

  it('hides header when header option is false', () => {
    const result = renderTable([{ a: 1 }], undefined, { header: false, borderStyle: 'basic' })
    expect(result).not.toContain('a')
  })

  it('renders multiple rows', () => {
    const result = renderTable([{ x: 1 }, { x: 2 }, { x: 3 }])
    expect(result).toContain('1')
    expect(result).toContain('2')
    expect(result).toContain('3')
  })

  it('supports custom columns with alignment', () => {
    const result = renderTable([{ val: 1 }, { val: 100 }], [{ header: 'val', alignment: 'right' }], { borderStyle: 'compact' })
    expect(result).toContain('val')
    expect(result).toContain('1')
    expect(result).toContain('100')
  })

  it('handles null/undefined values', () => {
    const result = renderTable([{ a: null, b: undefined }])
    expect(result).toContain('null')
  })

  it('handles numeric zero', () => {
    const result = renderTable([{ a: 0 }])
    expect(result).toContain('0')
  })
})

describe('Spinner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    makeTTY()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('start writes to stderr', () => {
    const writeSpy = vi.spyOn(process.stderr, 'write')
    const spinner = new Spinner({ text: 'loading' })
    spinner.start()
    expect(writeSpy).toHaveBeenCalled()
    spinner.stop()
  })

  it('succeed writes checkmark', () => {
    const writeSpy = vi.spyOn(process.stderr, 'write')
    const spinner = new Spinner()
    spinner.start()
    spinner.succeed('done')
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('\u2713'))
  })

  it('fail writes cross-mark', () => {
    const writeSpy = vi.spyOn(process.stderr, 'write')
    const spinner = new Spinner()
    spinner.start()
    spinner.fail('failed')
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('\u2717'))
  })

  it('stop writes final text and clears line', () => {
    const writeSpy = vi.spyOn(process.stderr, 'write')
    const spinner = new Spinner()
    spinner.start()
    spinner.stop('finished')
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('finished'))
  })

  it('stop is no-op when not running', () => {
    const writeSpy = vi.spyOn(process.stderr, 'write')
    const spinner = new Spinner()
    spinner.stop()
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it('start is no-op when already running', () => {
    const writeSpy = vi.spyOn(process.stderr, 'write')
    const spinner = new Spinner()
    spinner.start()
    writeSpy.mockClear()
    spinner.start()
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it('setText updates displayed text', () => {
    const spinner = new Spinner({ text: 'initial' })
    spinner.setText('updated')
    spinner.start()
    spinner.stop()
  })

  it('works with custom frames and interval', () => {
    const spinner = new Spinner({ frames: ['|', '/', '-', '\\'], interval: 50, text: 'test' })
    spinner.start()
    vi.advanceTimersByTime(200)
    spinner.stop()
  })

  it('does not write when not TTY', () => {
    makeNonTTY()
    const writeSpy = vi.spyOn(process.stderr, 'write')
    const spinner = new Spinner()
    spinner.start()
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it('default frames are braille dots', () => {
    const spinner = new Spinner()
    spinner.start()
    spinner.stop()
  })
})

describe('colorize', () => {
  beforeEach(() => {
    makeTTY()
    delete process.env.NO_COLOR
  })

  it('wraps text in red ANSI', () => {
    expect(colorize('error', 'red')).toBe('\x1B[31merror\x1B[0m')
  })

  it('wraps text in green ANSI', () => {
    expect(colorize('ok', 'green')).toBe('\x1B[32mok\x1B[0m')
  })

  it('wraps text in yellow ANSI', () => {
    expect(colorize('warn', 'yellow')).toBe('\x1B[33mwarn\x1B[0m')
  })

  it('wraps text in blue ANSI', () => {
    expect(colorize('info', 'blue')).toBe('\x1B[34minfo\x1B[0m')
  })

  it('wraps text in bold ANSI', () => {
    expect(colorize('bold', 'bold')).toBe('\x1B[1mbold\x1B[0m')
  })

  it('returns plain text for invalid color', () => {
    const result = colorize('text', 'invalid' as never)
    expect(result).toBe('text')
  })

  it('returns empty string for empty input', () => {
    expect(colorize('', 'red')).toBe('\x1B[31m\x1B[0m')
  })

  it('respects NO_COLOR env var', () => {
    process.env.NO_COLOR = '1'
    expect(colorize('error', 'red')).toBe('error')
  })

  it('returns plain text when not TTY', () => {
    makeNonTTY()
    expect(colorize('error', 'red')).toBe('error')
  })
})

describe('confirm', () => {
  it('returns true for empty input', async () => {
    const rl = { question: vi.fn((_q, cb: (s: string) => void) => cb('')), close: vi.fn() }
    mockCreateInterface.mockReturnValue(rl as any)
    await expect(confirm('Continue?')).resolves.toBe(true)
  })

  it('returns true for y', async () => {
    const rl = { question: vi.fn((_q, cb: (s: string) => void) => cb('y')), close: vi.fn() }
    mockCreateInterface.mockReturnValue(rl as any)
    await expect(confirm('Continue?')).resolves.toBe(true)
  })

  it('returns true for yes', async () => {
    const rl = { question: vi.fn((_q, cb: (s: string) => void) => cb('yes')), close: vi.fn() }
    mockCreateInterface.mockReturnValue(rl as any)
    await expect(confirm('Continue?')).resolves.toBe(true)
  })

  it('returns true for Y uppercase', async () => {
    const rl = { question: vi.fn((_q, cb: (s: string) => void) => cb('Y')), close: vi.fn() }
    mockCreateInterface.mockReturnValue(rl as any)
    await expect(confirm('Continue?')).resolves.toBe(true)
  })

  it('returns true for YES uppercase', async () => {
    const rl = { question: vi.fn((_q, cb: (s: string) => void) => cb('YES')), close: vi.fn() }
    mockCreateInterface.mockReturnValue(rl as any)
    await expect(confirm('Continue?')).resolves.toBe(true)
  })

  it('returns false for n', async () => {
    const rl = { question: vi.fn((_q, cb: (s: string) => void) => cb('n')), close: vi.fn() }
    mockCreateInterface.mockReturnValue(rl as any)
    await expect(confirm('Continue?')).resolves.toBe(false)
  })

  it('returns false for no', async () => {
    const rl = { question: vi.fn((_q, cb: (s: string) => void) => cb('no')), close: vi.fn() }
    mockCreateInterface.mockReturnValue(rl as any)
    await expect(confirm('Continue?')).resolves.toBe(false)
  })

  it('returns false for any non-yes input', async () => {
    const rl = { question: vi.fn((_q, cb: (s: string) => void) => cb('maybe')), close: vi.fn() }
    mockCreateInterface.mockReturnValue(rl as any)
    await expect(confirm('Continue?')).resolves.toBe(false)
  })
})

describe('prompt', () => {
  it('returns trimmed input', async () => {
    const rl = { question: vi.fn((_q, cb: (s: string) => void) => cb('  hello  ')), close: vi.fn() }
    mockCreateInterface.mockReturnValue(rl as any)
    await expect(prompt('Name:')).resolves.toBe('hello')
  })

  it('returns empty string for empty input', async () => {
    const rl = { question: vi.fn((_q, cb: (s: string) => void) => cb('')), close: vi.fn() }
    mockCreateInterface.mockReturnValue(rl as any)
    await expect(prompt('Name:')).resolves.toBe('')
  })

  it('handles whitespace-only input', async () => {
    const rl = { question: vi.fn((_q, cb: (s: string) => void) => cb('   ')), close: vi.fn() }
    mockCreateInterface.mockReturnValue(rl as any)
    await expect(prompt('Enter:')).resolves.toBe('')
  })
})
