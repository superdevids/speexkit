import { describe, it, expect } from 'vitest'
import { render, compile } from '../src/template/index.js'

describe('render', () => {
  it('replaces basic variables', () => {
    expect(render('Hello {{name}}', { name: 'World' })).toBe('Hello World')
    expect(render('{{greeting}}, {{name}}!', { greeting: 'Hi', name: 'Alice' })).toBe('Hi, Alice!')
  })

  it('escapes HTML in double-brace variables', () => {
    expect(render('{{val}}', { val: '<script>alert("xss")</script>' })).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(render('{{val}}', { val: "it's & done" })).toBe('it&#39;s &amp; done')
  })

  it('renders raw/unescaped with triple braces', () => {
    expect(render('{{{val}}}', { val: '<b>bold</b>' })).toBe('<b>bold</b>')
  })

  it('renders raw/unescaped with {{&var}}', () => {
    expect(render('{{& val}}', { val: '<i>italic</i>' })).toBe('<i>italic</i>')
  })

  it('resolves nested object paths', () => {
    expect(render('{{user.name}}', { user: { name: 'Alice' } })).toBe('Alice')
    expect(render('{{a.b.c}}', { a: { b: { c: 42 } } })).toBe('42')
  })

  it('iterates sections with arrays', () => {
    const result = render('{{#items}}{{name}}{{/items}}', { items: [{ name: 'A' }, { name: 'B' }] })
    expect(result).toBe('AB')
  })

  it('renders sections with array of primitives using dot', () => {
    const result = render('{{#items}}({{.}}){{/items}}', { items: [1, 2, 3] })
    expect(result).toBe('(1)(2)(3)')
  })

  it('renders sections with truthy non-array values', () => {
    expect(render('{{#show}}yes{{/show}}', { show: true })).toBe('yes')
    expect(render('{{#show}}yes{{/show}}', { show: 1 })).toBe('yes')
    expect(render('{{#name}}{{name}}{{/name}}', { name: 'Alice' })).toBe('Alice')
  })

  it('skips sections with falsy values', () => {
    expect(render('{{#show}}yes{{/show}}', { show: false })).toBe('')
    expect(render('{{#list}}yes{{/list}}', {})).toBe('')
    expect(render('{{#list}}yes{{/list}}', { list: null })).toBe('')
    expect(render('{{#list}}yes{{/list}}', { list: undefined })).toBe('')
    expect(render('{{#list}}yes{{/list}}', { list: 0 })).toBe('')
  })

  it('skips sections with empty arrays', () => {
    expect(render('{{#items}}x{{/items}}', { items: [] })).toBe('')
  })

  it('renders inverted sections with falsy values', () => {
    expect(render('{{^show}}hidden{{/show}}', { show: false })).toBe('hidden')
    expect(render('{{^list}}empty{{/list}}', {})).toBe('empty')
    expect(render('{{^list}}empty{{/list}}', { list: null })).toBe('empty')
    expect(render('{{^list}}empty{{/list}}', { list: undefined })).toBe('empty')
  })

  it('skips inverted sections with truthy values', () => {
    expect(render('{{^show}}hidden{{/show}}', { show: true })).toBe('')
    expect(render('{{^items}}empty{{/items}}', { items: [1, 2] })).toBe('')
  })

  it('renders inverted sections with empty arrays', () => {
    expect(render('{{^items}}empty{{/items}}', { items: [] })).toBe('empty')
  })

  it('strips comments from output', () => {
    expect(render('{{! comment }}visible', {})).toBe('visible')
    expect(render('before{{! comment }}after', {})).toBe('beforeafter')
    expect(render('{{! multi\nline }}ok', {})).toBe('ok')
  })

  it('renders nested sections', () => {
    const data = {
      users: [
        { name: 'Alice', items: [{ id: 1 }, { id: 2 }] },
        { name: 'Bob', items: [{ id: 3 }] },
      ],
    }
    const result = render('{{#users}}{{#items}}{{id}}{{/items}}{{/users}}', data)
    expect(result).toBe('123')
  })

  it('handles dotted paths in sections', () => {
    const data = {
      groups: [{ meta: { label: 'A' } }, { meta: { label: 'B' } }],
    }
    const result = render('{{#groups}}{{meta.label}}{{/groups}}', data)
    expect(result).toBe('AB')
  })

  it('returns empty string for missing variables (no throw)', () => {
    expect(render('{{missing}}', {})).toBe('')
    expect(render('{{a.b.c}}', { a: {} })).toBe('')
    expect(render('{{a.b.c}}', {})).toBe('')
  })

  it('handles empty template', () => {
    expect(render('', {})).toBe('')
    expect(render('', { name: 'Alice' })).toBe('')
  })

  it('handles template with no mustache tags', () => {
    expect(render('plain text', {})).toBe('plain text')
    expect(render('hello world', { name: 'Alice' })).toBe('hello world')
  })

  it('renders deep nesting correctly', () => {
    const data = {
      a: true,
      b: {
        items: [
          { c: true, val: 'x' },
          { c: false, val: 'y' },
        ],
      },
    }
    const result = render('{{#a}}{{#b.items}}{{#c}}{{val}}{{/c}}{{/b.items}}{{/a}}', data)
    expect(result).toBe('x')
  })

  it('renders partials from map', () => {
    const result = render('{{>greet}}', { name: 'World' }, { greet: 'Hello {{name}}' })
    expect(result).toBe('Hello World')
  })

  it('silently skips partials if not found', () => {
    expect(render('Hello {{>missing}}', {})).toBe('Hello ')
  })
})

describe('compile', () => {
  it('returns a reusable render function', () => {
    const greet = compile('Hello {{name}}')
    expect(greet({ name: 'World' })).toBe('Hello World')
    expect(greet({ name: 'Alice' })).toBe('Hello Alice')
    expect(greet({ name: 'Bob' })).toBe('Hello Bob')
  })

  it('pre-compiles for better repeated-use performance', () => {
    const template = '{{#items}}<li>{{name}}</li>{{/items}}'
    const compiled = compile(template)
    const data = { items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }

    const start1 = performance.now()
    for (let i = 0; i < 1000; i++) {
      compiled(data)
    }
    const compiledTime = performance.now() - start1

    const start2 = performance.now()
    for (let i = 0; i < 1000; i++) {
      render(template, data)
    }
    const directTime = performance.now() - start2

    expect(compiled(data)).toBe('<li>A</li><li>B</li><li>C</li>')
    expect(typeof compiled).toBe('function')
    expect(compiledTime).toBeLessThanOrEqual(directTime * 2 || 1)
  })
})
