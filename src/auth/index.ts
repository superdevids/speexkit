import { createHmac, timingSafeEqual, randomBytes, createHash } from 'node:crypto'

/**
 * Encodes a string to base64url (RFC 4648 §5).
 *
 * @param str - The UTF-8 string to encode.
 * @returns The base64url-encoded string.
 */
function base64urlEncode(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64url')
}

/**
 * Decodes a base64url string back to a UTF-8 string.
 *
 * @param str - The base64url-encoded string.
 * @returns The decoded UTF-8 string.
 */
function base64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8')
}

/**
 * Parses a human-readable expiry string into seconds.
 *
 * Supported units: `s` (seconds), `m` (minutes), `h` (hours), `d` (days).
 *
 * @param expiresIn - Expiry string (e.g. `"1h"`, `"30m"`, `"7d"`, `"90s"`).
 * @returns The equivalent duration in seconds.
 */
function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)(s|m|h|d)$/)
  if (!match) {
    throw new Error(
      `Invalid expiry format: "${expiresIn}". Use e.g. "1h", "30m", "7d".`,
    )
  }
  const value = Number.parseInt(match[1]!, 10)
  const unit = match[2]!
  const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
  return value * map[unit]!
}

/**
 * Signs a JWT using HMAC-SHA-256 (HS256).
 *
 * @param payload - The claims to include in the token.
 * @param secret - The HMAC secret key.
 * @param opts - Optional settings.
 * @param opts.expiresIn - Relative expiry string (e.g. `"1h"`, `"7d"`). When omitted the token has no `exp` claim.
 * @returns A signed JWT string (three dot-separated base64url parts).
 */
export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
  opts?: { expiresIn?: string },
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)

  const finalPayload: Record<string, unknown> = { ...payload, iat: now }
  if (opts?.expiresIn) {
    finalPayload.exp = now + parseExpiry(opts.expiresIn)
  }

  const headerEncoded = base64urlEncode(JSON.stringify(header))
  const payloadEncoded = base64urlEncode(JSON.stringify(finalPayload))
  const signingInput = `${headerEncoded}.${payloadEncoded}`

  const signature = createHmac('sha256', secret)
    .update(signingInput)
    .digest()
  const signatureEncoded = signature.toString('base64url')

  return `${signingInput}.${signatureEncoded}`
}

/**
 * Verifies a JWT signature and checks its expiry.
 *
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param token - The JWT string to verify.
 * @param secret - The HMAC secret key used to sign the token.
 * @returns The decoded payload if valid, or `null` if the signature is invalid or the token has expired.
 */
export async function verifyJWT(
  token: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerEncoded, payloadEncoded, signatureEncoded] = parts
  if (!headerEncoded || !payloadEncoded || !signatureEncoded) return null

  const signingInput = `${headerEncoded}.${payloadEncoded}`
  const expectedSig = createHmac('sha256', secret)
    .update(signingInput)
    .digest()
  const actualSig = Buffer.from(signatureEncoded, 'base64url')

  if (expectedSig.length !== actualSig.length) return null
  if (!timingSafeEqual(expectedSig, actualSig)) return null

  try {
    const payloadStr = base64urlDecode(payloadEncoded)
    const payload = JSON.parse(payloadStr) as Record<string, unknown>

    if (typeof payload.exp === 'number') {
      const now = Math.floor(Date.now() / 1000)
      if (now > payload.exp) return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Decodes a JWT payload without verifying the signature.
 *
 * Useful for reading client-side JWTs or inspecting token contents
 * before verification.
 *
 * @param token - The JWT string to decode.
 * @returns The decoded payload, or `null` if the token is malformed.
 */
export function decodeJWT(
  token: string,
): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payloadEncoded = parts[1]
    if (!payloadEncoded) return null
    const payloadStr = base64urlDecode(payloadEncoded)
    return JSON.parse(payloadStr) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Generates a PKCE code verifier and its SHA-256 code challenge.
 *
 * The code verifier is a cryptographically random alphanumeric string
 * (64 characters). The code challenge is the base64url-encoded SHA-256
 * hash of the verifier.
 *
 * @returns An object containing `codeVerifier` and `codeChallenge`.
 */
export function generatePKCE(): {
  codeVerifier: string
  codeChallenge: string
} {
  const length = 64
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const bytes = randomBytes(length)
  let codeVerifier = ''
  for (let i = 0; i < length; i++) {
    codeVerifier += chars[bytes[i]! % chars.length]!
  }

  const challengeHash = createHash('sha256').update(codeVerifier).digest()
  const codeChallenge = challengeHash.toString('base64url')

  return { codeVerifier, codeChallenge }
}

/**
 * Parses an HTTP Basic authentication header.
 *
 * @param header - The `Authorization` header value (e.g. `"Basic base64string"`).
 * @returns An object with `username` and `password`, or `null` if the format is invalid.
 */
export function parseBasicAuth(
  header: string,
): { username: string; password: string } | null {
  try {
    const match = header.match(/^Basic\s+(.+)$/i)
    if (!match) return null

    const decoded = Buffer.from(match[1]!, 'base64').toString('utf-8')
    const colonIndex = decoded.indexOf(':')
    if (colonIndex === -1) return null

    return {
      username: decoded.slice(0, colonIndex),
      password: decoded.slice(colonIndex + 1),
    }
  } catch {
    return null
  }
}
