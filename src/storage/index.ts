/**
 * Low-level storage abstraction over a key-value store.
 */
export interface StorageDriver {
  /** Retrieves a value by key, or `null` if absent. */
  get(key: string): string | null
  /** Stores a value under the given key. */
  set(key: string, value: string): void
  /** Removes a single entry by key. */
  remove(key: string): void
  /** Removes all entries. */
  clear(): void
  /** Returns every key in the store. */
  keys(): string[]
}

/**
 * Shape of a value persisted by the {@link Storage} class.
 */
interface StoredWrapper {
  value: unknown
  expires?: number
}

/**
 * Creates an in-memory Map-based driver (SSR/Node friendly).
 *
 * @example
 * const driver = memoryDriver()
 * driver.set('x', '1')
 * driver.get('x') // '1'
 */
export function memoryDriver(): StorageDriver {
  const store = new Map<string, string>()

  return {
    get(key: string): string | null {
      return store.get(key) ?? null
    },
    set(key: string, value: string): void {
      store.set(key, value)
    },
    remove(key: string): void {
      store.delete(key)
    },
    clear(): void {
      store.clear()
    },
    keys(): string[] {
      return Array.from(store.keys())
    },
  }
}

/**
 * Creates a driver wrapping `window.localStorage`.
 *
 * @example
 * const driver = localStorageDriver()
 * driver.set('theme', 'dark')
 * driver.get('theme') // 'dark'
 */
export function localStorageDriver(): StorageDriver {
  return {
    get(key: string): string | null {
      try {
        return globalThis.localStorage?.getItem(key) ?? null
      } catch {
        return null
      }
    },
    set(key: string, value: string): void {
      try {
        globalThis.localStorage?.setItem(key, value)
      } catch {
        // quota exceeded or storage unavailable — swallow
      }
    },
    remove(key: string): void {
      try {
        globalThis.localStorage?.removeItem(key)
      } catch {
        // noop
      }
    },
    clear(): void {
      try {
        globalThis.localStorage?.clear()
      } catch {
        // noop
      }
    },
    keys(): string[] {
      try {
        if (!globalThis.localStorage) return []
        const result: string[] = []
        for (let i = 0; i < globalThis.localStorage.length; i++) {
          const k = globalThis.localStorage.key(i)
          if (k !== null) result.push(k)
        }
        return result
      } catch {
        return []
      }
    },
  }
}

/**
 * Creates a driver wrapping `window.sessionStorage`.
 *
 * @example
 * const driver = sessionStorageDriver()
 * driver.set('token', 'abc')
 * driver.get('token') // 'abc'
 */
export function sessionStorageDriver(): StorageDriver {
  return {
    get(key: string): string | null {
      try {
        return globalThis.sessionStorage?.getItem(key) ?? null
      } catch {
        return null
      }
    },
    set(key: string, value: string): void {
      try {
        globalThis.sessionStorage?.setItem(key, value)
      } catch {
        // quota exceeded or storage unavailable — swallow
      }
    },
    remove(key: string): void {
      try {
        globalThis.sessionStorage?.removeItem(key)
      } catch {
        // noop
      }
    },
    clear(): void {
      try {
        globalThis.sessionStorage?.clear()
      } catch {
        // noop
      }
    },
    keys(): string[] {
      try {
        if (!globalThis.sessionStorage) return []
        const result: string[] = []
        for (let i = 0; i < globalThis.sessionStorage.length; i++) {
          const k = globalThis.sessionStorage.key(i)
          if (k !== null) result.push(k)
        }
        return result
      } catch {
        return []
      }
    },
  }
}

/**
 * Options accepted by {@link cookieDriver}.
 */
export interface CookieDriverOptions {
  /** Cookie domain. */
  domain?: string
  /** Cookie path (default `"/"`). */
  path?: string
  /** Restrict to HTTPS only. */
  secure?: boolean
  /** SameSite policy. */
  sameSite?: 'strict' | 'lax' | 'none'
}

/**
 * Character used to separate individual cookies in a single value header.
 */
const COOKIE_VALUE_SEP = '\u0000'

/**
 * Creates a driver wrapping `document.cookie`.
 *
 * **Limitations:**
 * - Maximum cookie size is ~4 KB per entry.
 * - Browsers limit the number of cookies per domain (~50–150).
 * - Values are URL-encoded; binary data is not supported.
 *
 * @example
 * const driver = cookieDriver({ path: '/', secure: true })
 * driver.set('pref', 'dark')
 * driver.get('pref') // 'dark'
 */
export function cookieDriver(opts?: CookieDriverOptions): StorageDriver {
  const path = opts?.path ?? '/'

  /** Reads and parses `document.cookie` into a `Map`. */
  function readAll(): Map<string, string> {
    const map = new Map<string, string>()
    try {
      const raw = globalThis.document?.cookie
      if (!raw) return map

      for (const pair of raw.split('; ')) {
        const sep = pair.indexOf('=')
        if (sep === -1) continue
        const name = pair.slice(0, sep)
        const value = pair.slice(sep + 1)
        if (!name) continue
        // Multiple values are joined with the separator char
        const decoded = decodeURIComponent(value)
        const existing = map.get(name)
        map.set(name, existing ? `${existing}${COOKIE_VALUE_SEP}${decoded}` : decoded)
      }
    } catch {
      // document.cookie unavailable — swallow
    }
    return map
  }

  /** Builds a `Set-Cookie`-style string for a single key-value pair. */
  function serialize(name: string, value: string): string {
    const encoded = encodeURIComponent(value)
    let cookie = `${name}=${encoded}; path=${path}`
    if (opts?.domain) cookie += `; domain=${opts.domain}`
    if (opts?.secure) cookie += '; secure'
    if (opts?.sameSite) cookie += `; samesite=${opts.sameSite}`
    return cookie
  }

  return {
    get(key: string): string | null {
      const map = readAll()
      return map.get(key) ?? null
    },

    set(key: string, value: string): void {
      try {
        globalThis.document.cookie = serialize(key, value)
      } catch {
        // unavailable — swallow
      }
    },

    remove(key: string): void {
      try {
        let cookie = `${key}=; path=${path}; max-age=0`
        if (opts?.domain) cookie += `; domain=${opts.domain}`
        globalThis.document.cookie = cookie
      } catch {
        // unavailable — swallow
      }
    },

    clear(): void {
      try {
        const map = readAll()
        for (const key of map.keys()) {
          this.remove(key)
        }
      } catch {
        // unavailable — swallow
      }
    },

    keys(): string[] {
      const map = readAll()
      return Array.from(map.keys())
    },
  }
}

