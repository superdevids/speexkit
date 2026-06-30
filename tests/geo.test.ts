import { describe, it, expect, vi } from 'vitest'
import { haversineDistance, isPointInPolygon, boundingBox, geohash, decodeGeohash, toDMS, midpoint } from '../src/geo/index.js'

describe('haversineDistance', () => {
  it('same point returns 0', () => {
    expect(haversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0)
  })

  it('pole to pole is ~20015km', () => {
    const d = haversineDistance({ lat: 90, lng: 0 }, { lat: -90, lng: 0 })
    expect(d).toBeGreaterThan(19900)
    expect(d).toBeLessThan(20100)
  })

  it('equator quarter is ~10007km', () => {
    const d = haversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 90 })
    expect(d).toBeGreaterThan(9900)
    expect(d).toBeLessThan(10100)
  })

  it('returns same distance regardless of direction', () => {
    const d1 = haversineDistance({ lat: 40, lng: -74 }, { lat: 34, lng: -118 })
    const d2 = haversineDistance({ lat: 34, lng: -118 }, { lat: 40, lng: -74 })
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001)
  })

  it('works in miles', () => {
    const d = haversineDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, 'mi')
    expect(d).toBeGreaterThan(60)
    expect(d).toBeLessThan(75)
  })

  it('handles antimeridian crossing', () => {
    const d = haversineDistance({ lat: 0, lng: 179 }, { lat: 0, lng: -179 })
    expect(d).toBeGreaterThan(0)
    expect(d).toBeLessThan(250)
  })

  it('handles negative coords near equator', () => {
    const d = haversineDistance({ lat: -1, lng: -1 }, { lat: 1, lng: 1 })
    expect(d).toBeGreaterThan(0)
    expect(d).toBeLessThan(350)
  })

  it('returns NaN for NaN lat coords', () => {
    const result = haversineDistance({ lat: NaN, lng: 0 }, { lat: 0, lng: 0 })
    expect(Number.isNaN(result)).toBe(true)
  })
})

describe('isPointInPolygon', () => {
  const square = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 1, lng: 1 },
    { lat: 1, lng: 0 },
  ]

  it('returns false for empty polygon', () => {
    expect(isPointInPolygon({ lat: 0, lng: 0 }, [])).toBe(false)
  })

  it('returns false for polygon with less than 3 vertices', () => {
    expect(
      isPointInPolygon({ lat: 0, lng: 0 }, [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ]),
    ).toBe(false)
  })

  it('returns true for point inside square', () => {
    expect(isPointInPolygon({ lat: 0.5, lng: 0.5 }, square)).toBe(true)
  })

  it('returns false for point outside square', () => {
    expect(isPointInPolygon({ lat: 2, lng: 2 }, square)).toBe(false)
  })

  it('returns true for point on boundary edge', () => {
    expect(isPointInPolygon({ lat: 0, lng: 0.5 }, square)).toBe(true)
  })

  it('returns true for point at vertex', () => {
    expect(isPointInPolygon({ lat: 0, lng: 0 }, square)).toBe(true)
  })

  it('works with complex polygon (pentagon)', () => {
    const pentagon = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 2 },
      { lat: 1, lng: 3 },
      { lat: 2, lng: 2 },
      { lat: 2, lng: 0 },
    ]
    expect(isPointInPolygon({ lat: 1, lng: 1 }, pentagon)).toBe(true)
    expect(isPointInPolygon({ lat: 1, lng: -1 }, pentagon)).toBe(false)
  })

  it('handles polygon crossing antimeridian', () => {
    const antimeridianPoly = [
      { lat: 0, lng: 175 },
      { lat: 0, lng: -175 },
      { lat: 10, lng: -175 },
      { lat: 10, lng: 175 },
    ]
    expect(isPointInPolygon({ lat: 5, lng: 180 }, antimeridianPoly)).toBe(false)
  })

  it('handles degenerate polygon (all same points)', () => {
    const degenerate = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0 },
    ]
    expect(isPointInPolygon({ lat: 0, lng: 0 }, degenerate)).toBe(false)
  })

  it('works with negative lat/lng', () => {
    const poly = [
      { lat: -2, lng: -2 },
      { lat: -2, lng: 2 },
      { lat: 2, lng: 2 },
      { lat: 2, lng: -2 },
    ]
    expect(isPointInPolygon({ lat: -1, lng: -1 }, poly)).toBe(true)
    expect(isPointInPolygon({ lat: -3, lng: 0 }, poly)).toBe(false)
  })
})

