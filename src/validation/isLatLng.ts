const LAT_LNG_RE =
  /^-?(?:90(?:\.0+)?|[1-8]?\d(?:\.\d+)?)\s*,\s*-?(?:180(?:\.0+)?|1[0-7]\d(?:\.\d+)?|\d{1,2}(?:\.\d+)?)$/

/**
 * Checks if a string is a valid "lat,lng" coordinate pair.
 *
 * Latitude must be in range [-90, 90], longitude in range [-180, 180].
 *
 * @param value - The string to validate.
 * @returns Whether the value is a valid lat/lng pair.
 *
 * @example
 * isLatLng('-6.2146,106.8451') // true
 * isLatLng('0,0')              // true
 * isLatLng('91,0')             // false
 * isLatLng('not-coords')      // false
 */
export function isLatLng(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  if (!LAT_LNG_RE.test(value.trim())) return false

  const parts = value.split(',')
  const lat = parseFloat(parts[0]!)
  const lng = parseFloat(parts[1]!)
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}
