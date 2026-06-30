/**
 * Brutal test suite for speexkit/auth module.
 */
import { describe, it, expect } from 'vitest'
import { signJWT, verifyJWT, decodeJWT, generatePKCE, parseBasicAuth } from '../src/auth/index.js'

describe('auth — signJWT / verifyJWT', () => {
  const secret = 'my-secret-key'
  const payload = { sub: '123', name: 'Test User' }

  it('signs a valid JWT', async () => {
    const token = await signJWT(payload, secret)
    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)
  })

  it('verifies a valid JWT', async () => {
    const token = await signJWT(payload, secret)
    const result = await verifyJWT(token, secret)
    expect(result).toBeTruthy()
    expect(result?.sub).toBe('123')
    expect(result?.name).toBe('Test User')
  })

  it('rejects signature mismatch', async () => {
    const token = await signJWT(payload, secret)
    const result = await verifyJWT(token, 'wrong-secret')
    expect(result).toBeNull()
  })

  it('handles empty payload', async () => {
    const token = await signJWT({}, secret)
    expect(token.split('.').length).toBe(3)
    const result = await verifyJWT(token, secret)
    expect(result).toBeTruthy()
  })

  it('handles null payload — coerces to object', async () => {
    // signJWT coerces null to object via spread
    const token = await signJWT(null as unknown as Record<string, unknown>, secret)
    expect(token.split('.').length).toBe(3)
  })

  it('handles number payload — coerces to object', async () => {
    // signJWT coerces primitives via spread
    const token = await signJWT(123 as unknown as Record<string, unknown>, secret)
    expect(token.split('.').length).toBe(3)
  })

  it('returns null for malformed token (2 parts)', async () => {
    const result = await verifyJWT('a.b', secret)
    expect(result).toBeNull()
  })

  it('returns null for empty token', async () => {
    const result = await verifyJWT('', secret)
    expect(result).toBeNull()
  })

  it('returns null for 4-part token', async () => {
    const result = await verifyJWT('a.b.c.d', secret)
    expect(result).toBeNull()
  })

  it('handles token with expiry', async () => {
    const token = await signJWT(payload, secret, { expiresIn: '1h' })
    const result = await verifyJWT(token, secret)
    expect(result).toBeTruthy()
    expect(result?.exp).toBeTruthy()
  })

  it('decodeJWT reads payload without verification', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.fake'
    const result = decodeJWT(token)
    expect(result).toBeTruthy()
    expect(result?.sub).toBe('123')
  })

  it('decodeJWT returns null for malformed input', () => {
    expect(decodeJWT('')).toBeNull()
    expect(decodeJWT('a.b')).toBeNull()
    expect(decodeJWT('not-a-jwt')).toBeNull()
  })

  it('decodeJWT handles invalid base64 gracefully', () => {
    const result = decodeJWT('a.!!!.b')
    expect(result).toBeNull()
  })

  it('signJWT with expiresIn creates time-limited token', async () => {
    const token = await signJWT(payload, secret, { expiresIn: '1s' })
    // Verify immediately
    const result = await verifyJWT(token, secret)
    expect(result).toBeTruthy()
  })

  it('verifyJWT returns null for expired nbf (future not-before)', async () => {
    const futureNbf = Math.floor(Date.now() / 1000) + 3600
    const token = await signJWT({ ...payload, nbf: futureNbf }, secret)
    const result = await verifyJWT(token, secret)
    expect(result).toBeNull()
  })
})

describe('auth — generatePKCE', () => {
  it('generates code verifier and challenge', async () => {
    const result = await generatePKCE()
    expect(result.codeVerifier).toBeTruthy()
    expect(result.codeChallenge).toBeTruthy()
    expect(typeof result.codeVerifier).toBe('string')
    expect(typeof result.codeChallenge).toBe('string')
  })

  it('generates unique values on each call', async () => {
    const a = await generatePKCE()
    const b = await generatePKCE()
    expect(a.codeVerifier).not.toBe(b.codeVerifier)
    expect(a.codeChallenge).not.toBe(b.codeChallenge)
  })

  it('challenge verifies against verifier', async () => {
    const { codeVerifier, codeChallenge } = await generatePKCE()
    // SHA-256 of verifier should match challenge
    const { createHash } = await import('node:crypto')
    const expected = createHash('sha256').update(codeVerifier).digest('base64url')
    expect(codeChallenge).toBe(expected)
  })
})

describe('auth — parseBasicAuth', () => {
  it('parses valid basic auth header', () => {
    const encoded = Buffer.from('user:pass').toString('base64')
    const result = parseBasicAuth(`Basic ${encoded}`)
    expect(result).toEqual({ username: 'user', password: 'pass' })
  })

  it('returns null for empty header', () => {
    expect(parseBasicAuth('')).toBeNull()
  })

  it('returns null for non-basic auth header', () => {
    expect(parseBasicAuth('Bearer token123')).toBeNull()
  })

  it('returns null for malformed base64', () => {
    expect(parseBasicAuth('Basic !!!')).toBeNull()
  })

  it('returns null for missing colon separator', () => {
    const encoded = Buffer.from('username').toString('base64')
    expect(parseBasicAuth(`Basic ${encoded}`)).toBeNull()
  })

  it('handles empty username and password', () => {
    const encoded = Buffer.from(':').toString('base64')
    const result = parseBasicAuth(`Basic ${encoded}`)
    expect(result).toEqual({ username: '', password: '' })
  })

  it('handles special characters in credentials', () => {
    const encoded = Buffer.from('user@domain.com:p@ss!').toString('base64')
    const result = parseBasicAuth(`Basic ${encoded}`)
    expect(result).toEqual({ username: 'user@domain.com', password: 'p@ss!' })
  })
})

describe('auth — edge cases', () => {
  it('serial sign-then-verify multiple tokens', async () => {
    const secret = 'test-secret'
    for (let i = 0; i < 10; i++) {
      const token = await signJWT({ id: i }, secret)
      const result = await verifyJWT(token, secret)
      expect(result?.id).toBe(i)
    }
  })

  it('handles unicode in payload', async () => {
    const token = await signJWT({ text: 'héllo wörld 🎉' }, 'secret')
    const result = await verifyJWT(token, 'secret')
    expect(result?.text).toBe('héllo wörld 🎉')
  })

  it('empty secret still produces a token', async () => {
    const token = await signJWT({ test: true }, '')
    expect(token.split('.').length).toBe(3)
  })
})
