// ---------------------------------------------------------------------------
// speexkit/src/mock/index.ts
// Zero-dependency seeded fake data generator for Indonesian/Western contexts.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Internal PRNG — mulberry32
// ---------------------------------------------------------------------------

let _seed: number = Date.now()

/**
 * Seed the internal PRNG for deterministic output.
 * Call before any `fake*` function to lock the sequence.
 */
export function seedRandom(seed: number): void {
  _seed = seed
}

/**
 * Internal mulberry32 PRNG.
 * Returns a pseudo-random float in [0, 1).
 */
function _random(): number {
  _seed |= 0
  _seed = (_seed + 0x6d2b79f5) | 0
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function _randInt(min: number, max: number): number {
  return Math.floor(_random() * (max - min + 1)) + min
}

function _pick<T>(arr: readonly T[]): T {
  return arr[_randInt(0, arr.length - 1)]!
}

// ---------------------------------------------------------------------------
// Name pools
// ---------------------------------------------------------------------------

const _firstNamesMale: readonly string[] = [
  'Adi',
  'Budi',
  'Chandra',
  'Dedi',
  'Eko',
  'Fitri',
  'Gilang',
  'Hendra',
  'Irwan',
  'Joko',
  'Kevin',
  'Lucas',
  'Michael',
  'Nathan',
  'Oliver',
  'Pramono',
  'Rizky',
  'Samuel',
  'Teguh',
  'Wahyu',
  'Alexander',
  'Benjamin',
  'Daniel',
  'Ethan',
  'Gabriel',
  'Henry',
  'Ivan',
  'James',
  'Ryan',
]

const _firstNamesFemale: readonly string[] = [
  'Ani',
  'Bella',
  'Citra',
  'Dewi',
  'Eva',
  'Fitriani',
  'Gita',
  'Hani',
  'Indah',
  'Jessica',
  'Kartika',
  'Laura',
  'Maria',
  'Nadia',
  'Olivia',
  'Putri',
  'Rachel',
  'Sari',
  'Tina',
  'Utami',
  'Vina',
  'Wulan',
  'Amelia',
  'Clara',
  'Emma',
  'Grace',
  'Isabella',
  'Maya',
  'Sarah',
]

const _lastNames: readonly string[] = [
  'Adinata',
  'Baskoro',
  'Cahyadi',
  'Darmawan',
  'Effendi',
  'Firmansyah',
  'Gunawan',
  'Hartono',
  'Irawan',
  'Jaya',
  'Kusuma',
  'Lestari',
  'Maulana',
  'Nugroho',
  'Pratama',
  'Rahman',
  'Santoso',
  'Tambunan',
  'Utomo',
  'Wijaya',
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
]

// ---------------------------------------------------------------------------
// Name generators
// ---------------------------------------------------------------------------

/**
 * Return a random first name (male or female).
 */
export function fakeFirstName(): string {
  return _random() < 0.5 ? _pick(_firstNamesMale) : _pick(_firstNamesFemale)
}

/**
 * Return a random last name.
 */
export function fakeLastName(): string {
  return _pick(_lastNames)
}

/**
 * Return a simple random "First Last" string.
 */
export function fakeName(): string {
  return `${fakeFirstName()} ${fakeLastName()}`
}

/**
 * Return an object with firstName, lastName, and fullName.
 * Optionally restrict the gender pool.
 */
export function fakeFullName(gender?: 'male' | 'female'): { firstName: string; lastName: string; fullName: string } {
  const firstName = gender === 'male' ? _pick(_firstNamesMale) : gender === 'female' ? _pick(_firstNamesFemale) : fakeFirstName()
  const lastName = fakeLastName()
  return { firstName, lastName, fullName: `${firstName} ${lastName}` }
}

// ---------------------------------------------------------------------------
// Contact generators
// ---------------------------------------------------------------------------

/**
 * Return a random email address.
 * @param opts.domain - optional custom domain (default: "example.com")
 * @param opts.name   - optional local-part override
 */
export function fakeEmail(opts?: { domain?: string; name?: string }): string {
  const domain = opts?.domain ?? 'example.com'
  const local = opts?.name ?? fakeFirstName().toLowerCase() + '.' + fakeLastName().toLowerCase()
  return `${local}@${domain}`
}

/**
 * Return a random phone number.
 * @param opts.country - "ID" for Indonesian format, "US" for US format (default: "ID")
 */
export function fakePhone(opts?: { country?: 'ID' | 'US' }): string {
  const country = opts?.country ?? 'ID'
  if (country === 'US') {
    const n = (): string => String(_randInt(100, 999))
    return `+1 (${n()}) ${n()}-${String(_randInt(1000, 9999))}`
  }
  // Indonesian format: +62 8xx-xxxx-xxxx
  const a = String(_randInt(811, 899))
  const b = String(_randInt(1000, 9999))
  const c = String(_randInt(1000, 9999))
  return `+62 ${a}-${b}-${c}`
}

// ---------------------------------------------------------------------------
// UUID v4 — reused from string module pattern
// ---------------------------------------------------------------------------

/**
 * Return a random UUID v4 string.
 */
export function fakeUUID(): string {
  const hex = (len: number): string => {
    let out = ''
    for (let i = 0; i < len; i++) {
      out += _randInt(0, 15).toString(16)
    }
    return out
  }
  return hex(8) + '-' + hex(4) + '-4' + hex(3) + '-a' + hex(3) + '-' + hex(12)
}

// ---------------------------------------------------------------------------
// Address pools
// ---------------------------------------------------------------------------

const _cities: readonly string[] = [
  'Jakarta',
  'Surabaya',
  'Bandung',
  'Medan',
  'Semarang',
  'Makassar',
  'Tangerang',
  'Denpasar',
  'Palembang',
  'Yogyakarta',
  'Malang',
  'Bekasi',
  'Depok',
  'Solo',
  'Manado',
  'Banjarmasin',
  'Pontianak',
  'Samarinda',
  'Padang',
  'Batam',
]

const _states: readonly string[] = [
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'Jawa Timur',
  'Sumatera Utara',
  'Sulawesi Selatan',
  'Bali',
  'Kalimantan Timur',
  'Sumatera Selatan',
  'Lampung',
  'Banten',
  'Kalimantan Selatan',
]

const _streetNames: readonly string[] = [
  'Merdeka',
  'Sudirman',
  'Thamrin',
  'Gajah Mada',
  'Hayam Wuruk',
  'Diponegoro',
  'Ahmad Yani',
  'Pahlawan',
  'Kemerdekaan',
  'Sukarno Hatta',
  'Cendrawasih',
  'Anggrek',
  'Mawar',
  'Melati',
  'Kenanga',
  'Flamboyan',
  'Kartini',
  'Pattimura',
  'Sisingamangaraja',
  'Imam Bonjol',
]

const _zips: readonly string[] = [
  '10110',
  '10220',
  '40115',
  '60271',
  '50131',
  '90221',
  '15118',
  '80231',
  '30121',
  '55281',
  '65111',
  '17111',
  '16421',
  '57111',
  '95111',
  '70111',
  '78111',
  '75111',
  '25111',
  '29411',
]

/**
 * Return a random city name (Indonesian).
 */
export function fakeCity(): string {
  return _pick(_cities)
}

/**
 * Return a random street address, optionally with an Indonesian "Jl." prefix.
 */
export function fakeStreet(): string {
  const prefix = _random() < 0.85 ? 'Jl. ' : ''
  return `${prefix}${_pick(_streetNames)} No. ${_randInt(1, 200)}`
}

/**
 * Return a random address object.
 */
export function fakeAddress(): {
  street: string
  city: string
  state: string
  zip: string
  country: string
} {
  return {
    street: fakeStreet(),
    city: fakeCity(),
    state: _pick(_states),
    zip: _pick(_zips),
    country: 'Indonesia',
  }
}

// ---------------------------------------------------------------------------
// Business generators
// ---------------------------------------------------------------------------

const _companies: readonly string[] = [
  'Pertamina',
  'Telkom Indonesia',
  'Bank Mandiri',
  'Gojek',
  'Tokopedia',
  'Bukalapak',
  'Traveloka',
  'Krakatau Steel',
  'Semen Indonesia',
  'Indofood',
  'Kalbe Farma',
  'Unilever Indonesia',
  'Astra International',
  'Mayora Indah',
  'Alfamart',
  'Indomaret',
  'Garuda Indonesia',
  'Sriwijaya Air',
  'Lion Air',
  'BNI',
  'BRI',
  'BCA',
  'Dana',
  'OVO',
  'Sea Group',
  'Shopee Indonesia',
  'Blibli',
  'Sociolla',
  'Zalora Indonesia',
  'JD.id',
]

/**
 * Return a random Indonesian company name with "PT " prefix.
 */
export function fakeCompany(): string {
  return `PT ${_pick(_companies)}`
}

const _jobTitles: readonly string[] = [
  'Software Engineer',
  'Data Scientist',
  'Product Manager',
  'UI/UX Designer',
  'DevOps Engineer',
  'Backend Developer',
  'Frontend Developer',
  'Full Stack Developer',
  'Quality Assurance',
  'System Analyst',
  'IT Manager',
  'CTO',
  'CEO',
  'Marketing Manager',
  'Sales Executive',
  'HR Manager',
  'Finance Analyst',
  'Business Analyst',
  'Project Manager',
  'Scrum Master',
  'Tech Lead',
  'Cloud Architect',
  'Security Engineer',
  'Database Administrator',
  'Network Engineer',
  'Mobile Developer',
  'Machine Learning Engineer',
  'Data Analyst',
  'Content Writer',
  'Graphic Designer',
  'Customer Support',
  'Operations Manager',
  'Legal Counsel',
]

const _departments: readonly string[] = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Legal',
  'Customer Support',
  'Research & Development',
  'IT',
  'Security',
  'Data',
  'Business Development',
]

