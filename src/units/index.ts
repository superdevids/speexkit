/** @file Unit conversion module for speexkit. Zero runtime dependencies, ESM-only. */

interface CategoryDef {
  name: string;
  units: string[];
  base: string;
  toBase: Record<string, number>;
  fromBase: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Conversion factor tables (multiply by factor to reach the base unit)
// ---------------------------------------------------------------------------

const LENGTH_TO_BASE: Record<string, number> = {
  mm: 1 / 1000,
  cm: 1 / 100,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};

const WEIGHT_TO_BASE: Record<string, number> = {
  mg: 1 / 1000,
  g: 1,
  kg: 1000,
  ton: 1_000_000,
  oz: 28.349523125,
  lb: 453.59237,
  st: 6350.29318,
};

const VOLUME_TO_BASE: Record<string, number> = {
  ml: 1 / 1000,
  l: 1,
  gal: 3.785411784,
  qt: 0.946352946,
  pt: 0.473176473,
  cup: 0.236588236,
  floz: 0.0295735295625,
  tbsp: 0.01478676478125,
  tsp: 0.00492892159375,
};

const SPEED_TO_BASE: Record<string, number> = {
  mps: 1,
  kmh: 1 / 3.6,
  mph: 0.44704,
  knot: 0.514444,
  fps: 0.3048,
};

const DATA_TO_BASE: Record<string, number> = {
  // bits
  b: 1,
  kb: 1000,
  mb: 1_000_000,
  gb: 1_000_000_000,
  tb: 1_000_000_000_000,
  pb: 1_000_000_000_000_000,
  // bytes (1 byte = 8 bits)
  B: 8,
  KB: 8000,
  MB: 8_000_000,
  GB: 8_000_000_000,
  TB: 8_000_000_000_000,
};

function invertFactors(factors: Record<string, number>): Record<string, number> {
  const inverted: Record<string, number> = {};
  for (const [unit, factor] of Object.entries(factors)) {
    inverted[unit] = 1 / factor;
  }
  return inverted;
}

function buildCategory(
  name: string,
  base: string,
  toBase: Record<string, number>,
  units?: string[],
): CategoryDef {
  const u = units ?? Object.keys(toBase);
  return { name, units: u, base, toBase, fromBase: invertFactors(toBase) };
}

const CATEGORY_DEFS: CategoryDef[] = [
  buildCategory('length', 'm', LENGTH_TO_BASE),
  buildCategory('weight', 'g', WEIGHT_TO_BASE),
  buildCategory('temperature', 'c', {}, ['c', 'f', 'k']),
  buildCategory('volume', 'l', VOLUME_TO_BASE),
  buildCategory('speed', 'mps', SPEED_TO_BASE),
  buildCategory('data', 'b', DATA_TO_BASE),
];

// ---------------------------------------------------------------------------
// Public lookup maps
// ---------------------------------------------------------------------------

/**
 * Metadata for every unit category.
 * Each entry contains the human-readable `name`, the list of supported `units`,
 * and the `base` unit for the category.
 */
export const UNIT_CATEGORIES: Record<string, { name: string; units: string[]; base: string }> =
  Object.fromEntries(
    CATEGORY_DEFS.map((c) => [c.name, { name: c.name, units: c.units, base: c.base }]),
  );

const UNIT_TO_CATEGORY: Record<string, string> = {};
for (const cat of CATEGORY_DEFS) {
  for (const unit of cat.units) {
    UNIT_TO_CATEGORY[unit] = cat.name;
  }
}

// Category-level toBase/fromBase for linear conversions
const CAT_TO_BASE: Record<string, Record<string, number>> = {};
const CAT_FROM_BASE: Record<string, Record<string, number>> = {};
for (const cat of CATEGORY_DEFS) {
  CAT_TO_BASE[cat.name] = cat.toBase;
  CAT_FROM_BASE[cat.name] = cat.fromBase;
}

// ---------------------------------------------------------------------------
// Temperature helpers (non-linear)
// ---------------------------------------------------------------------------

function toCelsius(value: number, unit: string): number {
  if (unit === 'c') return value;
  if (unit === 'f') return (value - 32) * (5 / 9);
  if (unit === 'k') return value - 273.15;
  throw new Error(`Unknown temperature unit: ${unit}`);
}

function fromCelsius(value: number, unit: string): number {
  if (unit === 'c') return value;
  if (unit === 'f') return value * (9 / 5) + 32;
  if (unit === 'k') return value + 273.15;
  throw new Error(`Unknown temperature unit: ${unit}`);
}

// ---------------------------------------------------------------------------
// Rounding helper
// ---------------------------------------------------------------------------

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the category name for a unit, or `null` if unrecognised.
 */
export function getUnitCategory(unit: string): string | null {
  return UNIT_TO_CATEGORY[unit] ?? null;
}

/**
 * Check whether two units belong to the same category and can be converted.
 */
export function isConvertible(from: string, to: string): boolean {
  if (from === to) return true;
  const cat = UNIT_TO_CATEGORY[from];
  return cat !== undefined && cat === UNIT_TO_CATEGORY[to];
}

/**
 * Convert a numeric value from one unit to another.
 * Units are auto-detected from the built-in categories (length, weight,
 * temperature, volume, speed, data size).
 *
 * Temperature conversions are handled with dedicated formulas (not linear).
 * Data-size conversions respect the 1 byte = 8 bits relationship.
 * Results are rounded to 6 decimal places.
 *
 * @throws if either unit is unknown, or if the units belong to different
 *         categories.
 */
export function convert(value: number, from: string, to: string): number {
  if (from === to) return value;

  const cat = UNIT_TO_CATEGORY[from];
  if (cat === undefined) {
    throw new Error(`Unknown unit: "${from}"`);
  }
  if (UNIT_TO_CATEGORY[to] !== cat) {
    throw new Error(
      `Cannot convert "${from}" (${cat}) to "${to}" (${UNIT_TO_CATEGORY[to] ?? 'unknown'})`,
    );
  }

  // Temperature — non-linear
  if (cat === 'temperature') {
    return round6(fromCelsius(toCelsius(value, from), to));
  }

  // Linear conversion: value → base → target
  const baseValue = value * CAT_TO_BASE[cat]![from]!;
  return round6(baseValue * CAT_FROM_BASE[cat]![to]!);
}

/**
 * Like {@link convert} but also returns the detected category name.
 */
export function convertWithCategory(
  value: number,
  from: string,
  to: string,
): { value: number; category: string } {
  const cat = UNIT_TO_CATEGORY[from];
  if (cat === undefined) {
    throw new Error(`Unknown unit: "${from}"`);
  }
  return { value: convert(value, from, to), category: cat };
}
