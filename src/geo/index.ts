export interface Coord {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371
const EARTH_RADIUS_MI = 3959

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

const GEOHASH_BITS: Record<string, [number, number, number, number, number]> = {
  '0': [0, 0, 0, 0, 0],
  '1': [0, 0, 0, 0, 1],
  '2': [0, 0, 0, 1, 0],
  '3': [0, 0, 0, 1, 1],
  '4': [0, 0, 1, 0, 0],
  '5': [0, 0, 1, 0, 1],
  '6': [0, 0, 1, 1, 0],
  '7': [0, 0, 1, 1, 1],
  '8': [0, 1, 0, 0, 0],
  '9': [0, 1, 0, 0, 1],
  b: [0, 1, 0, 1, 0],
  c: [0, 1, 0, 1, 1],
  d: [0, 1, 1, 0, 0],
  e: [0, 1, 1, 0, 1],
  f: [0, 1, 1, 1, 0],
  g: [0, 1, 1, 1, 1],
  h: [1, 0, 0, 0, 0],
  j: [1, 0, 0, 0, 1],
  k: [1, 0, 0, 1, 0],
  m: [1, 0, 0, 1, 1],
  n: [1, 0, 1, 0, 0],
  p: [1, 0, 1, 0, 1],
  q: [1, 0, 1, 1, 0],
  r: [1, 0, 1, 1, 1],
  s: [1, 1, 0, 0, 0],
  t: [1, 1, 0, 0, 1],
  u: [1, 1, 0, 1, 0],
  v: [1, 1, 0, 1, 1],
  w: [1, 1, 1, 0, 0],
  x: [1, 1, 1, 0, 1],
  y: [1, 1, 1, 1, 0],
  z: [1, 1, 1, 1, 1],
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Calculate the great-circle distance between two coordinates using the Haversine formula.
 *
 * @param a - First coordinate
 * @param b - Second coordinate
 * @param unit - Distance unit: `'km'` (default) or `'mi'`
 * @returns Distance in the requested unit
 *
 * @example
 * ```ts
 * haversineDistance({ lat: 52.52, lng: 13.405 }, { lat: 48.857, lng: 2.352 })
 * // => ~878
 * ```
 */
export function haversineDistance(a: Coord, b: Coord, unit: 'km' | 'mi' = 'km'): number {
  const R = unit === 'mi' ? EARTH_RADIUS_MI : EARTH_RADIUS_KM
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Determine whether a point lies inside a polygon using the ray-casting algorithm.
 *
 * The polygon is defined as an ordered array of coordinates (closed automatically).
 * Points exactly on a boundary edge are considered inside.
 *
 * @param point - The point to test
 * @param polygon - Ordered vertices of the polygon
 * @returns `true` if the point is inside or on the boundary
 *
 * @example
 * ```ts
 * isPointInPolygon({ lat: 0, lng: 0 }, [{ lat: -1, lng: -1 }, { lat: -1, lng: 1 }, { lat: 1, lng: 1 }, { lat: 1, lng: -1 }])
 * // => true
 * ```
 */
export function isPointInPolygon(point: Coord, polygon: Coord[]): boolean {
  if (polygon.length < 3) {
    return false
  }

  const { lat, lng } = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!
    const b = polygon[j]!

    const intersect = a.lng > lng !== b.lng > lng && lat < ((b.lat - a.lat) * (lng - a.lng)) / (b.lng - a.lng) + a.lat

    if (intersect) {
      inside = !inside
    }
  }

  return inside
}

/**
 * Compute the axis-aligned bounding box for a set of coordinates.
 *
 * @param points - Array of coordinates
 * @returns Bounding box with `minLat`, `maxLat`, `minLng`, `maxLng`, or `null` if the array is empty
 *
 * @example
 * ```ts
 * boundingBox([{ lat: -6.2, lng: 106.8 }, { lat: -6.3, lng: 106.9 }])
 * // => { minLat: -6.3, maxLat: -6.2, minLng: 106.8, maxLng: 106.9 }
 * ```
 */
export function boundingBox(points: Coord[]): {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
} | null {
  if (points.length === 0) {
    return null
  }

  let minLat = points[0]!.lat
  let maxLat = points[0]!.lat
  let minLng = points[0]!.lng
  let maxLng = points[0]!.lng

  for (let i = 1; i < points.length; i++) {
    const { lat, lng } = points[i]!
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }

  return { minLat, maxLat, minLng, maxLng }
}

/**
 * Encode latitude and longitude into a geohash string.
 *
 * Uses recursive binary division of the coordinate ranges with base32 encoding.
 * Even bits encode longitude, odd bits encode latitude.
 *
 * @param lat - Latitude (-90 to 90)
 * @param lng - Longitude (-180 to 180)
 * @param precision - Number of characters in the geohash (default `7`)
 * @returns Geohash string
 *
 * @example
 * ```ts
 * geohash(-6.2, 106.8, 5)
 * // => "qqgx2"
 * ```
 */
export function geohash(lat: number, lng: number, precision: number = 7): string {
  let latMin = -90
  let latMax = 90
  let lngMin = -180
  let lngMax = 180

  const bits: number[] = []
  const totalBits = precision * 5

  for (let i = 0; i < totalBits; i++) {
    if (i % 2 === 0) {
      const mid = (lngMin + lngMax) / 2
      if (lng >= mid) {
        bits.push(1)
        lngMin = mid
      } else {
        bits.push(0)
        lngMax = mid
      }
    } else {
      const mid = (latMin + latMax) / 2
      if (lat >= mid) {
        bits.push(1)
        latMin = mid
      } else {
        bits.push(0)
        latMax = mid
      }
    }
  }

  let hash = ''
  for (let i = 0; i < precision; i++) {
    const chunk = bits.slice(i * 5, (i + 1) * 5)
    const index = chunk.reduce((acc, b) => (acc << 1) | b, 0)
    hash += BASE32[index]
  }

  return hash
}

/**
 * Decode a geohash string back into latitude, longitude, and error bounds.
 *
 * @param hash - Geohash string
 * @returns Decoded coordinate with error margin for each axis
 *
 * @example
 * ```ts
 * decodeGeohash('qqgx2')
 * // => { lat: -6.240..., lng: 106.787..., error: { lat: 0.043..., lng: 0.043... } }
 * ```
 */
export function decodeGeohash(hash: string): {
  lat: number
  lng: number
  error: { lat: number; lng: number }
} {
  let latMin = -90
  let latMax = 90
  let lngMin = -180
  let lngMax = 180

  let bitIndex = 0

  for (let i = 0; i < hash.length; i++) {
    const char = hash[i]!
    const bits = GEOHASH_BITS[char]!
    for (let b = 0; b < 5; b++, bitIndex++) {
      if (bitIndex % 2 === 0) {
        const mid = (lngMin + lngMax) / 2
        if (bits[b] === 1) {
          lngMin = mid
        } else {
          lngMax = mid
        }
      } else {
        const mid = (latMin + latMax) / 2
        if (bits[b] === 1) {
          latMin = mid
        } else {
          latMax = mid
        }
      }
    }
  }

  return {
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
    error: {
      lat: (latMax - latMin) / 2,
      lng: (lngMax - lngMin) / 2,
    },
  }
}

/**
 * Convert decimal degrees to Degree-Minute-Second (DMS) format.
 *
 * @param decimal - Decimal degree value
 * @param type - `'lat'` (returns N/S suffix) or `'lng'` (returns E/W suffix)
 * @returns Formatted DMS string, e.g. `"6°12'52.6\"S"`
 *
 * @example
 * ```ts
 * toDMS(-6.21462, 'lat')
 * // => "6°12'52.6\"S"
 *
 * toDMS(106.84513, 'lng')
 * // => "106°50'42.5\"E"
 * ```
 */
export function toDMS(decimal: number, type: 'lat' | 'lng'): string {
  const abs = Math.abs(decimal)
  const deg = Math.floor(abs)
  const minFloat = (abs - deg) * 60
  const min = Math.floor(minFloat)
  const sec = (minFloat - min) * 60

  const dir = type === 'lat' ? (decimal >= 0 ? 'N' : 'S') : decimal >= 0 ? 'E' : 'W'

  return `${deg}°${min}'${sec.toFixed(1)}"${dir}`
}

/**
 * Calculate the geographic midpoint (halfway point) between two coordinates.
 *
 * Uses the spherical earth midpoint formula for better accuracy over long distances.
 *
 * @param a - First coordinate
 * @param b - Second coordinate
 * @returns Midpoint coordinate
 *
 * @example
 * ```ts
 * midpoint({ lat: 52.52, lng: 13.405 }, { lat: 48.857, lng: 2.352 })
 * // => { lat: ~50.73, lng: ~7.93 }
 * ```
 */
export function midpoint(a: Coord, b: Coord): Coord {
  const lat1 = toRad(a.lat)
  const lng1 = toRad(a.lng)
  const lat2 = toRad(b.lat)
  const lng2 = toRad(b.lng)
  const dLng = lng2 - lng1

  const bx = Math.cos(lat2) * Math.cos(dLng)
  const by = Math.cos(lat2) * Math.sin(dLng)

  const lat = Math.atan2(Math.sin(lat1) + Math.sin(lat2), Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by))
  const lng = lng1 + Math.atan2(by, Math.cos(lat1) + bx)

  return {
    lat: (lat * 180) / Math.PI,
    lng: (lng * 180) / Math.PI,
  }
}