/**
 * Return a random job title.
 */
export function fakeJobTitle(): string {
  return _pick(_jobTitles)
}

/**
 * Return a random department name.
 */
export function fakeDepartment(): string {
  return _pick(_departments)
}

// ---------------------------------------------------------------------------
// Text / Lorem word pool
// ---------------------------------------------------------------------------

const _words: readonly string[] = [
  'lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'duis',
  'aute',
  'irure',
  'reprehenderit',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'eu',
  'fugiat',
  'nulla',
  'pariatur',
  'excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'culpa',
  'qui',
  'officia',
  'deserunt',
  'mollit',
  'anim',
  'id',
  'est',
  'laborum',
  'fusce',
  'vitae',
  'erat',
  'neque',
  'tellus',
  'lacus',
  'phasellus',
  'molestie',
  'semper',
  'auctor',
  'mauris',
  'turpis',
  'massa',
  'nunc',
  'feugiat',
  'libero',
  'vel',
  'maximus',
  'blandit',
  'justo',
  'suscipit',
  'sem',
  'metus',
  'porttitor',
  'lectus',
  'urna',
  'donec',
  'iaculis',
  'risus',
  'ornare',
  'dapibus',
  'sapien',
  'scelerisque',
  'hendrerit',
  'gravida',
  'egestas',
  'imperdiet',
  'placerat',
  'fermentum',
  'pretium',
  'congue',
  'tortor',
  'facilisis',
  'sollicitudin',
  'vestibulum',
  'odio',
  'dignissim',
  'ultricies',
  'elementum',
  'tristique',
  'efficitur',
  'malesuada',
  'nibh',
  'eleifend',
  'sodales',
  'rutrum',
  'interdum',
  'habitasse',
  'platea',
  'dictumst',
  'etiam',
  'viverra',
  'curabitur',
  'vivamus',
  'arcu',
  'tempus',
  'cras',
  'convallis',
  'venenatis',
  'nullam',
  'suspendisse',
  'potenti',
  'lobortis',
  'faucibus',
  'aenean',
  'pellentesque',
  'pulvinar',
  'aliquam',
  'purus',
  'montes',
  'nascetur',
  'ridiculus',
  'mus',
  'integer',
  'ante',
  'metus',
]

