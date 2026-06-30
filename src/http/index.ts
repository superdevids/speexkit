/**
 * @file HTTP Client & Middleware module for speexkit
 *
 * Zero runtime dependencies (native fetch), ESM-only, TypeScript strict.
 * Provides a factory-based HTTP client with interceptors, retry with
 * exponential backoff, circuit breaker, and a token-bucket rate limiter.
 */

/* ------------------------------------------------------------------ */
/*  Exceptions                                                         */
/* ------------------------------------------------------------------ */

/**
 * Error thrown when the server responds with a non-2xx status code.
 *
 * Carries the HTTP status, status text, and the parsed response body so
 * callers can inspect server-side error details without extra work.
 */
export class HttpError extends Error {
  /**
   * @param status   HTTP status code (e.g. 404, 500)
   * @param statusText  HTTP status text (e.g. "Not Found")
   * @param body     Parsed response body (object / string / null)
   */
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status} ${statusText}`)
    this.name = 'HttpError'
  }
}

/* ------------------------------------------------------------------ */
/*  Core types                                                         */
/* ------------------------------------------------------------------ */

/**
 * Configuration for a single outgoing request. This is the object that
 * passes through the interceptor pipeline before fetch is called.
 */
export interface RequestConfig {
  url: string
  method: string
  headers: Record<string, string>
  body?: unknown
  signal?: AbortSignal
}

/**
 * A single interceptor that can tap into the request / response / error
 * lifecycle. Each method is optional; return the (possibly mutated) value
 * to continue the pipeline.
 */
export interface Interceptor {
  request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  response?: (response: Response, config: RequestConfig) => Response | Promise<Response>
  error?: (error: unknown, config: RequestConfig) => unknown
}

/**
 * Wraps a parsed HTTP response with a chainable interface.
 *
 * @typeParam T – type of the parsed body (defaults to `unknown`)
 */
export interface HttpResponse<T = unknown> {
  /** Parsed response body (JSON-deserialised or plain text). */
  readonly data: T
  /** HTTP status code. */
  readonly status: number
  /** Raw `Headers` object from the native Response. */
  readonly headers: Headers
  /** `true` when `status` is in the 2xx range. */
  readonly ok: boolean
  /**
   * Re-parse the response body through an external schema validator
   * (e.g. Zod, Valibot, ArkType). Returns a promise that resolves to
   * the validated value or rejects with a validation error.
   *
   * @example
   * const user = await res.parseAs(UserSchema)
   */
  parseAs<S>(schema: { parse: (data: unknown) => S }): Promise<S>
}

/** Retry options for exponential-backoff retry behaviour. */
export interface RetryOptions {
  /** Maximum number of attempts (including the first). Must be >= 1. */
  maxAttempts: number
  /** Base delay in ms before the first retry (default: 1 000). */
  baseDelay?: number
}

/** Options accepted by the `createHttpClient` factory. */
export interface HttpClientOptions {
  /** Base URL prepended to every request path. */
  baseURL?: string
  /** Default headers merged into every request. */
  headers?: Record<string, string>
  /**
   * Request timeout in milliseconds (default: 30 000).
   * A value of `0` disables the timeout.
   */
  timeout?: number
  /** Default retry policy applied to every request. */
  retry?: RetryOptions
}

/** Options for the circuit-breaker decorator. */
export interface CircuitBreakerOptions {
  /** Number of consecutive failures that trip the breaker. */
  failureThreshold: number
  /** Milliseconds to wait before allowing a trial request (half-open). */
  resetMs: number
}

/** Options for the token-bucket rate limiter middleware. */
export interface RateLimitMiddlewareOptions {
  /** Maximum requests allowed per time window. */
  maxRequests: number
  /** Width of the time window in milliseconds. */
  windowMs: number
  /**
   * Optional function that extracts a rate-limit key from the request
   * config. Every unique key gets its own token bucket. When omitted a
   * single global bucket is used.
   */
  key?: (config: RequestConfig) => string
}

/** HTTP verb aliases that the client exposes as methods. */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/** Options a caller can pass to individual request methods. */
export interface RequestOptions {
  headers?: Record<string, string>
  signal?: AbortSignal
}

/* ------------------------------------------------------------------ */
/*  Public interface of the HTTP client                                */
/* ------------------------------------------------------------------ */

/**
 * An HTTP client created by {@link createHttpClient}.
 *
 * Provides convenience methods for GET, POST, PUT, DELETE, and PATCH,
 * as well as the ability to compose interceptors, retry, and a
 * circuit-breaker decorator.
 */
export interface HttpClient {
  get<T = unknown>(url: string, opts?: RequestOptions): Promise<HttpResponse<T>>
  post<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<HttpResponse<T>>
  put<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<HttpResponse<T>>
  delete<T = unknown>(url: string, opts?: RequestOptions): Promise<HttpResponse<T>>
  patch<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<HttpResponse<T>>
  /**
   * Append an interceptor to the pipeline. Interceptors are executed in
   * registration order: request → fetch → response → error.
   */
  use(interceptor: Interceptor): HttpClient
  /**
   * Return a **new** client instance whose default retry options are set
   * to the supplied value. The original client is not mutated.
   */
  withRetry(opts: RetryOptions): HttpClient
  /**
   * Return a **new** client instance decorated with a circuit breaker.
   * The breaker tracks failures per URL pattern and short-circuits
   * requests when the threshold is exceeded, giving upstream services
   * time to recover.
   */
  withCircuitBreaker(opts: CircuitBreakerOptions): HttpClient
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Sleep for `ms` milliseconds.
 * Exported as an internal utility so it can be reused by other modules.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate the delay for the n-th retry attempt using exponential
 * backoff with jitter.
 *
 * @param attempt  Zero-based attempt index (0 = first retry)
 * @param baseDelay  Base delay in ms
 * @returns Delay in ms for this attempt
 */
function backoffDelay(attempt: number, baseDelay: number): number {
  const exponential = baseDelay * 2 ** attempt
  const jitter = Math.random() * exponential * 0.25
  return Math.min(exponential + jitter, 30_000) // cap at 30 s
}

/**
 * Resolve the effective URL by prepending `baseURL` when `path` is a
 * relative URL.
 */
function resolveURL(baseURL: string | undefined, path: string): string {
  if (!baseURL) return path
  if (/^https?:\/\//i.test(path)) return path
  const base = baseURL.replace(/\/+$/, '')
  const relative = path.replace(/^\/+/, '')
  return `${base}/${relative}`
}

/**
 * Create an `AbortSignal` that triggers after `ms` milliseconds.
 * Returns `undefined` when `ms` is falsy (no timeout).
 */
function timeoutSignal(ms: number): AbortSignal | undefined {
  if (!ms || ms <= 0) return undefined
  return AbortSignal.timeout(ms)
}

/**
 * Parse the body of a `Response` according to its Content-Type.
 * - `application/json`         → JSON.parse
 * - `text/*`                    → text
 * - Everything else             → text (caller can re-parse)
 */
