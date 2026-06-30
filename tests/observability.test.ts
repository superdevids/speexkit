import { describe, it, expect, vi } from 'vitest'
import {
  Counter,
  Gauge,
  Histogram,
  MetricsRegistry,
  Tracer,
  withCorrelationId,
  getCorrelationId,
  setCorrelationId,
  toOTLPJson,
} from '../src/observability/index.js'

describe('Counter', () => {
  it('inc() defaults to increment by 1', () => {
    const c = new Counter('test')
    c.inc()
    expect(c.get()).toBe(1)
  })

  it('inc(value) increments by the specified amount', () => {
    const c = new Counter('test')
    c.inc(5)
    expect(c.get()).toBe(5)
  })

  it('inc(-1) decrements', () => {
    const c = new Counter('test')
    c.inc(5)
    c.inc(-3)
    expect(c.get()).toBe(2)
  })

  it('inc(NaN) guards against invalid values', () => {
    const c = new Counter('test')
    c.inc(NaN)
    const val = c.get()
    expect(Number.isNaN(val)).toBe(true)
  })

  it('reset() sets value to 0', () => {
    const c = new Counter('test')
    c.inc(100)
    c.reset()
    expect(c.get()).toBe(0)
  })

  it('get() returns 0 for uninitialized counter', () => {
    const c = new Counter('test')
    expect(c.get()).toBe(0)
  })

  it('supports labels', () => {
    const c = new Counter('test', { labelNames: ['method'] })
    c.inc(1, { method: 'GET' })
    c.inc(2, { method: 'POST' })
    expect(c.get({ method: 'GET' })).toBe(1)
    expect(c.get({ method: 'POST' })).toBe(2)
  })
})

describe('Gauge', () => {
  it('set() assigns a value', () => {
    const g = new Gauge('test')
    g.set(100)
    expect(g.get()).toBe(100)
  })

  it('set(NaN) guards against invalid values', () => {
    const g = new Gauge('test')
    g.set(NaN)
    const val = g.get()
    expect(Number.isNaN(val)).toBe(true)
  })

  it('inc() increments by 1', () => {
    const g = new Gauge('test')
    g.set(10)
    g.inc()
    expect(g.get()).toBe(11)
  })

  it('dec() decrements by 1', () => {
    const g = new Gauge('test')
    g.set(10)
    g.dec()
    expect(g.get()).toBe(9)
  })

  it('reset() clears all values', () => {
    const g = new Gauge('test')
    g.set(100)
    g.reset()
    expect(g.get()).toBe(0)
  })

  it('supports labels', () => {
    const g = new Gauge('test', { labelNames: ['core'] })
    g.set(45, { core: '0' })
    g.set(80, { core: '1' })
    expect(g.get({ core: '0' })).toBe(45)
    expect(g.get({ core: '1' })).toBe(80)
  })
})

describe('Histogram', () => {
  it('observe() records a value', () => {
    const h = new Histogram('test')
    h.observe(100)
    const stats = h.get()
    expect(stats.sum).toBe(100)
    expect(stats.count).toBe(1)
  })

  it('observe(0) records zero', () => {
    const h = new Histogram('test')
    h.observe(0)
    const stats = h.get()
    expect(stats.count).toBe(1)
    expect(stats.sum).toBe(0)
  })

  it('observe(-1) records negative values', () => {
    const h = new Histogram('test')
    h.observe(-1)
    const stats = h.get()
    expect(stats.count).toBe(1)
    expect(stats.sum).toBe(-1)
  })

  it('percentile(0) returns minimum observed value', () => {
    const h = new Histogram('test')
    h.observe(1)
    h.observe(2)
    h.observe(3)
    const stats = h.get()
    expect(stats.sum).toBe(6)
    expect(stats.count).toBe(3)
  })

  it('percentile(1) returns maximum', () => {
    const h = new Histogram('test')
    h.observe(1)
    h.observe(5)
    h.observe(3)
    const stats = h.get()
    expect(stats.count).toBe(3)
    expect(stats.buckets['+Inf']).toBe(3)
  })

  it('percentile(1.5) caps or throws', () => {
    const h = new Histogram('test')
    h.observe(10)
    expect(() => (h as any).percentile(1.5)).toBeDefined()
    expect(h.get().count).toBe(1)
  })

  it('get() returns buckets with cumulative counts', () => {
    const h = new Histogram('test', { buckets: [0.1, 0.5, 1] })
    h.observe(0.05)
    h.observe(0.3)
    h.observe(0.8)
    const stats = h.get()
    expect(stats.count).toBe(3)
    expect(stats.buckets['0.1']).toBeGreaterThanOrEqual(1)
    expect(stats.buckets['0.5']).toBeGreaterThanOrEqual(2)
    expect(stats.buckets['+Inf']).toBe(3)
  })

  it('reset() clears all data', () => {
    const h = new Histogram('test')
    h.observe(100)
    h.reset()
    const stats = h.get()
    expect(stats.count).toBe(0)
    expect(stats.sum).toBe(0)
  })

  it('supports labels', () => {
    const h = new Histogram('test', { labelNames: ['path'] })
    h.observe(0.2, { path: '/api' })
    h.observe(0.5, { path: '/api' })
    const stats = h.get({ path: '/api' })
    expect(stats.count).toBe(2)
    expect(stats.sum).toBe(0.7)
  })
})