/**
 * Return a sentence built from the word pool.
 * @param minWords - minimum word count (default: 5)
 * @param maxWords - maximum word count (default: 15)
 */
export function fakeSentence(minWords = 5, maxWords = 15): string {
  const count = _randInt(minWords, maxWords)
  const parts: string[] = []
  for (let i = 0; i < count; i++) {
    parts.push(_pick(_words))
  }
  const sentence = parts.join(' ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.'
}

/**
 * Return a paragraph of `sentences` sentences (default: 3-6 if omitted).
 */
export function fakeParagraph(sentences?: number): string {
  const n = sentences ?? _randInt(3, 6)
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    parts.push(fakeSentence())
  }
  return parts.join(' ')
}

/**
 * Return a lorem-style string of `wordCount` words (default: 50).
 */
export function fakeLorem(wordCount = 50): string {
  const parts: string[] = []
  for (let i = 0; i < wordCount; i++) {
    parts.push(_pick(_words))
  }
  return parts.join(' ')
}

// ---------------------------------------------------------------------------
// Data generators
// ---------------------------------------------------------------------------

/**
 * Return a random integer in [min, max] (inclusive).
 */
export function fakeInt(min: number, max: number): number {
  return _randInt(min, max)
}

/**
 * Return a random float in [min, max) with optional decimal precision.
 */