async function parseBody(response: Response): Promise<unknown> {
  const ct = (response.headers.get('content-type') ?? '').toLowerCase()
  if (ct.includes('application/json')) {
    // Handle empty body gracefully
    const text = await response.text()
    return text ? JSON.parse(text) : null
  }
  if (ct.startsWith('text/')) {
    return response.text()
  }
  return response.text()
}

/* ------------------------------------------------------------------ */
/*  Pipeline runner                                                    */
/* ------------------------------------------------------------------ */

/**
 * Internal workhorse that runs the full interceptor pipeline, handles
 * retry and circuit-breaking.
 */
async function executeRequest(
  config: RequestConfig,
  interceptors: Interceptor[],
  retryOpts: RetryOptions | undefined,
  breaker: BreakerState | undefined,
  abortedRef: { aborted: boolean },
): Promise<HttpResponse<unknown>> {
  // ------ request interceptors ---------------------------------------
  let cfg = { ...config }
  for (const interceptor of interceptors) {
    if (interceptor.request) {
      cfg = await interceptor.request(cfg)
    }
  }

  // ------ circuit breaker check --------------------------------------
  const breakerKey = breaker ? extractBreakerKey(cfg.url) : undefined
  if (breaker && breakerKey) {
    const state = breaker.states.get(breakerKey)
    if (state && state.status === 'open') {
      if (Date.now() - state.openedAt >= breaker.resetMs) {
        state.status = 'half-open'
      } else {
        throw new HttpError(503, 'Service Unavailable (circuit open)', null)
      }
    }
  }

  // ------ fetch with optional retry ----------------------------------
  const doFetch = (): Promise<Response> => {
    const { body, ...rest } = cfg
    const init: RequestInit = { ...rest, body: body as BodyInit | null | undefined }
    return fetch(cfg.url, init)
  }

  const maxAttempts = retryOpts?.maxAttempts ?? 1
  const baseDelay = retryOpts?.baseDelay ?? 1_000
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (abortedRef.aborted) throw new DOMException('Aborted', 'AbortError')
    if (attempt > 0) {
      await sleep(backoffDelay(attempt - 1, baseDelay))
    }
    try {
      let response = await doFetch()

      // ------ response interceptors ----------------------------------
      for (const interceptor of interceptors) {
        if (interceptor.response) {
          response = await interceptor.response(response, cfg)
        }
      }

      if (!response.ok) {
        const body = await parseBody(response)
        const err = new HttpError(response.status, response.statusText, body)

        // ------ error interceptors -----------------------------------
        let handled: unknown = err
        for (const interceptor of interceptors) {
          if (interceptor.error) {
            handled = await interceptor.error(handled, cfg)
          }
        }
        // If an interceptor returned a Response, use it instead
        if (handled instanceof Response) {
          response = handled
        } else {
          // Record failure for circuit breaker
          if (breaker && breakerKey) {
            recordBreakerFailure(breaker, breakerKey)
          }
          throw handled
        }
      }

      // Success – reset breaker if half-open
      if (breaker && breakerKey) {
        const state = breaker.states.get(breakerKey)
        if (state && state.status === 'half-open') {
          breaker.states.delete(breakerKey)
        }
      }

      const data = await parseBody(response)
      return buildResponse(data, response)
    } catch (err: unknown) {
      lastError = err
      // Do not retry HttpError (server responded) unless it's a 429/503
      if (err instanceof HttpError) {
        const retryable = err.status === 429 || err.status === 503
        if (!retryable || attempt >= maxAttempts - 1) {
          if (breaker && breakerKey) recordBreakerFailure(breaker, breakerKey)
          throw err
        }
      }
      // AbortError – do not retry
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err
      }
    }
  }

  // Should only reach here if all attempts exhausted
  if (breaker && breakerKey) recordBreakerFailure(breaker, breakerKey)
  throw lastError
}

