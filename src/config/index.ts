/**
 * Layered Configuration Management: load, merge, mask, and watch configuration
 * from multiple sources (object, file, env, CLI).
 *
 * @module config
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ─── Types ──────────────────────────────────────────────────────────────────

/** @public */
export interface ConfigSource {
  type: 'object' | 'file' | 'env' | 'cli'
  priority?: number
  value?: Record<string, unknown>
  path?: string
  prefix?: string
  argv?: string[]
}

/** @public */
export interface LoadConfigOptions<T> {
  sources: ConfigSource[]
  schema?: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { message: string } } }
  defaults?: Partial<T>
}

// ─── Internal helpers ────────────────────────────────────────────────────────

const COMMON_SECRET_KEYS = ['password', 'secret', 'token', 'key', 'apikey', 'api_key', 'jwt']

function isSecretKey(key: string, keys: string[]): boolean {
  const lower = key.toLowerCase()
  return keys.some((k) => lower.includes(k.toLowerCase()))
}

function autoConvertValue(value: string): unknown {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (value === 'undefined') return undefined
  const num = Number(value)
  if (!Number.isNaN(num) && value.trim() !== '') return num
  return value
}

function parseEnvFile(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const k = trimmed.slice(0, eqIdx).trim()
    const v = trimmed.slice(eqIdx + 1).trim()
    if (k.length > 0) {
      result[k] = autoConvertValue(v)
    }
  }
  return result
}

function readFileConfig(filePath: string): Record<string, unknown> {
  const resolved = path.resolve(filePath)
  const content = fs.readFileSync(resolved, 'utf-8')
  if (filePath.endsWith('.env')) {
    return parseEnvFile(content)
  }
  return JSON.parse(content) as Record<string, unknown>
}

function readEnvConfig(prefix?: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue
    if (prefix !== undefined) {
      if (!key.startsWith(prefix)) continue
      const stripped = key.slice(prefix.length)
      if (stripped.length > 0) {
        result[stripped] = autoConvertValue(value)
      }
    } else {
      result[key] = autoConvertValue(value)
    }
  }
  return result
}

function readCliConfig(argv?: string[]): Record<string, unknown> {
  const args = argv ?? process.argv.slice(2)
  const result: Record<string, unknown> = {}
  for (const arg of args) {
    if (!arg.startsWith('--')) continue
    const stripped = arg.slice(2)
    const eqIdx = stripped.indexOf('=')
    if (eqIdx !== -1) {
      const k = stripped.slice(0, eqIdx)
      const v = stripped.slice(eqIdx + 1)
      if (k.length > 0) result[k] = autoConvertValue(v)
    } else {
      result[stripped] = true
    }
  }
  return result
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      if (target[key] === null || target[key] === undefined || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {}
      }
      deepMerge(target[key] as Record<string, unknown>, value as Record<string, unknown>)
    } else {
      target[key] = value
    }
  }
}

function deepMask(obj: Record<string, unknown>, secretKeys: string[], result: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested: Record<string, unknown> = {}
      result[key] = nested
      deepMask(value as Record<string, unknown>, secretKeys, nested)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (item !== null && typeof item === 'object') {
          const arrNested: Record<string, unknown> = {}
          deepMask(item as Record<string, unknown>, secretKeys, arrNested)
          return arrNested
        }
        return isSecretKey(key, secretKeys) ? '***' : item
      })
    } else {
      result[key] = isSecretKey(key, secretKeys) ? '***' : value
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Load and merge configuration from multiple sources.
 *
 * Sources are applied in ascending priority order (higher priority overrides lower).
 * Defaults are applied first, then file/env/cli/object sources in priority order.
 *
 * @typeParam T - The shape of the resulting configuration.
 * @param opts - Load options including sources, optional schema, and defaults.
 * @returns The merged configuration object.
 *
 * @example
 * ```ts
 * const config = loadConfig({
 *   defaults: { port: 3000 },
 *   sources: [
 *     fileSource('./config.json', 10),
 *     envSource('APP_', 20),
 *   ],
 * })
 * ```
 */
export function loadConfig<T>(opts: LoadConfigOptions<T>): T {
  const merged: Record<string, unknown> = {}

  // Apply defaults first
  if (opts.defaults) {
    deepMerge(merged, opts.defaults as Record<string, unknown>)
  }

  // Sort sources by priority ascending so higher priority overrides lower
  const sorted = [...opts.sources].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))

  for (const source of sorted) {
    let data: Record<string, unknown> = {}

    switch (source.type) {
      case 'object': {
        data = { ...(source.value ?? {}) }
        break
      }
      case 'file': {
        if (source.path) {
          try {
            data = readFileConfig(source.path)
          } catch {
            // silently skip missing/unreadable files
          }
        }
        break
      }
      case 'env': {
        data = readEnvConfig(source.prefix)
        break
      }
      case 'cli': {
        data = readCliConfig(source.argv)
        break
      }
    }

    deepMerge(merged, data)
  }

  // Validate with schema if provided
  if (opts.schema) {
    const result = opts.schema.safeParse(merged)
    if (!result.success) {
      throw new Error(`Config validation failed: ${result.error?.message ?? 'Unknown error'}`)
    }
    return result.data as T
  }

  return merged as T
}