export function fakeFloat(min: number, max: number, decimals?: number): number {
  const val = _random() * (max - min) + min
  return decimals !== undefined ? Number(val.toFixed(decimals)) : val
}

/**
 * Return a random boolean.
 */
export function fakeBoolean(): boolean {
  return _random() < 0.5
}

/**
 * Return a random Date between `start` and `end` (defaults: 1970-01-01 … now).
 */
export function fakeDate(start?: Date, end?: Date): Date {
  const s = start ?? new Date(0)
  const e = end ?? new Date()
  const t = s.getTime() + _random() * (e.getTime() - s.getTime())
  return new Date(t)
}

/**
 * Return a random hex colour string (e.g. "#a3f07b").
 */
export function fakeColor(): string {
  const r = _randInt(0, 255).toString(16).padStart(2, '0')
  const g = _randInt(0, 255).toString(16).padStart(2, '0')
  const b = _randInt(0, 255).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

/**
 * Return a random URL.
 */
export function fakeUrl(): string {
  const proto = 'https'
  const name = _pick(_words).toLowerCase()
  const tld = _pick(['com', 'id', 'net', 'org', 'co.id'])
  const slug = _pick(_words).toLowerCase()
  return `${proto}://${name}.${tld}/${slug}`
}

/**
 * Return a placeholder avatar URL via pravatar.
 * @param gender - optional hint (used in the query string for variety)
 */
export function fakeAvatar(gender?: 'male' | 'female'): string {
  const uid = _randInt(1, 1000)
  const g = gender ?? (_random() < 0.5 ? 'male' : 'female')
  return `https://i.pravatar.cc/150?u=${uid}_${g}`
}

// ---------------------------------------------------------------------------
// Schema integration (zero-dep)
// ---------------------------------------------------------------------------

/**
 * Generate fake data from a simplified schema definition.
 *
 * Accepts either:
 *
 * 1. A plain-object shape: `{ name: 'string', age: 'number', active: 'boolean', email: 'email' }`
 * 2. An object with a `parse` method (e.g. a Zod schema) — the schema is inferred from
 *    its constructor name or `.description` heuristics, then plain-object generation is used.
 *
 * @example
 * ```ts
 * fakeFromSchema({ name: 'string', age: 'number', active: 'boolean' })
 * // => { name: 'Budi', age: 29, active: true }
 * ```
 */
export function fakeFromSchema(schema: any): any {
  // If it quacks like a Zod/Valibot/arktype schema, try to extract a description.
  if (schema && typeof schema.parse === 'function') {
    const desc: string = (schema._def?.description as string | undefined) ?? schema.description ?? schema.constructor?.name ?? ''
    // Fall through to plain-object branch with a generic hint.
    return _generateFromDescription(desc)
  }

  // Plain-object shape.
  const result: Record<string, any> = {}
  for (const [key, type] of Object.entries(schema)) {
    result[key] = _generateValue(type as string)
  }
  return result
}

function _generateValue(type: string): any {
  switch (type) {
    case 'string':
      return fakeName()
    case 'number':
      return fakeInt(1, 1000)
    case 'boolean':
      return fakeBoolean()
    case 'email':
      return fakeEmail()
    default:
      return fakeName()
  }
}

function _generateFromDescription(_desc: string): any {
  // Conservative fallback: return a simple generated object.
  return {
    id: fakeUUID(),
    name: fakeName(),
    email: fakeEmail(),
    createdAt: fakeDate().toISOString(),
  }
}
