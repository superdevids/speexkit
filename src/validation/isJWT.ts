const JWT_RE = /^[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+$/

/**
 * Checks if a string is a valid JWT format (three base64url segments separated by dots).
 *
 * @param value - The string to validate.
 * @returns Whether the value matches JWT format.
 *
 * @example
 * isJWT('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8') // true
 * isJWT('not-a-token') // false
 */
export function isJWT(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  return JWT_RE.test(value)
}
