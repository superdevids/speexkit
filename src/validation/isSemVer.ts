const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

/**
 * Checks if a string is a valid semantic version (semver).
 *
 * Supports `major.minor.patch` with optional pre-release and build metadata.
 *
 * @param value - The string to validate.
 * @returns Whether the value is a valid semver string.
 *
 * @example
 * isSemVer('1.2.3')           // true
 * isSemVer('1.2.3-beta.1')   // true
 * isSemVer('1.2.3+build.123') // true
 * isSemVer('not-semver')     // false
 */
export function isSemVer(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  return SEMVER_RE.test(value)
}