describe('boundingBox', () => {
  it('returns null for empty array', () => {
    expect(boundingBox([])).toBeNull()
  })

  it('returns identity for single point', () => {
    const result = boundingBox([{ lat: 10, lng: 20 }])
    expect(result).toEqual({ minLat: 10, maxLat: 10, minLng: 20, maxLng: 20 })
  })

  it('computes bounding box for 2 points', () => {
    const result = boundingBox([
      { lat: -10, lng: -20 },
      { lat: 10, lng: 20 },
    ])
    expect(result).toEqual({ minLat: -10, maxLat: 10, minLng: -20, maxLng: 20 })
  })

  it('computes bounding box for many points', () => {
    const pts = [
      { lat: -90, lng: -180 },
      { lat: 90, lng: 180 },
      { lat: 0, lng: 0 },
      { lat: 45, lng: -90 },
    ]
    const result = boundingBox(pts)
    expect(result!.minLat).toBe(-90)
    expect(result!.maxLat).toBe(90)
    expect(result!.minLng).toBe(-180)
    expect(result!.maxLng).toBe(180)
  })

  it('handles all same points', () => {
    const pts = [
      { lat: 5, lng: 5 },
      { lat: 5, lng: 5 },
      { lat: 5, lng: 5 },
    ]
    const result = boundingBox(pts)
    expect(result).toEqual({ minLat: 5, maxLat: 5, minLng: 5, maxLng: 5 })
  })
})

describe('geohash', () => {
  it('encodes origin at precision 1', () => {
    const h = geohash(0, 0, 1)
    expect(h).toBe('s')
  })

  it('encodes origin at precision 7', () => {
    const h = geohash(0, 0, 7)
    expect(h.length).toBe(7)
    expect(h).toBe('s000000')
  })

  it('encodes extreme corner 90,180', () => {
    const h = geohash(90, 180, 12)
    expect(h.length).toBe(12)
    expect(h).toBe('zzzzzzzzzzzz')
  })

  it('encodes extreme corner -90,-180', () => {
    const h = geohash(-90, -180, 5)
    expect(h).toBe('00000')
  })

  it('encodes known location (Jakarta)', () => {
    const h = geohash(-6.2, 106.8, 5)
    expect(h).toBe('qqguw')
  })

  it('longer precision produces longer hash', () => {
    const h1 = geohash(40.7, -74, 5)
    const h2 = geohash(40.7, -74, 10)
    expect(h1.length).toBe(5)
    expect(h2.length).toBe(10)
  })

  it('precision at max (35 - total bits 175)', () => {
    const h = geohash(0, 0, 35)
    expect(h.length).toBe(35)
  })
})

