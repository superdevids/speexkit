/**
 * CLI building blocks: argument parsing, table rendering, progress spinners,
 * ANSI colorization, and interactive prompts.
 *
 * @module cli
 */

import * as readline from 'node:readline'

// ─── Types ──────────────────────────────────────────────────────────

/** @public */
export interface ArgOption {
  type: 'string' | 'boolean' | 'number'
  alias?: string
  default?: unknown
  description?: string
}

/** @public */
export interface ArgSpec {
  options: Record<string, ArgOption>
  commands?: string[]
  strict?: boolean
}

/** @public */
export interface ParsedArgs {
  values: Record<string, unknown>
  positionals: string[]
  commands: string[]
  _: string[]
}

/** @public */
export type ColorName = 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray' | 'bold' | 'dim'

/** @public */
export interface TableColumn {
  header: string
  alignment?: 'left' | 'center' | 'right'
  width?: number
}

/** @public */
export interface TableOptions {
  header?: boolean
  borderStyle?: 'basic' | 'compact' | 'markdown' | 'clean'
}

/** @public */
export interface SpinnerOptions {
  frames?: string[]
  interval?: number
  text?: string
}

// ─── ANSI helpers ───────────────────────────────────────────────────

const ANSI_CODES: Record<ColorName, string> = {
  red: '\x1B[31m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  magenta: '\x1B[35m',
  cyan: '\x1B[36m',
  white: '\x1B[37m',
  gray: '\x1B[90m',
  bold: '\x1B[1m',
  dim: '\x1B[2m',
}
const RESET = '\x1B[0m'
const HIDE_CURSOR = '\x1B[?25l'
const SHOW_CURSOR = '\x1B[?25h'

function hasColor(): boolean {
  return !process.env.NO_COLOR && !!process.stderr.isTTY
}

// ─── Coercion ───────────────────────────────────────────────────────

function coerce(value: string, opt: ArgOption | undefined): unknown {
  if (opt?.type === 'number') {
    const n = Number(value)
    if (Number.isNaN(n)) {
      throw new Error(`Expected a number, got "${value}"`)
    }
    return n
  }
  return value
}

function alignCell(text: string, width: number, alignment: 'left' | 'center' | 'right'): string {
  const diff = Math.max(0, width - text.length)
  switch (alignment) {
    case 'right':
      return ' '.repeat(diff) + text
    case 'center':
      return ' '.repeat(Math.floor(diff / 2)) + text + ' '.repeat(Math.ceil(diff / 2))
    default:
      return text + ' '.repeat(diff)
  }
}

// ─── parseArgs ──────────────────────────────────────────────────────

/**
 * Parses command-line arguments against a specification.
 *
 * Supports `--flag value`, `--bool-flag`, `--no-flag` (boolean false),
 * `-a value` (aliases), `--key=value`, and `--` stop parsing.
 *
 * @example
 * const spec: ArgSpec = {
 *   options: {
 *     name: { type: 'string', alias: 'n' },
 *     verbose: { type: 'boolean', alias: 'v' },
 *     count: { type: 'number', alias: 'c', default: 1 },
 *   },
 *   commands: ['init', 'build'],
 * }
 * const args = parseArgs(['--name', 'foo', '-v', '--count=3', 'init'], spec)
 * // args.values  => { name: 'foo', verbose: true, count: 3 }
 * // args.commands => ['init']
 */
export function parseArgs(argv: string[], spec: ArgSpec): ParsedArgs {
  const values: Record<string, unknown> = {}
  const positionals: string[] = []
  const commands: string[] = []
  const remaining: string[] = []
  const knownFlags = new Set(Object.keys(spec.options))
  const aliases: Record<string, string> = {}

  for (const [key, opt] of Object.entries(spec.options)) {
    if (opt.default !== undefined) {
      values[key] = opt.default
    }
    if (opt.alias) {
      aliases[opt.alias] = key
      knownFlags.add(opt.alias)
    }
  }

  const strict = spec.strict ?? false
  let stopParsing = false
  let i = 0

  while (i < argv.length) {
    const arg = argv[i]!

    if (!stopParsing && arg === '--') {
      stopParsing = true
      i++
      continue
    }

    if (!stopParsing && arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=')
      let key: string
      let val: string | undefined

      if (eqIdx !== -1) {
        key = arg.slice(2, eqIdx)
        val = arg.slice(eqIdx + 1)
      } else {
        key = arg.slice(2)
      }

      // --no-flag  → boolean false
      if (val === undefined && key.startsWith('no-')) {
        const boolKey = key.slice(3)
        if (!knownFlags.has(key) && knownFlags.has(boolKey) && spec.options[boolKey]?.type === 'boolean') {
          if (strict && !knownFlags.has(boolKey)) {
            throw new Error(`Unknown flag: --${key}`)
          }
          values[boolKey] = false
          i++
          continue
        }
      }

      if (strict && !knownFlags.has(key)) {
        throw new Error(`Unknown flag: --${key}`)
      }

      if (!knownFlags.has(key)) {
        remaining.push(arg)
        i++
        continue
      }

      const opt = spec.options[key]!
      if (val !== undefined) {
        values[key] = coerce(val, opt)
      } else if (opt.type === 'boolean') {
        values[key] = true
      } else {
        i++
        const nextArg = argv[i]
        if (nextArg === undefined) {
          throw new Error(`Missing value for --${key}`)
        }
        values[key] = coerce(nextArg, opt)
      }
    } else if (!stopParsing && arg.startsWith('-') && arg.length === 2) {
      // -a  (short alias)
      const a = arg[1]!
      const realKey = spec.options[a] ? a : aliases[a]
      if (!realKey) {
        if (strict) {
          throw new Error(`Unknown flag: -${a}`)
        }
        remaining.push(arg)
        i++
        continue
      }
      const opt2 = spec.options[realKey]
      if (!opt2) {
        remaining.push(arg)
        i++
        continue
      }
      if (opt2.type === 'boolean') {
        values[realKey] = true
      } else {
        i++
        const nextArg2 = argv[i]
        if (nextArg2 === undefined) {
          throw new Error(`Missing value for -${a}`)
        }
        values[realKey] = coerce(nextArg2, opt2)
      }
    } else if (!stopParsing && arg.startsWith('-') && arg.length > 2 && !arg.startsWith('--')) {
      // combined short flags like -abc
      if (strict) {
        throw new Error(`Unknown flag: ${arg}`)
      }
      remaining.push(arg)
      i++
      continue
    } else {
      if (!stopParsing && spec.commands?.includes(arg)) {
        commands.push(arg)
      }
      positionals.push(arg)
      remaining.push(arg)
    }

    i++
  }

  return { values, positionals, commands, _: remaining }
}

// ─── Table ──────────────────────────────────────────────────────────

/**
 * ASCII table renderer with multiple border styles.
 *
 * @example
 * const table = renderTable(
 *   [
 *     { name: 'John', age: 30 },
 *     { name: 'Jane', age: 25 },
 *   ],
 *   undefined,
 *   { borderStyle: 'basic' },
 * )
 * // +-------+-----+
 * // | name  | age |
 * // +-------+-----+
 * // | John  | 30  |
 * // | Jane  | 25  |
 * // +-------+-----+
 *
 * @param rows   Array of record objects to display.
 * @param columns  Optional column descriptors. Auto-detected from the first row keys when omitted.
 * @param options  Rendering options.
 */
export function renderTable(rows: Record<string, unknown>[], columns?: TableColumn[], options?: TableOptions): string {
  if (rows.length === 0) return ''

  const firstRow = rows[0]
  if (!firstRow) return ''

  const showHeader = options?.header ?? true
  const style = options?.borderStyle ?? 'basic'

  const cols: TableColumn[] = columns ?? Object.keys(firstRow).map((key) => ({ header: key }))
  if (cols.length === 0) return ''

  // auto-calculate widths
  for (const col of cols) {
    if (col.width !== undefined) continue
    let maxW = col.header.length
    for (const row of rows) {
      const val = row[col.header]
      const display = val === null ? 'null' : val === undefined ? '' : String(val)
      if (display.length > maxW) maxW = display.length
    }
    col.width = maxW
  }

  const lines: string[] = []

  // basic top-border
  if (style === 'basic') {
    const sep = `+${cols.map((c) => '-'.repeat((c.width ?? 0) + 2)).join('+')}+`
    lines.push(sep)
  }

  // header
  if (showHeader) {
    const cells = cols.map((c) => ` ${alignCell(c.header, c.width ?? 0, c.alignment ?? 'left')} `)
    if (style === 'basic' || style === 'markdown') {
      lines.push(`|${cells.join('|')}|`)
    } else if (style === 'compact') {
      lines.push(` ${cells.join(' | ')} `)
    } else {
      lines.push(cells.join('  '))
    }

    if (style === 'basic') {
      const sep = `+${cols.map((c) => '-'.repeat((c.width ?? 0) + 2)).join('+')}+`
      lines.push(sep)
    } else if (style === 'markdown') {
      const sep = `|${cols.map((c) => '-'.repeat(Math.max(3, (c.width ?? 0) + 2))).join('|')}|`
      lines.push(sep)
    }
  }

  // data rows
  for (const row of rows) {
    const cells = cols.map((c) => {
      const v = row[c.header]
      const display = v === null ? 'null' : v === undefined ? '' : String(v)
      return ` ${alignCell(display, c.width ?? 0, c.alignment ?? 'left')} `
    })
    if (style === 'basic' || style === 'markdown') {
      lines.push(`|${cells.join('|')}|`)
    } else if (style === 'compact') {
      lines.push(` ${cells.join(' | ')} `)
    } else {
      lines.push(cells.join('  '))
    }
  }

  // basic bottom-border
  if (style === 'basic') {
    const sep = `+${cols.map((c) => '-'.repeat((c.width ?? 0) + 2)).join('+')}+`
    lines.push(sep)
  }

  return lines.join('\n')
}

// ─── Spinner ────────────────────────────────────────────────────────

/**
 * Terminal progress spinner that writes to stderr.
 *
 * @example
 * const spinner = new Spinner({ text: 'Loading...' })
 * spinner.start()
 * // ... work ...
 * spinner.succeed('Done!')
 */
export class Spinner {
  private frames: string[]
  private interval: number
  private text: string
  private timer: ReturnType<typeof setInterval> | null = null
  private index = 0
  private running = false

  /**
   * @param opts.frames   Spinner animation frames (default: braille dots).
   * @param opts.interval  Frame interval in ms (default: 80).
   * @param opts.text      Initial status text.
   */
  constructor(opts?: SpinnerOptions) {
    this.frames = opts?.frames ?? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    this.interval = opts?.interval ?? 80
    this.text = opts?.text ?? ''
  }

  /**
   * Start the spinner.
   * @param text Optional status text override.
   */
  start(text?: string): void {
    if (this.running) return
    this.running = true
    if (text !== undefined) this.text = text
    if (process.stderr.isTTY) {
      process.stderr.write(HIDE_CURSOR)
      this.render()
      this.timer = setInterval(() => this.render(), this.interval)
    }
  }

  /** Stop the spinner and clear the line. */
  stop(finalText?: string): void {
    if (!this.running) return
    this.cleanup()
    const out = finalText ?? this.text
    if (out) {
      process.stderr.write(`\r${out}\n`)
    } else {
      process.stderr.write('\r')
    }
  }

  /**
   * Update the status text while the spinner is running.
   * @param text New status text.
   */
  setText(text: string): void {
    this.text = text
  }

  /**
   * Stop with a checkmark prefix.
   * @param text Optional status text override.
   */
  succeed(text?: string): void {
    if (!this.running) return
    this.cleanup()
    process.stderr.write(`\r\u2713 ${text ?? this.text}\n`)
  }

  /**
   * Stop with a cross-mark prefix.
   * @param text Optional status text override.
   */
  fail(text?: string): void {
    if (!this.running) return
    this.cleanup()
    process.stderr.write(`\r\u2717 ${text ?? this.text}\n`)
  }

  private render(): void {
    if (!this.running) return
    const frame = this.frames[this.index] ?? this.frames[0] ?? ''
    process.stderr.write(`\r${frame} ${this.text}`)
    this.index = (this.index + 1) % this.frames.length
  }

  private cleanup(): void {
    this.running = false
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (process.stderr.isTTY) {
      process.stderr.write(SHOW_CURSOR)
    }
  }
}

// ─── colorize ───────────────────────────────────────────────────────

/**
 * Wraps text in ANSI escape codes for terminal color / styling.
 * Respects `NO_COLOR` and `process.stderr.isTTY` at call time.
 *
 * @example
 * colorize('error', 'red')   // '\x1B[31merror\x1B[0m'
 * colorize('bold', 'bold')   // '\x1B[1mbold\x1B[0m'
 */
export function colorize(text: string, color: ColorName): string {
  if (!hasColor()) return text
  const code = ANSI_CODES[color]
  if (code === undefined) return text
  return `${code}${text}${RESET}`
}

// ─── confirm / prompt ───────────────────────────────────────────────

/**
 * Ask a yes/no question on the terminal.
 *
 * @example
 * const ok = await confirm('Continue?')
 * // writes "Continue? (Y/n) " to stdout
 * // reads line from stdin; returns true for y/yes/enter
 */
export function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question(`${question} (Y/n) `, (answer: string) => {
      rl.close()
      const trimmed = answer.trim().toLowerCase()
      resolve(trimmed === '' || trimmed === 'y' || trimmed === 'yes')
    })
  })
}

/**
 * Ask for arbitrary text input on the terminal.
 *
 * @example
 * const name = await prompt('Enter your name')
 * // writes "Enter your name" to stdout
 * // reads line from stdin; returns trimmed response
 */
export function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    rl.question(question, (answer: string) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}
