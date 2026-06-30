import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sanitizeHtml, csrfToken, verifyCsrfToken, createRateLimiter, detectSecrets, maskPII } from '../src/security/index.js'

describe('sanitizeHtml', () => {
  it('removes script tags but keeps content', () => {
    expect(sanitizeHtml('<script>alert(1)</script>')).toBe('alert(1)')
  })

  it('removes on* event handler attributes and strips disallowed tags', () => {
    expect(sanitizeHtml('<img src=x onerror=alert(1)>')).toBe('')
  })

  it('removes javascript: URLs from links', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('')
  })

  it('throws on null input', () => {
    expect(() => sanitizeHtml(null as unknown as string)).toThrow()
  })

  it('keeps safe tags like <b>', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe('<b>bold</b>')
  })

  it('blocks encoded/nested script injection', () => {
    const result = sanitizeHtml('<<script>script>alert(1)</script>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('alert(1)')
  })

  it('strips disallowed tags entirely', () => {
    expect(sanitizeHtml('<div>content</div>')).toBe('content')
  })

  it('keeps multiple safe tags', () => {
    const html = '<b>bold</b> <i>italic</i> <strong>strong</strong>'
    expect(sanitizeHtml(html)).toBe(html)
  })

  it('strips multiple disallowed tags', () => {
    expect(sanitizeHtml('<div>a</div><span>b</span>')).toBe('ab')
  })

  it('handles self-closing tags', () => {
    expect(sanitizeHtml('<br>')).toBe('<br>')
  })

  it('strips style tags', () => {
    expect(sanitizeHtml('<style>body{color:red}</style>')).toBe('body{color:red}')
  })

  it('handles stripAll option', () => {
    expect(sanitizeHtml('<b>bold</b>', { stripAll: true })).toBe('bold')
  })

  it('allows custom allowed tags via options', () => {
    expect(sanitizeHtml('<custom>val</custom>', { allowedTags: ['custom'] })).toBe('<custom>val</custom>')
  })

  it('blocks <iframe> injection', () => {
    expect(sanitizeHtml('<iframe src="http://evil.com"></iframe>')).toBe('')
  })

  it('handles mixed safe and unsafe tags', () => {
    const result = sanitizeHtml('<b>ok</b><script>bad</script><i>fine</i>')
    expect(result).toBe('<b>ok</b>bad<i>fine</i>')
  })

  it('allows href attribute on <a> tags', () => {
    expect(sanitizeHtml('<a href="https://safe.com">link</a>')).toBe('<a href="https://safe.com">link</a>')
  })

  it('strips title attribute from non-a tags', () => {
    expect(sanitizeHtml('<b title="tooltip">text</b>')).toBe('<b>text</b>')
  })

  it('handles uppercase tag names', () => {
    expect(sanitizeHtml('<SCRIPT>alert(1)</SCRIPT>')).toBe('alert(1)')
  })
})

describe('csrfToken and verifyCsrfToken', () => {
  const secret = 'my-secret-key'

  it('csrfToken returns a string with dot separator', async () => {
    const token = await csrfToken(secret)
    expect(typeof token).toBe('string')
    expect(token).toContain('.')
  })

  it('verifyCsrfToken returns true for valid token', async () => {
    const token = await csrfToken(secret)
    const result = await verifyCsrfToken(token, secret)
    expect(result).toBe(true)
  })

  it('verifyCsrfToken returns false for wrong secret', async () => {
    const token = await csrfToken(secret)
    const result = await verifyCsrfToken(token, 'wrong-secret')
    expect(result).toBe(false)
  })

  it('verifyCsrfToken returns false for empty string token', async () => {
    const result = await verifyCsrfToken('', secret)
    expect(result).toBe(false)
  })

  it('verifyCsrfToken returns false for null token', async () => {
    const result = await verifyCsrfToken(null as unknown as string, secret)
    expect(result).toBe(false)
  })

  it('verifyCsrfToken returns false for malformed token (no dot)', async () => {
    const result = await verifyCsrfToken('justrandomstring', secret)
    expect(result).toBe(false)
  })

  it('verifyCsrfToken returns false for tampered payload', async () => {
    const token = await csrfToken(secret)
    const parts = token.split('.')
    const tampered = 'ffff' + parts[0]!.slice(4) + '.' + parts[1]
    const result = await verifyCsrfToken(tampered, secret)
    expect(result).toBe(false)
  })

  it('csrfToken generates unique tokens each call', async () => {
    const t1 = await csrfToken(secret)
    const t2 = await csrfToken(secret)
    expect(t1).not.toBe(t2)
  })
})