describe('decodeGeohash', () => {
  it('decodes back to approximate original coords', () => {
    const lat = 40.7128
    const lng = -74.006
    const hash = geohash(lat, lng, 10)
    const decoded = decodeGeohash(hash)
    expect(Math.abs(decoded.lat - lat)).toBeLessThan(0.001)
    expect(Math.abs(decoded.lng - lng)).toBeLessThan(0.001)
  })

  it('decodes origin hash', () => {
    const hash = geohash(0, 0, 5)
    const decoded = decodeGeohash(hash)
    expect(decoded.lat).toBeCloseTo(0, 1)
    expect(decoded.lng).toBeCloseTo(0, 1)
  })

  it('decodes extreme hash', () => {
    const hash = geohash(90, 180, 5)
    const decoded = decodeGeohash(hash)
    expect(decoded.lat).toBeCloseTo(90, 1)
    expect(decoded.lng).toBeCloseTo(180, 1)
  })

  it('returns error bounds', () => {
    const decoded = decodeGeohash('s000')
    expect(decoded.error).toBeDefined()
    expect(decoded.error.lat).toBeGreaterThan(0)
    expect(decoded.error.lng).toBeGreaterThan(0)
  })

  it('longer hash gives smaller error', () => {
    const d1 = decodeGeohash('s00')
    const d2 = decodeGeohash('s000000')
    expect(d2.error.lat).toBeLessThan(d1.error.lat)
    expect(d2.error.lng).toBeLessThan(d1.error.lng)
  })
})

describe('toDMS', () => {
  it('formats 0 lat as N', () => {
    expect(toDMS(0, 'lat')).toBe('0°0\'0.0"N')
  })

  it('formats positive lat as N', () => {
    expect(toDMS(51.5, 'lat')).toBe('51°30\'0.0"N')
  })

  it('formats negative lat as S', () => {
    expect(toDMS(-90, 'lat')).toBe('90°0\'0.0"S')
  })

  it('formats negative lng as W', () => {
    expect(toDMS(-74, 'lng')).toBe('74°0\'0.0"W')
  })

  it('formats positive lng as E', () => {
    expect(toDMS(180, 'lng')).toBe('180°0\'0.0"E')
  })

  it('formats 0 lng without direction ambiguity', () => {
    const result = toDMS(0, 'lng')
    expect(result).toContain('0°')
    expect(result).toContain('E')
  })

  it('handles fractional degrees', () => {
    const result = toDMS(-6.21462, 'lat')
    expect(result).toBe('6°12\'52.6"S')
  })

  it('handles negative decimal with minutes', () => {
    const result = toDMS(-33.8688, 'lat')
    expect(result).toContain('S')
    expect(result).toContain('°')
    expect(result).toContain("'")
    expect(result).toContain('"')
  })
})

describe('midpoint', () => {
  it('same point returns same point', () => {
    const m = midpoint({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })
    expect(m.lat).toBeCloseTo(0, 10)
    expect(m.lng).toBeCloseTo(0, 10)
  })

  it('midpoint on equator between longitudes', () => {
    const m = midpoint({ lat: 0, lng: -10 }, { lat: 0, lng: 10 })
    expect(m.lat).toBeCloseTo(0, 10)
    expect(m.lng).toBeCloseTo(0, 10)
  })

  it('midpoint between poles is on equator', () => {
    const m = midpoint({ lat: 90, lng: 0 }, { lat: -90, lng: 0 })
    expect(m.lat).toBeCloseTo(0, 5)
  })

  it('midpoint between Berlin and Paris', () => {
    const m = midpoint({ lat: 52.52, lng: 13.405 }, { lat: 48.857, lng: 2.352 })
    expect(m.lat).toBeCloseTo(50.73, 0)
    expect(m.lng).toBeCloseTo(7.93, 0)
  })

  it('midpoint across antimeridian', () => {
    const m = midpoint({ lat: 0, lng: 170 }, { lat: 0, lng: -170 })
    expect(m.lng).toBeCloseTo(180, 5)
  })

  it('midpoint commutative', () => {
    const a = { lat: 40, lng: -74 }
    const b = { lat: 34, lng: -118 }
    const m1 = midpoint(a, b)
    const m2 = midpoint(b, a)
    expect(m1.lat).toBeCloseTo(m2.lat, 10)
    expect(m1.lng).toBeCloseTo(m2.lng, 10)
  })

  it('handles high precision coords', () => {
    const m = midpoint({ lat: 0.0001, lng: 0.0001 }, { lat: -0.0001, lng: -0.0001 })
    expect(m.lat).toBeCloseTo(0, 10)
    expect(m.lng).toBeCloseTo(0, 10)
  })
})