/**
 * Return a copy of the config object with secret values masked.
 *
 * Deeply traverses nested objects. Array items containing objects are also masked.
 *
 * @param config - The configuration object to mask.
 * @param keys - Custom list of secret key patterns (defaults to common secret keys).
 * @returns A new object with secrets replaced by `'***'`.
 *
 * @example
 * ```ts
 * const masked = maskSecrets({ db: { password: 'hunter2' } })
 * // => { db: { password: '***' } }
 * ```
 */
export function maskSecrets<T extends Record<string, unknown>>(config: T, keys?: string[]): Partial<T> {
  const secretKeys = keys ?? COMMON_SECRET_KEYS
  const result: Record<string, unknown> = {}
  deepMask(config as Record<string, unknown>, secretKeys, result)
  return result as Partial<T>
}

/**
 * Watch a JSON config file for changes and invoke a callback when it changes.
 *
 * Uses `fs.watchFile` under the hood. The callback receives the freshly parsed
 * configuration object.
 *
 * @param filePath - Path to the JSON config file to watch.
 * @param onChange - Callback invoked on every detected change.
 * @returns An object with a `stop()` method to stop watching.
 *
 * @example
 * ```ts
 * const watcher = watchConfig('./config.json', (config) => {
 *   console.log('Config reloaded:', config)
 * })
 * // Later:
 * watcher.stop()
 * ```
 */
export function watchConfig(filePath: string, onChange: (config: Record<string, unknown>) => void): { stop(): void } {
  if (!filePath) {
    throw new Error('filePath must be a non-empty string')
  }
  const resolved = path.resolve(filePath)

  fs.watchFile(resolved, { interval: 1007 }, () => {
    try {
      const content = fs.readFileSync(resolved, 'utf-8')
      const config = JSON.parse(content) as Record<string, unknown>
      onChange(config)
    } catch {
      // Silently ignore parse/read errors during polling
    }
  })

  return {
    stop(): void {
      fs.unwatchFile(resolved)
    },
  }
}

/**
 * Create a file-based config source.
 *
 * Supports `.json` and `.env` files. JSON files are parsed with `JSON.parse`;
 * `.env` files are parsed as `KEY=VALUE` lines.
 *
 * @param filePath - Path to the JSON or .env file.
 * @param priority - Priority for source ordering (default 0).
 * @returns A {@link ConfigSource} of type `'file'`.
 */
export function fileSource(path: string, priority?: number): ConfigSource {
  return { type: 'file', path, priority }
}

/**
 * Create an environment-variable-based config source.
 *
 * When a prefix is provided, only variables starting with that prefix are included
 * and the prefix is stripped from the resulting keys.
 *
 * @param prefix - Optional prefix to filter and strip from env var names.
 * @param priority - Priority for source ordering (default 0).
 * @returns A {@link ConfigSource} of type `'env'`.
 */
export function envSource(prefix?: string, priority?: number): ConfigSource {
  return { type: 'env', prefix, priority }
}

/**
 * Create a CLI-argument-based config source.
 *
 * Parses `--key=value` (string/number) and `--flag` (boolean `true`) arguments.
 *
 * @param argv - Array of CLI arguments (defaults to `process.argv.slice(2)`).
 * @param priority - Priority for source ordering (default 0).
 * @returns A {@link ConfigSource} of type `'cli'`.
 */
export function cliSource(argv?: string[], priority?: number): ConfigSource {
  return { type: 'cli', argv, priority }
}
