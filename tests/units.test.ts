import { describe, it, expect, vi } from 'vitest'
import { convert, convertWithCategory, getUnitCategory, isConvertible, UNIT_CATEGORIES } from '../src/units/index.js'

describe('convert', () => {
  it('same unit returns same value', () => {
    expect(convert(1, 'meter', 'meter')).toBe(1)
  })

  it('meter to kilometer', () => {
    expect(convert(1000, 'm', 'km')).toBe(1)
  })

  it('zero value remains zero', () => {
    expect(convert(0, 'km', 'm')).toBe(0)
  })

  it('celsius to fahrenheit', () => {
    expect(convert(0, 'c', 'f')).toBeCloseTo(32, 5)
  })

  it('celsius to kelvin', () => {
    expect(convert(0, 'c', 'k')).toBeCloseTo(273.15, 5)
  })

  it('fahrenheit to celsius', () => {
    expect(convert(212, 'f', 'c')).toBeCloseTo(100, 5)
  })

  it('boiling point roundtrip', () => {
    expect(convert(100, 'c', 'f')).toBeCloseTo(212, 5)
  })

  it('body temperature', () => {
    expect(convert(37, 'c', 'f')).toBeCloseTo(98.6, 4)
  })

  it('fahrenheit to kelvin', () => {
    const result = convert(32, 'f', 'k')
    expect(result).toBeCloseTo(273.15, 4)
  })

  it('meter to foot', () => {
    expect(convert(1, 'm', 'ft')).toBeCloseTo(3.28084, 4)
  })

  it('kilometer to mile', () => {
    expect(convert(1, 'km', 'mi')).toBeCloseTo(0.621371, 4)
  })

  it('kilogram to pound', () => {
    expect(convert(1, 'kg', 'lb')).toBeCloseTo(2.20462, 4)
  })

  it('gram to ounce', () => {
    expect(convert(100, 'g', 'oz')).toBeCloseTo(3.5274, 3)
  })

  it('liter to gallon', () => {
    expect(convert(1, 'l', 'gal')).toBeCloseTo(0.264172, 4)
  })

  it('milliliter to tablespoon', () => {
    expect(convert(15, 'ml', 'tbsp')).toBeCloseTo(1.01442, 3)
  })

  it('kmh to mph', () => {
    expect(convert(100, 'kmh', 'mph')).toBeCloseTo(62.1371, 3)
  })

  it('mps to kmh', () => {
    expect(convert(10, 'mps', 'kmh')).toBe(36)
  })

  it('megabyte to gigabyte', () => {
    expect(convert(1024, 'MB', 'GB')).toBeCloseTo(1.024, 5)
  })

  it('bit to byte', () => {
    expect(convert(8, 'b', 'B')).toBe(1)
  })

  it('throws for cross-category conversion', () => {
    expect(() => convert(1, 'meter', 'second')).toThrow()
  })

  it('throws from unknown unit', () => {
    expect(() => convert(1, 'nonexistent', 'meter')).toThrow()
  })

  it('throws to unknown unit', () => {
    expect(() => convert(1, 'meter', 'nonexistent')).toThrow()
  })

  it('rounds to 6 decimal places', () => {
    const result = convert(1, 'm', 'in')
    expect(result).toBe(39.370079)
  })

  it('handles negative values', () => {
    expect(convert(-1, 'm', 'ft')).toBeCloseTo(-3.28084, 4)
  })

  it('handles Infinity', () => {
    expect(convert(Infinity, 'm', 'ft')).toBe(Infinity)
  })

  it('handles -Infinity', () => {
    expect(convert(-Infinity, 'm', 'ft')).toBe(-Infinity)
  })

  it('inch to cm', () => {
    expect(convert(1, 'in', 'cm')).toBeCloseTo(2.54, 5)
  })

  it('yard to meter', () => {
    expect(convert(1, 'yd', 'm')).toBeCloseTo(0.9144, 5)
  })

  it('mile to kilometer', () => {
    expect(convert(1, 'mi', 'km')).toBeCloseTo(1.60934, 4)
  })

  it('ounce to gram', () => {
    expect(convert(1, 'oz', 'g')).toBeCloseTo(28.3495, 3)
  })

  it('ton to kilogram', () => {
    expect(convert(1, 'ton', 'kg')).toBe(1000)
  })

  it('stone to pound', () => {
    expect(convert(1, 'st', 'lb')).toBe(14)
  })

  it('knot to kmh', () => {
    expect(convert(1, 'knot', 'kmh')).toBeCloseTo(1.852, 4)
  })

  it('teaspoon to milliliter', () => {
    expect(convert(1, 'tsp', 'ml')).toBeCloseTo(4.92892, 4)
  })

  it('cup to liter', () => {
    expect(convert(1, 'cup', 'l')).toBeCloseTo(0.236588, 4)
  })

  it('data petabit to terabit', () => {
    expect(convert(1, 'pb', 'tb')).toBe(1000)
  })
})