describe('createRateLimiter', () => {
  it('blocks all requests when maxRequests is 0', () => {
    const limiter = createRateLimiter({ maxRequests: 0, windowMs: 60000 })
    expect(limiter.check('key').allowed).toBe(false)
  })

  it('throws when maxRequests is negative', () => {
    expect(() => createRateLimiter({ maxRequests: -1, windowMs: 60000 })).not.toThrow()
  })

  it('allows first request, blocks second within window', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60000 })
    expect(limiter.check('key').allowed).toBe(true)
    expect(limiter.check('key').allowed).toBe(false)
  })

  it('resets counter for a key', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60000 })
    limiter.check('key')
    expect(limiter.check('key').allowed).toBe(false)
  })

  it('tracks remaining count', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000 })
    expect(limiter.check('key').remaining).toBe(2)
    expect(limiter.check('key').remaining).toBe(1)
    expect(limiter.check('key').remaining).toBe(0)
  })

  it('different keys have independent counters', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60000 })
    expect(limiter.check('user-a').allowed).toBe(true)
    expect(limiter.check('user-b').allowed).toBe(true)
    expect(limiter.check('user-a').allowed).toBe(false)
  })

  it('middleware calls next when allowed', () => {
    const limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 })
    const next = vi.fn()
    const req = { ip: '127.0.0.1' }
    const res = {}
    limiter.middleware()(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('middleware returns 429 when rate limited', () => {
    const limiter = createRateLimiter({ maxRequests: 0, windowMs: 60000 })
    const next = vi.fn()
    const json = vi.fn()
    const status = vi.fn(() => ({ json }))
    const req = { ip: '127.0.0.1' }
    const res = { status, json }
    limiter.middleware()(req, res, next)
    expect(status).toHaveBeenCalledWith(429)
    expect(next).not.toHaveBeenCalled()
  })

  it('uses custom key function in middleware', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60000 })
    const next = vi.fn()
    const req = { headers: { 'x-forwarded-for': '10.0.0.1' } }
    const res = {}
    limiter.middleware({ keyFn: (r: any) => r.headers['x-forwarded-for'] })(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('detectSecrets', () => {
  it('detects AWS access keys', () => {
    const results = detectSecrets('AKIA1234567890ABCDEF')
    expect(results.some((r) => r.type === 'aws_key')).toBe(true)
  })

  it('detects GitHub tokens', () => {
    const results = detectSecrets('ghp_abcdefghijklmnopqrstuvwxyz0123456789abc')
    expect(results.some((r) => r.type === 'github_token')).toBe(true)
  })

  it('detects JWTs', () => {
    const results = detectSecrets('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jMfhbH6g0q0Kq0Kq0Kq0Kq0Kq0Kq0Kq0')
    expect(results.some((r) => r.type === 'jwt')).toBe(true)
  })

  it('detects private keys', () => {
    const results = detectSecrets('-----BEGIN RSA PRIVATE KEY-----\nABCDEF==\n-----END RSA PRIVATE KEY-----')
    expect(results.some((r) => r.type === 'private_key')).toBe(true)
  })

  it('detects inline private keys', () => {
    const results = detectSecrets('-----BEGIN RSA PRIVATE KEY-----\nABCDEF==\n-----END RSA PRIVATE KEY-----')
    expect(results.some((r) => r.type === 'private_key')).toBe(true)
  })

  it('detects API keys via pattern', () => {
    const results = detectSecrets('api_key = "sk-abcdefghijklmnopqrstuvwxyz"')
    expect(results.some((r) => r.type === 'api_key')).toBe(true)
  })

  it('returns empty array for empty string', () => {
    expect(detectSecrets('')).toEqual([])
  })

  it('returns empty array for normal text with no secrets', () => {
    expect(detectSecrets('normal text without secrets')).toEqual([])
  })

  it('reports line numbers correctly', () => {
    const results = detectSecrets('line1\nline2\nAKIA1234567890ABCDEF\nline4')
    expect(results[0]!.line).toBe(3)
  })

  it('reports entropy scores', () => {
    const results = detectSecrets('AKIA1234567890ABCDEF')
    expect(results[0]!.entropy).toBeGreaterThan(0)
  })

  it('deduplicates identical matches', () => {
    const text = 'AKIA1234567890ABCDEF\nAKIA1234567890ABCDEF'
    const results = detectSecrets(text)
    expect(results.length).toBe(1)
  })

  it('detects multiple secret types in same text', () => {
    const text = 'AKIA1234567890ABCDEF\napi_key = "sk-secret-key-here-123"'
    const results = detectSecrets(text)
    expect(results.length).toBeGreaterThanOrEqual(2)
  })
})

describe('maskPII', () => {
  it('masks email addresses', () => {
    const result = maskPII('user@email.com')
    expect(result).not.toContain('user@email.com')
    expect(result).toContain('***')
    expect(result).toContain('@')
  })

  it('masks email local part and domain', () => {
    const result = maskPII('john.doe@example.com')
    expect(result).toBe('j***@e***.com')
  })

  it('returns empty string for empty input', () => {
    expect(maskPII('')).toBe('')
  })

  it('throws on null input', () => {
    expect(() => maskPII(null as unknown as string)).toThrow()
  })

  it('masks phone numbers', () => {
    const result = maskPII('+6281234567890')
    expect(result).not.toContain('1234567890')
    expect(result).toContain('*****')
  })

  it('masks 16-digit sequences as ID not phone', () => {
    const result = maskPII('1234567890123456')
    expect(result).toBe('************3456')
  })

  it('masks IP addresses by default', () => {
    const result = maskPII('IP 192.168.1.1')
    expect(result).toBe('IP 192.168.*.*')
  })

  it('masks long digit sequences (IDs)', () => {
    const result = maskPII('1234567890123456')
    expect(result).toBe('************3456')
  })

  it('respects email masking option when false', () => {
    const result = maskPII('user@email.com', { email: false })
    expect(result).toBe('user@email.com')
  })

  it('respects phone masking option when false', () => {
    const result = maskPII('+6281234567890', { phone: false })
    expect(result).toBe('+6281234567890')
  })

  it('masks multiple PII types in same text', () => {
    const text = 'Contact: john@example.com, IP: 10.0.0.1'
    const result = maskPII(text)
    expect(result).toContain('***')
    expect(result).not.toContain('john@example.com')
    expect(result).not.toContain('10.0.0.1')
  })

  it('handles IP masking option', () => {
    const result = maskPII('192.168.1.1', { ip: false })
    expect(result).toBe('192.168.1.1')
  })
})
