/**
 * Wraps {@link Intl.NumberFormat} with sensible defaults.
 *
 * @param n - The number to format.
 * @param locale - The locale string (default `'id-ID'`).
 * @param opts - Additional {@link Intl.NumberFormatOptions}.
 * @returns The formatted number string.
 *
 * @example
 * formatNumber(15000.5) // "15.000,5"
 * formatNumber(15000.5, 'en-US') // "15,000.5"
 */
export function formatNumber(n: number, locale: string = 'id-ID', opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, opts).format(n)
}

/**
 * Formats a number as a currency string.
 *
 * @param n - The numeric value.
 * @param currency - ISO 4217 currency code (default `'IDR'`).
 * @param locale - The locale string (default `'id-ID'`).
 * @returns The formatted currency string.
 *
 * @example
 * formatCurrency(15000) // "Rp15.000"
 * formatCurrency(15000, 'USD', 'en-US') // "$15,000.00"
 */
export function formatCurrency(n: number, currency: string = 'IDR', locale: string = 'id-ID'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(n)
}

/**
 * Formats a relative time description using {@link Intl.RelativeTimeFormat}.
 *
 * @param n - The numeric value (negative for past, positive for future).
 * @param unit - The time unit (e.g. `'day'`, `'hour'`, `'minute'`).
 * @param locale - The locale string (default `'id-ID'`).
 * @returns The formatted relative time string.
 *
 * @example
 * formatRelativeTime(-2, 'day') // "2 hari yang lalu"
 * formatRelativeTime(1, 'hour', 'en') // "in 1 hour"
 */
export function formatRelativeTime(n: number, unit: Intl.RelativeTimeFormatUnit, locale: string = 'id-ID'): string {
  if (!Number.isFinite(n)) return String(n)
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(n, unit)
}

/**
 * Joins a list of strings with locale-aware conjunctions.
 *
 * @param items - The string items to join.
 * @param locale - The locale string (default `'id-ID'`).
 * @param opts - Additional {@link Intl.ListFormatOptions}.
 * @returns The formatted list string.
 *
 * @example
 * formatList(['a', 'b', 'c'], 'id') // "a, b, dan c"
 * formatList(['a', 'b', 'c'], 'en') // "a, b, and c"
 */
export function formatList(items: string[], locale: string = 'id-ID', opts?: Intl.ListFormatOptions): string {
  return new Intl.ListFormat(locale, opts).format(items)
}

/**
 * Returns the correct plural form for a count using {@link Intl.PluralRules}.
 *
 * @param count - The number to determine plural category from.
 * @param forms - An object mapping plural categories to their string forms.
 * @param forms.one - Required form for the `one` category.
 * @param forms.other - Required form for the `other` category.
 * @param forms.zero - Optional form for the `zero` category.
 * @param forms.few - Optional form for the `few` category.
 * @param locale - The locale string (default `'id-ID'`).
 * @returns The appropriate plural form string.
 *
 * @example
 * pluralize(1, { one: 'buku', other: 'buku' }) // "buku"
 * pluralize(3, { one: 'item', other: 'items' }, 'en') // "items"
 */
export function pluralize(
  count: number,
  forms: { one: string; other: string; zero?: string; few?: string },
  locale: string = 'id-ID',
): string {
  const rule = new Intl.PluralRules(locale).select(count)
  if (rule === 'zero' && forms.zero !== undefined) return forms.zero
  if (rule === 'few' && forms.few !== undefined) return forms.few
  if (rule === 'one') return forms.one
  return forms.other
}

/**
 * A locale-aware message translator with parameter interpolation.
 */
export interface Translator {
  /**
   * Translates the given key using the active locale.
   *
   * - Looks up `messages[locale][key]`
   * - Falls back to `messages[defaultLocale][key]`
   * - Falls back to the key itself if not found
   *
   * Placeholders like `{name}` in the message are replaced with
   * the corresponding value from `params`.
   *
   * @param key - The translation key.
   * @param params - Optional record of interpolation parameters.
   * @returns The translated and interpolated string.
   */
  t(key: string, params?: Record<string, string | number>): string

  /** Switches the active locale. */
  setLocale(locale: string): void

  /** Returns the current active locale. */
  getLocale(): string

  /**
   * Merges new messages into the store for a given locale.
   *
   * @param locale - The target locale.
   * @param messages - A record of key-value message pairs.
   */
  addMessages(locale: string, messages: Record<string, string>): void
}

/**
 * Creates a {@link Translator} instance backed by a messages store.
 *
 * @param messages - Nested record keyed by locale then message key.
 * @param defaultLocale - The fallback locale (default `'id-ID'`).
 * @returns A {@link Translator} object.
 *
 * @example
 * const t = createTranslator({
 *   en: { greeting: 'Hello, {name}!' },
 *   id: { greeting: 'Halo, {name}!' },
 * })
 * t.t('greeting', { name: 'Alice' }) // "Halo, Alice!"
 * t.setLocale('en')
 * t.t('greeting', { name: 'Alice' }) // "Hello, Alice!"
 */
export function createTranslator(messages: Record<string, Record<string, string>>, defaultLocale: string = 'id-ID'): Translator {
  const store: Record<string, Record<string, string>> = { ...messages }
  let currentLocale = defaultLocale

  function interpolate(msg: string, params?: Record<string, string | number>): string {
    if (!params) return msg
    return msg.replace(/\{(\w+)\}/g, (_, key: string) => {
      const val = params[key]
      return val !== undefined ? String(val) : `{${key}}`
    })
  }

  return {
    t(key: string, params?: Record<string, string | number>): string {
      const msg = store[currentLocale]?.[key] ?? store[defaultLocale]?.[key] ?? key
      return interpolate(msg, params)
    },

    setLocale(locale: string): void {
      currentLocale = locale
    },

    getLocale(): string {
      return currentLocale
    },

    addMessages(locale: string, messages: Record<string, string>): void {
      const existing = store[locale]
      if (existing) {
        Object.assign(existing, messages)
      } else {
        store[locale] = { ...messages }
      }
    },
  }
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
]

/**
 * Returns a human-friendly "time ago" description for a given date.
 *
 * Differences greater than one year are truncated to year precision.
 *
 * @param date - A `Date` object or a Unix-millisecond timestamp.
 * @param locale - The locale string (default `'id-ID'`).
 * @returns A relative time string such as "5 menit yang lalu" or "2 hours ago".
 *
 * @example
 * timeAgo(Date.now() - 300000) // "5 menit yang lalu"
 * timeAgo(Date.now() - 300000, 'en') // "5 minutes ago"
 * timeAgo(new Date('2024-01-01'), 'en') // "18 months ago"
 */
export function timeAgo(date: Date | number, locale: string = 'id-ID'): string {
  const now = Date.now()
  const then = typeof date === 'number' ? date : date.getTime()
  const diffSeconds = Math.floor((now - then) / 1000)

  const absDiff = Math.abs(diffSeconds)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  for (const [unit, seconds] of UNITS) {
    if (absDiff >= seconds) {
      const value = -Math.floor(diffSeconds / seconds)
      return rtf.format(value, unit)
    }
  }

  return rtf.format(0, 'second')
}