describe('convertWithCategory', () => {
  it('returns converted value and category name', () => {
    const result = convertWithCategory(1, 'm', 'km')
    expect(result.value).toBe(0.001)
    expect(result.category).toBe('length')
  })

  it('throws for unknown unit', () => {
    expect(() => convertWithCategory(1, 'nonexistent', 'm')).toThrow()
  })
})

describe('getUnitCategory', () => {
  it('returns "length" for meter', () => {
    expect(getUnitCategory('m')).toBe('length')
  })

  it('returns "weight" for kilogram', () => {
    expect(getUnitCategory('kg')).toBe('weight')
  })

  it('returns "temperature" for celsius', () => {
    expect(getUnitCategory('c')).toBe('temperature')
  })

  it('returns "volume" for liter', () => {
    expect(getUnitCategory('l')).toBe('volume')
  })

  it('returns "speed" for kmh', () => {
    expect(getUnitCategory('kmh')).toBe('speed')
  })

  it('returns "data" for megabyte', () => {
    expect(getUnitCategory('MB')).toBe('data')
  })

  it('returns null for nonexistent unit', () => {
    expect(getUnitCategory('nonexistent')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getUnitCategory('')).toBeNull()
  })
})

describe('isConvertible', () => {
  it('same unit is convertible', () => {
    expect(isConvertible('m', 'm')).toBe(true)
  })

  it('same category units are convertible', () => {
    expect(isConvertible('m', 'ft')).toBe(true)
  })

  it('different categories are not convertible', () => {
    expect(isConvertible('m', 'kg')).toBe(false)
  })

  it('unknown unit is not convertible with anything', () => {
    expect(isConvertible('fake', 'm')).toBe(false)
    expect(isConvertible('m', 'fake')).toBe(false)
  })
})

describe('UNIT_CATEGORIES', () => {
  it('is a record with category names', () => {
    expect(UNIT_CATEGORIES).toBeDefined()
    expect(UNIT_CATEGORIES.length).toBeDefined()
  })

  it('contains length category', () => {
    expect(UNIT_CATEGORIES.length).toBeDefined()
    expect(UNIT_CATEGORIES.length.name).toBe('length')
    expect(UNIT_CATEGORIES.length.base).toBe('m')
    expect(UNIT_CATEGORIES.length.units).toContain('m')
    expect(UNIT_CATEGORIES.length.units).toContain('ft')
    expect(UNIT_CATEGORIES.length.units).toContain('km')
  })

  it('contains weight category', () => {
    expect(UNIT_CATEGORIES.weight).toBeDefined()
    expect(UNIT_CATEGORIES.weight.name).toBe('weight')
    expect(UNIT_CATEGORIES.weight.base).toBe('g')
  })

  it('contains temperature category', () => {
    expect(UNIT_CATEGORIES.temperature).toBeDefined()
    expect(UNIT_CATEGORIES.temperature.units).toEqual(['c', 'f', 'k'])
  })

  it('contains volume category', () => {
    expect(UNIT_CATEGORIES.volume).toBeDefined()
  })

  it('contains speed category', () => {
    expect(UNIT_CATEGORIES.speed).toBeDefined()
  })

  it('contains data category', () => {
    expect(UNIT_CATEGORIES.data).toBeDefined()
  })
})
