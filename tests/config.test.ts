import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  loadConfig,
  maskSecrets,
  watchConfig,
  fileSource,
  envSource,
  cliSource,
} from '../src/config/index.js'

describe('loadConfig', () => {
  it('returns empty object with no sources', () => {
    expect(loadConfig({ sources: [] })).toEqual({})
  })

  it('silently skips nonexistent file source', () => {
    const result = loadConfig({
      sources: [fileSource('./nonexistent-file-that-does-not-exist.json')],
    })
    expect(() => result).not.toThrow()
  })

  it('reads from envSource with prefix', () => {
    vi.stubEnv('APP_PORT', '8080')
    vi.stubEnv('APP_HOST', 'localhost')
    vi.stubEnv('OTHER_VAR', 'should-be-ignored')

    const result = loadConfig({
      sources: [envSource('APP_')],
    })

    expect(result).toHaveProperty('PORT')
    expect(result).toHaveProperty('HOST')
    expect(result).not.toHaveProperty('OTHER_VAR')
    vi.unstubAllEnvs()
  })

  it('reads all env vars when no prefix given', () => {
    vi.stubEnv('MY_TEST_KEY', 'value123')
    const result = loadConfig({
      sources: [envSource()],
    })
    expect(result).toHaveProperty('MY_TEST_KEY')
    vi.unstubAllEnvs()
  })

  it('reads from object source', () => {
    const result = loadConfig({
      sources: [{ type: 'object', value: { key: 'value' } }],
    })
    expect(result).toEqual({ key: 'value' })
  })

  it('reads from object source with nested values', () => {
    const result = loadConfig({
      sources: [{ type: 'object', value: { nested: { a: 1 } } }],
    })
    expect(result).toEqual({ nested: { a: 1 } })
  })

  it('later sources override earlier ones', () => {
    const result = loadConfig({
      sources: [
        { type: 'object', value: { key: 'first', other: 'keep' }, priority: 0 },
        { type: 'object', value: { key: 'second' }, priority: 10 },
      ],
    })
    expect(result).toEqual({ key: 'second', other: 'keep' })
  })

  it('applies defaults before sources', () => {
    const result = loadConfig({
      defaults: { port: 3000, host: 'localhost' },
      sources: [{ type: 'object', value: { port: 8080 } }],
    })
    expect(result).toEqual({ port: 8080, host: 'localhost' })
  })

  it('sources without priority default to 0', () => {
    const result = loadConfig({
      sources: [
        { type: 'object', value: { a: 1 } },
        { type: 'object', value: { a: 2, b: 3 } },
      ],
    })
    expect(result).toEqual({ a: 2, b: 3 })
  })

  it('merges deeply nested objects', () => {
    const result = loadConfig({
      sources: [
        { type: 'object', value: { db: { host: 'localhost', port: 5432 } } },
        { type: 'object', value: { db: { port: 5433 } } },
      ],
    })
    expect(result).toEqual({ db: { host: 'localhost', port: 5433 } })
  })

  it('reads from cliSource with custom argv', () => {
    const result = loadConfig({
      sources: [cliSource(['--port=9090', '--verbose'])],
    })
    expect(result).toEqual({ port: 9090, verbose: true })
  })

  it('validates config against schema', () => {
    const schema = {
      safeParse: (data: unknown) => {
        const d = data as Record<string, unknown>
        if (typeof d.port === 'number') {
          return { success: true as const, data: d }
        }
        return { success: false as const, error: { message: 'port must be a number' } }
      },
    }

    const result = loadConfig({
      sources: [{ type: 'object', value: { port: 8080 } }],
      schema,
    })
    expect(result).toEqual({ port: 8080 })
  })

  it('throws when schema validation fails', () => {
    const schema = {
      safeParse: () => ({ success: false as const, error: { message: 'validation failed' } }),
    }

    expect(() =>
      loadConfig({
        sources: [{ type: 'object', value: { port: 'invalid' } }],
        schema,
      }),
    ).toThrow('validation failed')
  })

  it('auto-converts env string values', () => {
    vi.stubEnv('FLAG', 'true')
    vi.stubEnv('COUNT', '42')
    vi.stubEnv('NONE', 'null')

    const result = loadConfig({
      sources: [envSource()],
    })

    expect(result).toHaveProperty('FLAG', true)
    expect(result).toHaveProperty('COUNT', 42)
    expect(result).toHaveProperty('NONE', null)
    vi.unstubAllEnvs()
  })
})