function buildResponse(data: unknown, response: Response): HttpResponse<unknown> {
  const res: HttpResponse<unknown> = {
    data,
    status: response.status,
    headers: response.headers,
    ok: response.ok,
    parseAs: <S>(schema: { parse: (data: unknown) => S }): Promise<S> => Promise.resolve(schema.parse(data)),
  }
  return res
}

/* ------------------------------------------------------------------ */
/*  Circuit breaker internals                                          */
/* ------------------------------------------------------------------ */

interface BreakerEntry {
  status: 'closed' | 'open' | 'half-open'
  failures: number
  openedAt: number
}

interface BreakerState {
  failureThreshold: number
  resetMs: number
  states: Map<string, BreakerEntry>
}

function createBreakerState(opts: CircuitBreakerOptions): BreakerState {
  return {
    failureThreshold: opts.failureThreshold,
    resetMs: opts.resetMs,
    states: new Map(),
  }
}

/**
 * Extract a coarse-grained URL pattern for circuit breaking.
 * Groups paths by host + first two path segments so `/api/users/123`
 * and `/api/users/456` share the same breaker.
 */
function extractBreakerKey(url: string): string {
  try {
    const u = new URL(url)
    const segments = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean)
    const pattern = segments.slice(0, 2).join('/')
    return `${u.protocol}//${u.host}/${pattern}`
  } catch {
    return url
  }
}

