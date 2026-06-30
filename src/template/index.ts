type TokenType = 'text' | 'var' | 'raw' | 'section-open' | 'section-close' | 'inverted-open' | 'comment' | 'partial'

interface Token {
  type: TokenType
  value: string
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function resolveValue(path: string, data: unknown): unknown {
  if (path === '.') return data
  const parts = path.split('.')
  let current: unknown = data
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function tokenize(template: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const len = template.length

  while (i < len) {
    if (template[i] === '{' && template[i + 1] === '{') {
      if (template[i + 2] === '{') {
        const end = template.indexOf('}}}', i + 3)
        if (end === -1) {
          tokens.push({ type: 'text', value: template.slice(i) })
          break
        }
        tokens.push({ type: 'raw', value: template.slice(i + 3, end).trim() })
        i = end + 3
      } else if (template[i + 2] === '&') {
        const end = template.indexOf('}}', i + 3)
        if (end === -1) {
          tokens.push({ type: 'text', value: template.slice(i) })
          break
        }
        tokens.push({ type: 'raw', value: template.slice(i + 3, end).trim() })
        i = end + 2
      } else {
        const end = template.indexOf('}}', i + 2)
        if (end === -1) {
          tokens.push({ type: 'text', value: template.slice(i) })
          break
        }
        const content = template.slice(i + 2, end)
        const tag = content.trim()

        if (tag.startsWith('#')) {
          tokens.push({ type: 'section-open', value: tag.slice(1).trim() })
        } else if (tag.startsWith('/')) {
          tokens.push({ type: 'section-close', value: tag.slice(1).trim() })
        } else if (tag.startsWith('^')) {
          tokens.push({ type: 'inverted-open', value: tag.slice(1).trim() })
        } else if (tag.startsWith('!')) {
          tokens.push({ type: 'comment', value: tag.slice(1).trim() })
        } else if (tag.startsWith('>')) {
          tokens.push({ type: 'partial', value: tag.slice(1).trim() })
        } else if (tag.startsWith('&')) {
          tokens.push({ type: 'raw', value: tag.slice(1).trim() })
        } else {
          tokens.push({ type: 'var', value: tag })
        }

        i = end + 2
      }
    } else {
      const start = i
      while (i < len && !(template[i] === '{' && template[i + 1] === '{')) {
        i++
      }
      tokens.push({ type: 'text', value: template.slice(start, i) })
    }
  }

  return tokens
}

function findSectionEnd(tokens: Token[], openIndex: number): number {
  let depth = 1
  let i = openIndex + 1
  while (i < tokens.length && depth > 0) {
    const t = tokens[i]
    if (t !== undefined) {
      if (t.type === 'section-open' || t.type === 'inverted-open') depth++
      else if (t.type === 'section-close') depth--
    }
    i++
  }
  return i
}

function collectInnerTokens(tokens: Token[], openIndex: number, endIndex: number): Token[] {
  return tokens.slice(openIndex + 1, endIndex - 1)
}

function renderTokens(tokens: Token[], data: unknown, partials: Record<string, string>): string {
  let result = ''
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]
    if (token === undefined) {
      i++
      continue
    }

    switch (token.type) {
      case 'text': {
        result += token.value
        i++
        break
      }

      case 'var': {
        const val = resolveValue(token.value, data)
        result += val != null ? escapeHtml(String(val)) : ''
        i++
        break
      }

      case 'raw': {
        const val = resolveValue(token.value, data)
        result += val != null ? String(val) : ''
        i++
        break
      }

      case 'comment': {
        i++
        break
      }

      case 'section-open': {
        const sectionData = resolveValue(token.value, data)
        const endIdx = findSectionEnd(tokens, i)
        const inner = collectInnerTokens(tokens, i, endIdx)

        if (sectionData && inner.length > 0) {
          if (Array.isArray(sectionData)) {
            for (const item of sectionData) {
              result += renderTokens(inner, item, partials)
            }
          } else {
            result += renderTokens(inner, data, partials)
          }
        }
        i = endIdx
        break
      }

      case 'inverted-open': {
        const sectionData = resolveValue(token.value, data)
        const endIdx = findSectionEnd(tokens, i)
        const inner = collectInnerTokens(tokens, i, endIdx)

        const shouldRender = Array.isArray(sectionData) ? sectionData.length === 0 : !sectionData

        if (shouldRender && inner.length > 0) {
          result += renderTokens(inner, data, partials)
        }
        i = endIdx
        break
      }

      case 'partial': {
        const partialTemplate = partials[token.value]
        if (partialTemplate != null) {
          result += renderTokens(tokenize(partialTemplate), data, partials)
        }
        i++
        break
      }

      default: {
        i++
        break
      }
    }
  }

  return result
}

/**
 * Renders a mustache-compatible template with the given data.
 *
 * Supports:
 * - Variables: `{{name}}` → HTML-escaped value
 * - Raw/unescaped: `{{{var}}}` or `{{&var}}` → raw value
 * - Sections: `{{#list}}...{{/list}}` → iterates arrays, truthy check
 * - Inverted sections: `{{^list}}...{{/list}}` → renders if falsy/empty
 * - Comments: `{{! comment }}` → stripped from output
 * - Partials: `{{>partial}}` → included from `partials` map
 * - Dotted paths: `{{user.name}}`, `{{a.b.c}}`
 * - Current context: `{{.}}` inside array sections
 *
 * @param template - The mustache template string.
 * @param data - The data context for variable resolution.
 * @param partials - Optional map of partial template strings.
 * @returns The rendered output string.
 * @example
 * render('Hello {{name}}', { name: 'World' }) // "Hello World"
 * render('{{#items}}{{name}}{{/items}}', { items: [{name:'A'},{name:'B'}] }) // "AB"
 * render('{{! hidden }}visible', {}) // "visible"
 */
export function render(template: string, data: Record<string, unknown>, partials: Record<string, string> = {}): string {
  return compile(template)(data, partials)
}

/**
 * Pre-compiles a mustache template into a render function for repeated use.
 *
 * Compiling once and rendering many times provides better performance
 * than calling `render()` directly for each invocation.
 *
 * @param template - The mustache template string.
 * @returns A function that renders the compiled template with given data.
 * @example
 * const greet = compile('Hello {{name}}')
 * greet({ name: 'World' }) // "Hello World"
 * greet({ name: 'Alice' }) // "Hello Alice"
 */
export function compile(template: string): (data: Record<string, unknown>, partials?: Record<string, string>) => string {
  const tokens = tokenize(template)
  return (data: Record<string, unknown>, partials: Record<string, string> = {}): string => renderTokens(tokens, data, partials)
}