describe('maskSecrets', () => {
  it('masks password key', () => {
    const result = maskSecrets({ password: 'secret' })
    expect(result).toEqual({ password: '***' })
  })

  it('masks nested secret key', () => {
    const result = maskSecrets({ nested: { key: 'secret' } })
    expect(result).toEqual({ nested: { key: '***' } })
  })

  it('returns unchanged for empty config', () => {
    const result = maskSecrets({})
    expect(result).toEqual({})
  })

  it('throws on null config', () => {
    expect(() => maskSecrets(null as unknown as Record<string, unknown>)).toThrow()
  })

  it('masks custom keys provided', () => {
    const result = maskSecrets({ dbpass: 'hunter2' }, ['dbpass'])
    expect(result).toEqual({ dbpass: '***' })
  })

  it('masks api_key case-insensitively', () => {
    const result = maskSecrets({ API_KEY: 'abc123' })
    expect(result).toEqual({ API_KEY: '***' })
  })

  it('masks token key', () => {
    const result = maskSecrets({ token: 'jwt-token-value' })
    expect(result).toEqual({ token: '***' })
  })

  it('does not mask non-secret keys', () => {
    const result = maskSecrets({ name: 'public', password: 'secret' })
    expect(result).toEqual({ name: 'public', password: '***' })
  })

  it('returns a new object not mutating original', () => {
    const original = { password: 'secret' }
    const result = maskSecrets(original)
    expect(result).not.toBe(original)
    expect(original.password).toBe('secret')
  })

  it('masks deeply nested secrets in arrays', () => {
    const result = maskSecrets({ users: [{ password: 'secret' }] })
    expect(result).toEqual({ users: [{ password: '***' }] })
  })

  it('deeply masks nested objects with secret keys', () => {
    const config = {
      database: {
        connection: { password: 'hunter2' },
        host: 'localhost',
      },
    }
    const result = maskSecrets(config)
    expect(result).toEqual({
      database: {
        connection: { password: '***' },
        host: 'localhost',
      },
    })
  })
})

describe('watchConfig', () => {
  it('throws on empty file path', () => {
    expect(() => watchConfig('', vi.fn())).toThrow()
  })

  it('returns a stop function', () => {
    const watcher = watchConfig('./vitest.config.ts', vi.fn())
    expect(watcher).toHaveProperty('stop')
    expect(typeof watcher.stop).toBe('function')
    watcher.stop()
  })
})

describe('fileSource', () => {
  it('returns a ConfigSource of type file', () => {
    const source = fileSource('/path/to/config.json')
    expect(source.type).toBe('file')
    expect(source.path).toBe('/path/to/config.json')
  })

  it('includes priority when provided', () => {
    const source = fileSource('/path/to/config.json', 50)
    expect(source.priority).toBe(50)
  })

  it('defaults priority to undefined', () => {
    const source = fileSource('/path/to/config.json')
    expect(source.priority).toBeUndefined()
  })
})

describe('envSource', () => {
  it('returns a ConfigSource of type env', () => {
    const source = envSource('APP_')
    expect(source.type).toBe('env')
    expect(source.prefix).toBe('APP_')
  })

  it('prefix is optional', () => {
    const source = envSource()
    expect(source.prefix).toBeUndefined()
  })
})

describe('cliSource', () => {
  it('returns a ConfigSource of type cli', () => {
    const source = cliSource(['--port=3000'])
    expect(source.type).toBe('cli')
    expect(source.argv).toEqual(['--port=3000'])
  })

  it('argv is optional', () => {
    const source = cliSource()
    expect(source.type).toBe('cli')
  })
})
