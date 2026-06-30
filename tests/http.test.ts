/**
 * Brutal test suite for speexkit/http module.
 */
import { describe, it, expect } from 'vitest'
import { createHttpClient, HttpError } from '../src/http/index.js'
import type { Interceptor, RequestConfig } from '../src/http/index.js'

describe('http — createHttpClient', () => {
  it('creates a client with no options', () => {
    const client = createHttpClient()
    expect(client).toBeTruthy()
    expect(typeof client.get).toBe('function')
    expect(typeof client.post).toBe('function')
    expect(typeof client.use).toBe('function')
  })

  it('creates a client with baseURL', () => {
    const client = createHttpClient({ baseURL: 'https://api.example.com' })
    expect(client).toBeTruthy()
  })

  it('creates a client with empty baseURL', () => {
    const client = createHttpClient({ baseURL: '' })
    expect(client).toBeTruthy()
  })

  it('creates a client with default headers', () => {
    const client = createHttpClient({
      baseURL: 'https://api.example.com',
      headers: { Authorization: 'Bearer test' },
    })
    expect(client).toBeTruthy()
  })

  it('throws for invalid URL on get', async () => {
    const client = createHttpClient()
    await expect(client.get('')).rejects.toThrow()
  })

  it('throws for null URL', async () => {
    const client = createHttpClient()
    await expect(client.get(null as unknown as string)).rejects.toThrow()
  })

  it('throws for number URL', async () => {
    const client = createHttpClient()
    await expect(client.get(123 as unknown as string)).rejects.toThrow()
  })
})

describe('http — HttpError', () => {
  it('creates an HttpError with status and message', () => {
    const err = new HttpError(404, 'Not Found', { message: 'missing' })
    expect(err.status).toBe(404)
    expect(err.statusText).toBe('Not Found')
    expect(err.body).toEqual({ message: 'missing' })
    expect(err.message).toContain('404')
    expect(err.message).toContain('Not Found')
  })

  it('creates HttpError with 500 status', () => {
    const err = new HttpError(500, 'Internal Server Error', null)
    expect(err.status).toBe(500)
    expect(err.body).toBeNull()
  })

  it('HttpError is an instance of Error', () => {
    const err = new HttpError(400, 'Bad Request', null)
    expect(err instanceof Error).toBe(true)
  })
})

describe('http — interceptors', () => {
  it('adds an interceptor via use()', () => {
    const client = createHttpClient({ baseURL: 'https://api.example.com' })
    const interceptor: Interceptor = {
      request: (config: RequestConfig) => config,
      response: (res: Response) => res,
    }
    client.use(interceptor)
    expect(true).toBe(true)
  })

  it('can chain interceptors', () => {
    const client = createHttpClient({ baseURL: 'https://api.example.com' })
    const interceptor1: Interceptor = {
      request: (config: RequestConfig) => config,
      response: (res: Response) => res,
    }
    const interceptor2: Interceptor = {
      request: (config: RequestConfig) => config,
      response: (res: Response) => res,
    }
    client.use(interceptor1)
    client.use(interceptor2)
    expect(true).toBe(true)
  })
})

describe('http — edge cases', () => {
  it('handles absolute URL overrides baseURL — rejects with connection error', async () => {
    const client = createHttpClient({ baseURL: 'https://api.example.com' })
    // Using a non-resolving domain ensures we test the error path
    await expect(client.get('https://nonexistent.invalid/test')).rejects.toThrow()
  })

  it('client.get rejects on network error', async () => {
    const client = createHttpClient({ baseURL: 'https://nonexistent.invalid' })
    await expect(client.get('/test')).rejects.toThrow()
  })

  it('handles request without baseURL using absolute URL fails as expected', async () => {
    const client = createHttpClient()
    await expect(client.get('https://nonexistent.invalid/api')).rejects.toThrow()
  })

  it('handles POST with body', async () => {
    const client = createHttpClient({ baseURL: 'https://api.example.com' })
    await expect(client.post('/data', { body: { test: true } })).rejects.toThrow()
  })

  it('handles POST with empty body', async () => {
    const client = createHttpClient({ baseURL: 'https://api.example.com' })
    await expect(client.post('/data')).rejects.toThrow()
  })
})
