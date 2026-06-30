const CRON_FIELD = new RegExp(
  '^(?:\\*|\\d+|\\d+-\\d+|\\*(?:/\\d+)?|\\d+(?:-\\d+)?(?:/\\d+)?)' + '(?:,(?:\\*|\\d+|\\d+-\\d+|\\*(?:/\\d+)?|\\d+(?:-\\d+)?(?:/\\d+)?))*$',
)

/**
 * Checks if a string is a valid cron expression (5 space-separated fields).
 *
 * Each field supports `*`, numbers, ranges (`-`), step values (`/`),
 * and comma-separated lists.
 *
 * @param value - The string to validate.
 * @returns Whether the value is a valid cron expression.
 *
 * @example
 * isCronExpression('&ast;/5 &ast; &ast; &ast; &ast;')  // true
 * isCronExpression('0 0 1 1 &ast;')    // true
 * isCronExpression('not-cron')     // false
 */
export function isCronExpression(value: string): boolean {
  if (typeof value !== 'string') return false
  const fields = value.trim().split(/\s+/)
  if (fields.length !== 5) return false
  return fields.every((f) => CRON_FIELD.test(f))
}