/**
 * Options for the {@link Storage} constructor and {@link createStorage} factory.
 */
export interface StorageOptions {
  /**
   * Driver selection.
   * - `'auto'` — prefers `localStorage` when available (browser), falls back to in-memory (SSR/Node).
   * - `'memory'`, `'local'`, `'session'`, `'cookie'` — explicit built-in driver.
   * - A custom {@link StorageDriver} instance.
   *
   * @default 'auto'
   */
  driver?: 'auto' | 'memory' | 'local' | 'session' | 'cookie' | StorageDriver
  /** Optional namespace prefixed (with `:`) to every key. */
  namespace?: string
  /**
   * Default TTL in milliseconds. When set, entries expire after this
   * duration. Can be overridden per `set()` call.
   */
  ttl?: number
}

/**
 * Resolves a `driver` option to a concrete {@link StorageDriver} instance.
 */
function resolveDriver(driver: StorageOptions['driver']): StorageDriver {
  if (driver === undefined || driver === 'auto') {
    try {
      if (typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined') {
        return localStorageDriver()
      }
    } catch {
      // noop
    }
    return memoryDriver()
  }

  if (driver === 'memory') return memoryDriver()
  if (driver === 'local') return localStorageDriver()
  if (driver === 'session') return sessionStorageDriver()
  if (driver === 'cookie') return cookieDriver()

  // Assume it's a custom StorageDriver instance
  return driver
}

/**
 * High-level storage wrapper with automatic JSON serialisation,
 * namespace isolation, and TTL-based entry expiry.
 *
 * @example
 * const store = new Storage({ namespace: 'app', ttl: 60_000 })
 * store.set('theme', 'dark')
 * store.get('theme') // 'dark'
 * store.keys()       // ['theme']
 */
export class Storage {
  /** The namespace (read-only). */
  readonly namespace: string

  private readonly driver: StorageDriver
  private readonly defaultTtl: number | undefined

  constructor(opts: StorageOptions = {}) {
    this.driver = resolveDriver(opts.driver)
    this.namespace = opts.namespace ?? ''
    this.defaultTtl = opts.ttl
  }

  /**
   * Retrieves a value by key.
   *
   * Automatically parses the stored JSON and checks expiry.
   * Returns `null` when the key is absent or the entry has expired.
   *
   * @typeParam T - Expected return type (default `string`).
   */
  get<T = string>(key: string): T | null {
    const raw = this.driver.get(this.prefix(key))
    if (raw === null) return null

    let parsed: StoredWrapper
    try {
      parsed = JSON.parse(raw) as StoredWrapper
    } catch {
      // Invalid JSON — treat as missing
      return null
    }

    if (parsed.expires !== undefined && Date.now() >= parsed.expires) {
      this.driver.remove(this.prefix(key))
      return null
    }

    return parsed.value as T
  }

  /**
   * Stores a value under the given key.
   *
   * Automatically JSON-stringifies the value. If `opts.ttl` is provided
   * it overrides the instance-level default; pass `0` or `undefined` to
   * disable TTL for this particular entry.
   */
  set(key: string, value: unknown, opts?: { ttl?: number }): void {
    const ttl = opts?.ttl ?? this.defaultTtl
    const wrapper: StoredWrapper = {
      value,
      expires: ttl !== undefined && ttl > 0 ? Date.now() + ttl : undefined,
    }
    this.driver.set(this.prefix(key), JSON.stringify(wrapper))
  }

  /**
   * Removes a single entry by key.
   */
  remove(key: string): void {
    this.driver.remove(this.prefix(key))
  }

  /**
   * Removes all entries scoped to this namespace (or all entries if
   * no namespace is set).
   */
  clear(): void {
    if (!this.namespace) {
      this.driver.clear()
      return
    }

    const prefix = this.namespace + ':'
    for (const key of this.driver.keys()) {
      if (key.startsWith(prefix)) {
        this.driver.remove(key)
      }
    }
  }

  /**
   * Returns all keys within this namespace (with the namespace prefix
   * stripped from each).
   */
  keys(): string[] {
    if (!this.namespace) return this.driver.keys()

    const prefix = this.namespace + ':'
    const result: string[] = []
    for (const key of this.driver.keys()) {
      if (key.startsWith(prefix)) {
        result.push(key.slice(prefix.length))
      }
    }
    return result
  }

  /** Prepends the namespace to a key (with `:` separator). */
  private prefix(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key
  }
}

/**
 * Creates a {@link Storage} instance with the given options.
 *
 * @example
 * // Auto-detected driver (localStorage in browser, memory in Node)
 * const store = createStorage({ namespace: 'myapp', ttl: 120_000 })
 *
 * @example
 * // Explicit session storage with no namespace
 * const session = createStorage({ driver: 'session' })
 */
export function createStorage(opts: StorageOptions = {}): Storage {
  return new Storage(opts)
}