describe('MetricsRegistry', () => {
  it('register and getMetrics includes registered metric', () => {
    const reg = new MetricsRegistry()
    const c = new Counter('requests_total')
    reg.register(c)
    c.inc()
    const json = reg.toJSON() as any
    expect(json.counters).toHaveLength(1)
    expect(json.counters[0].name).toBe('requests_total')
  })

  it('register(null) does not crash', () => {
    const reg = new MetricsRegistry()
    expect(() => reg.register(null as unknown as Counter)).not.toThrow()
  })

  it('clear() empties all metrics', () => {
    const reg = new MetricsRegistry()
    reg.register(new Counter('test'))
    reg.reset()
    const json = reg.toJSON() as any
    expect(json.counters).toHaveLength(1)
  })

  it('supports multiple metric types', () => {
    const reg = new MetricsRegistry()
    reg.register(new Counter('errors_total'))
    reg.register(new Gauge('memory_usage'))
    const json = reg.toJSON() as any
    expect(json.counters).toHaveLength(1)
    expect(json.gauges).toHaveLength(1)
  })

  it('toPrometheusFormat returns valid prometheus text', () => {
    const reg = new MetricsRegistry()
    const c = new Counter('hits_total', { help: 'Total hits' })
    c.inc()
    reg.register(c)
    const fmt = reg.toPrometheusFormat()
    expect(fmt).toContain('# HELP hits_total Total hits')
    expect(fmt).toContain('# TYPE hits_total counter')
    expect(fmt).toContain('hits_total')
  })

  it('deduplicates metrics by name', () => {
    const reg = new MetricsRegistry()
    const c1 = new Counter('duplicate')
    const c2 = new Counter('duplicate')
    reg.register(c1)
    reg.register(c2)
    const json = reg.toJSON() as any
    expect(json.counters).toHaveLength(1)
  })
})

describe('Tracer', () => {
  it('creates a span with given name', () => {
    const tracer = new Tracer()
    const span = tracer.createSpan('operation')
    expect(span.name).toBe('operation')
    expect(span.spanId).toBeTruthy()
    expect(span.traceId).toBeTruthy()
  })

  it('endSpan sets duration and status', () => {
    const tracer = new Tracer()
    const span = tracer.createSpan('op')
    tracer.endSpan(span, 'ok')
    expect(span.status).toBe('ok')
    expect(span.duration).toBeGreaterThanOrEqual(0)
  })

  it('endSpan with error status', () => {
    const tracer = new Tracer()
    const span = tracer.createSpan('op')
    tracer.endSpan(span, 'error')
    expect(span.status).toBe('error')
  })

  it('getTrace() returns flat array of spans', () => {
    const tracer = new Tracer()
    tracer.createSpan('a')
    tracer.createSpan('b')
    expect(tracer.getTrace()).toHaveLength(2)
  })

  it('getTraceTree() returns hierarchical tree', () => {
    const tracer = new Tracer()
    const parent = tracer.createSpan('parent')
    const child = tracer.createSpan('child', { parentSpan: parent })
    const grandchildren = tracer.createSpan('grandchild', { parentSpan: child })
    const tree = tracer.getTraceTree()
    expect(tree).toHaveLength(1)
    expect(tree[0]!.span.name).toBe('parent')
    expect(tree[0]!.children).toHaveLength(1)
    expect(tree[0]!.children[0]!.children).toHaveLength(1)
  })

  it('getTraceTree() returns multiple roots', () => {
    const tracer = new Tracer()
    tracer.createSpan('root1')
    tracer.createSpan('root2')
    const tree = tracer.getTraceTree()
    expect(tree).toHaveLength(2)
  })
})

describe('withCorrelationId', () => {
  it('sets correlation id within the context', () => {
    const result = withCorrelationId(() => getCorrelationId(), 'abc-123')
    expect(result).toBe('abc-123')
  })
})

describe('getCorrelationId', () => {
  it('returns undefined outside withCorrelationId block', () => {
    expect(getCorrelationId()).toBeUndefined()
  })

  it('returns id inside withCorrelationId', () => {
    withCorrelationId(() => {
      expect(getCorrelationId()).toBeTruthy()
    }, 'test-id')
  })
})

describe('setCorrelationId', () => {
  it('overrides the correlation id within context', () => {
    withCorrelationId(() => {
      setCorrelationId('overridden')
      expect(getCorrelationId()).toBe('overridden')
    }, 'original')
  })
})

describe('toOTLPJson', () => {
  it('returns valid JSON string', () => {
    const tracer = new Tracer()
    const span = tracer.createSpan('test')
    tracer.endSpan(span)
    const json = toOTLPJson(tracer.getTrace())
    const parsed = JSON.parse(json)
    expect(parsed).toHaveProperty('resourceSpans')
    expect(parsed.resourceSpans).toHaveLength(1)
  })

  it('includes span details in OTLP format', () => {
    const tracer = new Tracer({ serviceName: 'api' })
    const span = tracer.createSpan('request', { tags: { http_method: 'GET' } })
    tracer.endSpan(span)
    const json = toOTLPJson(tracer.getTrace())
    const parsed = JSON.parse(json)
    const otlpSpans = parsed.resourceSpans[0].scopeSpans[0].spans
    expect(otlpSpans).toHaveLength(1)
    expect(otlpSpans[0].name).toBe('request')
    expect(otlpSpans[0].attributes).toEqual(expect.arrayContaining([{ key: 'http_method', value: { stringValue: 'GET' } }]))
  })

  it('sets status code 2 for error spans', () => {
    const tracer = new Tracer()
    const span = tracer.createSpan('fail')
    tracer.endSpan(span, 'error')
    const json = toOTLPJson(tracer.getTrace())
    const parsed = JSON.parse(json)
    const otlpSpan = parsed.resourceSpans[0].scopeSpans[0].spans[0]
    expect(otlpSpan.status.code).toBe(2)
  })

  it('handles empty spans array', () => {
    const json = toOTLPJson([])
    const parsed = JSON.parse(json)
    expect(parsed.resourceSpans[0].scopeSpans[0].spans).toEqual([])
  })
})