function recordBreakerFailure(breaker: BreakerState, key: string): void {
  let entry = breaker.states.get(key)
  if (!entry) {
    entry = { status: 'closed', failures: 0, openedAt: 0 }
    breaker.states.set(key, entry)
  }
  if (entry.status === 'open') return
  entry.failures++
  if (entry.failures >= breaker.failureThreshold) {
    entry.status = 'open'
    entry.openedAt = Date.now()
  }
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

/**
 * Create a new {@link HttpClient} with the supplied options.
 *
 * @example
 * ```ts
 * const client = createHttpClient({ baseURL: "https://api.example.com" })
 * const res = await client.get<{ id: number }>("/users/1", { headers: { Authorization: "Bearer ..." } })
 * console.log(res.data.id)
 * ```
 */
export function createHttpClient(opts: HttpClientOptions = {}): HttpClient {
  const interceptors: Interceptor[] = []
  const defaultTimeout = opts.timeout ?? 30_000
  const defaultHeaders = opts.headers ?? {}
  const baseURL = opts.baseURL
  const defaultRetry = opts.retry
  const breaker: BreakerState | undefined = undefined

  const createMethod =
    (method: HttpMethod) =>
    async <T = unknown>(url: string, body?: unknown, opts_?: RequestOptions): Promise<HttpResponse<T>> => {
      const mergedHeaders: Record<string, string> = {
        ...defaultHeaders,
        ...(opts_?.headers ?? {}),
      }

      const signal = opts_?.signal ?? timeoutSignal(defaultTimeout)

      const config: RequestConfig = {
        url: resolveURL(baseURL, url),
        method,
        headers: mergedHeaders,
        body: body !== undefined ? serializeBody(body, mergedHeaders) : undefined,
        signal,
      }

      const abortedRef = { aborted: false }
      if (signal) {
        signal.addEventListener(
          'abort',
          () => {
            abortedRef.aborted = true
          },
          { once: true },
        )
      }

      const res = await executeRequest(config, interceptors, defaultRetry, breaker, abortedRef)

      return res as HttpResponse<T>
    }

  const client: HttpClient = {
    get: <T>(url: string, o?: RequestOptions) => createMethod('GET')(url, undefined, o) as Promise<HttpResponse<T>>,
    post: <T>(url: string, body?: unknown, o?: RequestOptions) => createMethod('POST')(url, body, o) as Promise<HttpResponse<T>>,
    put: <T>(url: string, body?: unknown, o?: RequestOptions) => createMethod('PUT')(url, body, o) as Promise<HttpResponse<T>>,
    delete: <T>(url: string, o?: RequestOptions) => createMethod('DELETE')(url, undefined, o) as Promise<HttpResponse<T>>,
    patch: <T>(url: string, body?: unknown, o?: RequestOptions) => createMethod('PATCH')(url, body, o) as Promise<HttpResponse<T>>,
    use(interceptor: Interceptor): HttpClient {
      interceptors.push(interceptor)
      return client
    },
    withRetry(newOpts: RetryOptions): HttpClient {
      return createHttpClient({
        baseURL,
        headers: defaultHeaders,
        timeout: defaultTimeout,
        retry: newOpts,
      })
    },
    withCircuitBreaker(cbOpts: CircuitBreakerOptions): HttpClient {
      const newClient = createHttpClient({
        baseURL,
        headers: defaultHeaders,
        timeout: defaultTimeout,
        retry: defaultRetry,
      })
      // Patch the internal breaker via a request interceptor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(newClient as any).__breaker = createBreakerState(cbOpts)
      return newClient
    },
  }

  return client
}

/**
 * Serialise a request body. JSON-encodes objects / arrays; leaves strings
 * as-is. Sets the `Content-Type` header to `application/json` when no
 * explicit type has been provided.
 */
function serializeBody(body: unknown, headers: Record<string, string>): string | undefined {
  if (body === null || body === undefined) return undefined
  if (typeof body === 'string') return body
  if (!headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }
  return JSON.stringify(body)
}

/* ------------------------------------------------------------------ */
/*  RateLimitMiddleware                                                */
/* ------------------------------------------------------------------ */

/**
 * Create a rate-limiter **interceptor** that uses a token-bucket
 * algorithm. When the bucket is empty the interceptor delays the request
 * until a token becomes available (or, if the wait would exceed the
 * window, rejects immediately).
 *
 * The interceptor should be added **first** in the pipeline so it gates
 * requests before any other processing.
 *
 * @example
 * ```ts
 * const client = createHttpClient()
 * client.use(RateLimitMiddleware({ maxRequests: 10, windowMs: 1000 }))
 * ```
 */
export function RateLimitMiddleware(opts: RateLimitMiddlewareOptions): Interceptor {
  const { maxRequests, windowMs, key: keyFn } = opts

  // Bucket state: Map<key, { tokens, lastRefill }>
  const buckets = new Map<string, { tokens: number; lastRefill: number }>()

  function refill(entry: { tokens: number; lastRefill: number }): void {
    const now = Date.now()
    const elapsed = now - entry.lastRefill
    const newTokens = Math.floor((elapsed / windowMs) * maxRequests)
    if (newTokens > 0) {
      entry.tokens = Math.min(entry.tokens + newTokens, maxRequests)
      entry.lastRefill = now
    }
  }

  return {
    request: async (config: RequestConfig): Promise<RequestConfig> => {
      const k = keyFn ? keyFn(config) : '__global__'
      let entry = buckets.get(k)
      if (!entry) {
        entry = { tokens: maxRequests, lastRefill: Date.now() }
        buckets.set(k, entry)
      }

      refill(entry)

      if (entry.tokens <= 0) {
        // Calculate wait time until next token
        const now = Date.now()
        const elapsed = now - entry.lastRefill
        const waitMs = windowMs - elapsed
        if (waitMs > 0 && waitMs <= windowMs) {
          await sleep(waitMs)
          refill(entry)
        }
        // If still empty after waiting, throw
        if (entry.tokens <= 0) {
          throw new HttpError(429, 'Too Many Requests (rate limited)', null)
        }
      }

      entry.tokens--
      return config
    },
  }
}
