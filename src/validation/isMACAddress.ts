const MAC_RE =
  /^(?:[0-9a-fA-F]{2}(?::)){5}[0-9a-fA-F]{2}$|^(?:[0-9a-fA-F]{2}(?:-)){5}[0-9a-fA-F]{2}$|^(?:[0-9a-fA-F]{4}\.){2}[0-9a-fA-F]{4}$|^[0-9a-fA-F]{12}$/

/**
 * Checks if a string is a valid MAC address.
 *
 * Accepts formats: `00:1A:2B:3C:4D:5E`, `00-1A-2B-3C-4D-5E`,
 * `001A.2B3C.4D5E`, and `001A2B3C4D5E`.
 *
 * @param value - The string to validate.
 * @returns Whether the value is a valid MAC address.
 *
 * @example
 * isMACAddress('00:1A:2B:3C:4D:5E') // true
 * isMACAddress('00-1A-2B-3C-4D-5E') // true
 * isMACAddress('001A.2B3C.4D5E')   // true
 * isMACAddress('001A2B3C4D5E')     // true
 * isMACAddress('not-a-mac')        // false
 */
export function isMACAddress(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  return MAC_RE.test(value)
}
