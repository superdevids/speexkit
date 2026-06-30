const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i

function toDigitString(iban: string): string {
  let digits = ''
  for (const ch of iban) {
    if (ch >= '0' && ch <= '9') {
      digits += ch
    } else {
      digits += (ch.charCodeAt(0) - 55).toString()
    }
  }
  return digits
}

function mod97(digits: string): number {
  let remainder = 0
  for (let i = 0; i < digits.length; i++) {
    remainder = (remainder * 10 + parseInt(digits[i]!, 10)) % 97
  }
  return remainder
}

/**
 * Checks if a string is a valid IBAN (International Bank Account Number).
 *
 * Format: 2 letters + 2 digits + up to 30 alphanumeric characters.
 * Includes modulus 97 checksum verification.
 *
 * @param value - The string to validate.
 * @returns Whether the value is a valid IBAN.
 *
 * @example
 * isIBAN('GB33BUKB20201555555555') // true
 * isIBAN('DE89370400440532013000') // true
 * isIBAN('not-an-iban')           // false
 */
export function isIBAN(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false

  const cleaned = value.replace(/\s/g, '').toUpperCase()
  if (!IBAN_RE.test(cleaned)) return false
  if (cleaned.length < 4) return false

  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4)
  const digits = toDigitString(rearranged)

  return mod97(digits) === 1
}
