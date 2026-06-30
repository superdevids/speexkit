function normalizeIsbn(value: string): string {
  return value.replace(/-/g, '')
}

function checkIsbn10(value: string): boolean {
  const cleaned = normalizeIsbn(value)
  if (!/^\d{9}[\dX]$/i.test(cleaned)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += (i + 1) * parseInt(cleaned[i]!, 10)
  }
  const check = cleaned[9]!.toUpperCase()
  sum += check === 'X' ? 10 : parseInt(check, 10)
  return sum % 11 === 0
}

function checkIsbn13(value: string): boolean {
  const cleaned = normalizeIsbn(value)
  if (!/^\d{13}$/.test(cleaned)) return false
  let sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]!, 10) * (i % 2 === 0 ? 1 : 3)
  }
  return sum % 10 === 0
}

/**
 * Checks if a string is a valid ISBN (International Standard Book Number).
 *
 * Validates ISBN-10 and ISBN-13 formats with or without hyphens.
 * Accepts either version when `version` is omitted.
 *
 * @param value - The string to validate.
 * @param version - Optional ISBN version to restrict to (10 or 13).
 * @returns Whether the value is a valid ISBN.
 *
 * @example
 * isISBN('0-306-40615-2')        // true (ISBN-10)
 * isISBN('978-0-306-40615-7')    // true (ISBN-13)
 * isISBN('0-306-40615-2', 10)   // true
 * isISBN('0-306-40615-2', 13)   // false
 * isISBN('not-an-isbn')         // false
 */
export function isISBN(value: string, version?: 10 | 13): boolean {
  if (typeof value !== 'string' || value.length === 0) return false

  if (version === 10) return checkIsbn10(value)
  if (version === 13) return checkIsbn13(value)

  return checkIsbn10(value) || checkIsbn13(value)
}
