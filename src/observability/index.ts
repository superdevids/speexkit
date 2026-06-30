import { AsyncLocalStorage } from 'node:async_hooks'
import { randomBytes, randomUUID } from 'node:crypto'

/**
 * Deterministic label hash for multi-label support.
 * Sorts keys alphabetically for reproducibility.
 */
function hashLabels(labels?: Record<string, string>): string {
  if (!labels) return ''
  const keys = Object.keys(labels)
  if (keys.length === 0) return ''
  return keys
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}=${labels[k]}`)
    .join(',')
}

/**
 * Serialises tag pairs for OTLP attribute output.
 */
function toKeyValue(key: string, value: string): { key: string; value: { stringValue: string } } {
  return { key, value: { stringValue: value } }
}

/**
 * Convert ms to nanoseconds for OTLP.
 */
function msToNano(ms: number): string {
  return String(Math.floor(ms) * 1_000_000)
}

/**
 * Generate a random hex span / trace identifier.
 */
function generateId(bytes = 8): string {
  return randomBytes(bytes).toString('hex')
}

// ─── Correlation ID (AsyncLocalStorage) ─────────────────────────────

const _correlationStorage = new AsyncLocalStorage<string>()

/**
 * Execute `fn` within an async context that carries a correlation ID.
 * If `correlationId` is omitted a UUID is generated automatically.
 *
 * @example
 * withCorrelationId(() => {
 *   const cid = getCorrelationId() // "550e8400-..."
 *   doWork()
 * })
 */
export function withCorrelationId<T>(fn: () => T, correlationId?: string): T {
  const id = correlationId ?? randomUUID()
  return _correlationStorage.run(id, fn)
}

/**
 * Return the correlation ID for the current async context, or `undefined`
 * if no context has been established via {@link withCorrelationId}.
 */
export function getCorrelationId(): string | undefined {
  return _correlationStorage.getStore()
}

/**
 * Override the correlation ID within the current async context.
 * Has no effect if called outside a {@link withCorrelationId} block.
 */
export function setCorrelationId(id: string): void {
  if (_correlationStorage.getStore() !== undefined) {
    _correlationStorage.enterWith(id)
  }
}

// ─── Metrics ────────────────────────────────────────────────────────

/**
 * Monotonically increasing counter.
 *
 * @example
 * const reqTotal = new Counter('http_requests_total', { help: 'Total HTTP requests', labelNames: ['method'] })
 * reqTotal.inc(1, { method: 'GET' })
 * console.log(reqTotal.get({ method: 'GET' })) // 1
 */
export class Counter {
  readonly name: string
  private readonly _help: string
  private readonly _labelNames: string[]
  private readonly _data: Map<string, number> = new Map()

  constructor(name: string, opts?: { help?: string; labelNames?: string[] }) {
    this.name = name
    this._help = opts?.help ?? ''
    this._labelNames = opts?.labelNames ?? []
  }

  /**
   * Increment the counter. Defaults to 1 when `value` is omitted.
   * @param value - Amount to add (must be >= 0)
   * @param labels - Optional label values
   */
  inc(value?: number, labels?: Record<string, string>): void {
    const key = hashLabels(labels)
    const current = this._data.get(key) ?? 0
    this._data.set(key, current + (value ?? 1))
  }

  /**
   * Return the current counter value for the given label set.
   * Returns 0 when no data exists for the label set.
   */
  get(labels?: Record<string, string>): number {
    return this._data.get(hashLabels(labels)) ?? 0
  }

  /** Reset all counter values. */
  reset(): void {
    this._data.clear()
  }

  /** @internal Exposed for registry serialisation. */
  _entries(): Map<string, number> {
    return this._data
  }

  /** @internal */
  _helpText(): string {
    return this._help
  }

  /** @internal */
  _labelKeys(): string[] {
    return this._labelNames
  }
}

/**
 * A gauge is a metric that represents a single numeric value that can
 * go up or down.
 *
 * @example
 * const cpu = new Gauge('cpu_usage_percent', { help: 'CPU usage', labelNames: ['core'] })
 * cpu.set(45.2, { core: '0' })
 * cpu.inc(5, { core: '0' })
 * cpu.dec(3, { core: '1' })
 */
export class Gauge {
  readonly name: string
  private readonly _help: string
  private readonly _labelNames: string[]
  private readonly _data: Map<string, number> = new Map()

  constructor(name: string, opts?: { help?: string; labelNames?: string[] }) {
    this.name = name
    this._help = opts?.help ?? ''
    this._labelNames = opts?.labelNames ?? []
  }

  /** Set the gauge to a specific value. */
  set(value: number, labels?: Record<string, string>): void {
    this._data.set(hashLabels(labels), value)
  }

  /**
   * Increment the gauge. Defaults to 1 when `value` is omitted.
   * @param value - Amount to add (may be negative to decrement)
   */
  inc(value?: number, labels?: Record<string, string>): void {
    const key = hashLabels(labels)
    const current = this._data.get(key) ?? 0
    this._data.set(key, current + (value ?? 1))
  }

  /**
   * Decrement the gauge. Defaults to 1 when `value` is omitted.
   * @param value - Amount to subtract
   */
  dec(value?: number, labels?: Record<string, string>): void {
    const key = hashLabels(labels)
    const current = this._data.get(key) ?? 0
    this._data.set(key, current - (value ?? 1))
  }

  /**
   * Return the current gauge value for the given label set.
   * Returns 0 when no data exists for the label set.
   */
  get(labels?: Record<string, string>): number {
    return this._data.get(hashLabels(labels)) ?? 0
  }

  /** Reset all gauge values. */
  reset(): void {
    this._data.clear()
  }

  /** @internal */
  _entries(): Map<string, number> {
    return this._data
  }

  /** @internal */
  _helpText(): string {
    return this._help
  }

  /** @internal */
  _labelKeys(): string[] {
    return this._labelNames
  }
}

/**
 * Internal shape for histogram storage (per label set).
 */
interface HistogramEntry {
  sum: number
  count: number
  /** Per-bucket non-cumulative counts. One slot per bucket + trailing +Inf slot. */
  perBucket: number[]
}

/**
 * Histogram tracks value distribution across configurable buckets.
 *
 * Default buckets (seconds-oriented): [0.005, 0.01, 0.025, 0.05, 0.1,
 * 0.25, 0.5, 1, 2.5, 5, 10]
 *
 * @example
 * const lat = new Histogram('request_duration_seconds', { help: 'Request latency' })
 * lat.observe(0.042)
 * const stats = lat.get()
 * // { sum: 0.042, count: 1, buckets: { '0.005': 0, '0.01': 0, ..., '0.05': 1, ..., '+Inf': 1 } }
 */
export class Histogram {
  readonly name: string
  private readonly _help: string
  private readonly _labelNames: string[]
  private readonly _bucketBounds: number[]
  private readonly _data: Map<string, HistogramEntry> = new Map()

  constructor(name: string, opts?: { help?: string; labelNames?: string[]; buckets?: number[] }) {
    this.name = name
    this._help = opts?.help ?? ''
    this._labelNames = opts?.labelNames ?? []
    this._bucketBounds = opts?.buckets ?? [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  }

  /**
   * Record a value in the histogram. The value is placed in the smallest
   * bucket whose upper bound is >= the value.
   */
  observe(value: number, labels?: Record<string, string>): void {
    const key = hashLabels(labels)
    let entry = this._data.get(key)
    if (!entry) {
      entry = { sum: 0, count: 0, perBucket: new Array(this._bucketBounds.length + 1).fill(0) }
      this._data.set(key, entry)
    }
    entry.sum += value
    entry.count++

    let bucketIndex = this._bucketBounds.length // default: +Inf
    for (let i = 0; i < this._bucketBounds.length; i++) {
      const bound = this._bucketBounds[i]!
      if (value <= bound) {
        bucketIndex = i
        break
      }
    }
    entry.perBucket[bucketIndex]!++
  }

  /**
   * Return aggregated stats for the given label set:
   * - `sum` — sum of all observed values
   * - `count` — number of observations
   * - `buckets` — cumulative bucket counts (keyed by upper bound, e.g. "0.05", "+Inf")
   *
   * Returns zeroed stats when no data exists for the label set.
   */
  get(labels?: Record<string, string>): { sum: number; count: number; buckets: Record<string, number> } {
    const key = hashLabels(labels)
    const entry = this._data.get(key)
    if (!entry) {
      return { sum: 0, count: 0, buckets: {} }
    }
    const buckets: Record<string, number> = {}
    let cumulative = 0
    for (let i = 0; i < this._bucketBounds.length; i++) {
      cumulative += entry.perBucket[i]!
      buckets[String(this._bucketBounds[i]!)] = cumulative
    }
    cumulative += entry.perBucket[this._bucketBounds.length]!
    buckets['+Inf'] = cumulative
    return { sum: entry.sum, count: entry.count, buckets }
  }

  /** Reset all histogram data. */
  reset(): void {
    this._data.clear()
  }

  /** @internal */
  _entries(): Map<string, HistogramEntry> {
    return this._data
  }

  /** @internal */
  _helpText(): string {
    return this._help
  }

  /** @internal */
  _labelKeys(): string[] {
    return this._labelNames
  }

  /** @internal */
  _bucketBoundsArray(): number[] {
    return this._bucketBounds
  }
}

// ─── MetricsRegistry ────────────────────────────────────────────────

/**
 * A registry that holds all metrics and can serialise them to
 * Prometheus exposition format or plain JSON.
 *
 * @example
 * const registry = new MetricsRegistry()
 * const c = new Counter('errors_total')
 * registry.register(c)
 * c.inc()
 * console.log(registry.toPrometheusFormat())
 */
export class MetricsRegistry {
  private readonly _counters: Counter[] = []
  private readonly _gauges: Gauge[] = []
  private readonly _histograms: Histogram[] = []

  /**
   * Register a metric with the registry. Metrics are deduplicated by
   * name — registering a metric with the same name as an earlier metric
   * silently replaces the earlier one.
   */
  register(metric: Counter | Gauge | Histogram): void {
    if (metric instanceof Counter) {
      const idx = this._counters.findIndex((c) => c.name === metric.name)
      if (idx >= 0) {
        this._counters[idx] = metric
      } else {
        this._counters.push(metric)
      }
    } else if (metric instanceof Gauge) {
      const idx = this._gauges.findIndex((g) => g.name === metric.name)
      if (idx >= 0) {
        this._gauges[idx] = metric
      } else {
        this._gauges.push(metric)
      }
    } else if (metric instanceof Histogram) {
      const idx = this._histograms.findIndex((h) => h.name === metric.name)
      if (idx >= 0) {
        this._histograms[idx] = metric
      } else {
        this._histograms.push(metric)
      }
    }
  }

  /**
   * Return all metrics in Prometheus text exposition format.
   * See https://prometheus.io/docs/instrumenting/exposition_formats/
   */
  toPrometheusFormat(): string {
    const lines: string[] = []

    for (const c of this._counters) {
      const help = c._helpText()
      if (help) lines.push(`# HELP ${c.name} ${help}`)
      lines.push(`# TYPE ${c.name} counter`)
      for (const [labelKey, value] of c._entries()) {
        lines.push(`${c.name}${formatLabels(labelKey, c._labelKeys())} ${value}`)
      }
    }

    for (const g of this._gauges) {
      const help = g._helpText()
      if (help) lines.push(`# HELP ${g.name} ${help}`)
      lines.push(`# TYPE ${g.name} gauge`)
      for (const [labelKey, value] of g._entries()) {
        lines.push(`${g.name}${formatLabels(labelKey, g._labelKeys())} ${value}`)
      }
    }

    for (const h of this._histograms) {
      const help = h._helpText()
      if (help) lines.push(`# HELP ${h.name} ${help}`)
      lines.push(`# TYPE ${h.name} histogram`)
      for (const [labelKey, entry] of h._entries()) {
        const labels = formatLabels(labelKey, h._labelKeys())
        const bounds = h._bucketBoundsArray()
        let cumulative = 0
        for (let i = 0; i < bounds.length; i++) {
          cumulative += entry.perBucket[i]!
          lines.push(`${h.name}_bucket${labels}${labels ? ',' : '{'}le="${String(bounds[i]!)}}"}} ${cumulative}`)
        }
        cumulative += entry.perBucket[bounds.length]!
        lines.push(`${h.name}_bucket${labels}${labels ? ',' : '{'}le="+Inf"}} ${cumulative}`)
        lines.push(`${h.name}_sum${labels} ${entry.sum}`)
        lines.push(`${h.name}_count${labels} ${entry.count}`)
      }
    }

    return lines.join('\n') + (lines.length > 0 ? '\n' : '')
  }

  /**
   * Return all metrics as a structured JSON object.
   */
  toJSON(): Record<string, unknown> {
    const counters: unknown[] = []
    for (const c of this._counters) {
      const values: { labels: Record<string, string>; value: number }[] = []
      for (const [labelKey, value] of c._entries()) {
        values.push({ labels: parseLabelKey(labelKey, c._labelKeys()), value })
      }
      counters.push({ name: c.name, help: c._helpText(), values })
    }

    const gauges: unknown[] = []
    for (const g of this._gauges) {
      const values: { labels: Record<string, string>; value: number }[] = []
      for (const [labelKey, value] of g._entries()) {
        values.push({ labels: parseLabelKey(labelKey, g._labelKeys()), value })
      }
      gauges.push({ name: g.name, help: g._helpText(), values })
    }

    const histograms: unknown[] = []
    for (const h of this._histograms) {
      const values: { labels: Record<string, string>; buckets: Record<string, number>; sum: number; count: number }[] = []
      for (const [labelKey, entry] of h._entries()) {
        const labels = parseLabelKey(labelKey, h._labelKeys())
        const buckets: Record<string, number> = {}
        let cumulative = 0
        const bounds = h._bucketBoundsArray()
        for (let i = 0; i < bounds.length; i++) {
          cumulative += entry.perBucket[i]!
          buckets[String(bounds[i]!)] = cumulative
        }
        cumulative += entry.perBucket[bounds.length]!
        buckets['+Inf'] = cumulative
        values.push({ labels, sum: entry.sum, count: entry.count, buckets })
      }
      histograms.push({ name: h.name, help: h._helpText(), buckets: h._bucketBoundsArray(), values })
    }

    return { counters, gauges, histograms }
  }

  /** Reset every registered metric. */
  reset(): void {
    for (const c of this._counters) c.reset()
    for (const g of this._gauges) g.reset()
    for (const h of this._histograms) h.reset()
  }
}

/**
 * Format a label-hash string into Prometheus `{key="val",...}` notation.
 * `labelKey` is the pre-computed "key1=val1,key2=val2" string, or empty.
 */
function formatLabels(labelKey: string, labelNames: string[]): string {
  if (!labelKey || labelNames.length === 0) return ''
  const parts = labelKey.split(',')
  const pairs = parts.map((p) => {
    const eqIdx = p.indexOf('=')
    if (eqIdx < 0) return ''
    const k = p.slice(0, eqIdx)
    const v = p.slice(eqIdx + 1)
    return `${k}="${escapePromLabel(v)}"`
  })
  return `{${pairs.join(',')}}`
}

/**
 * Parse a label-key string back into a record, given the known label names.
 */
function parseLabelKey(labelKey: string, labelNames: string[]): Record<string, string> {
  if (!labelKey || labelNames.length === 0) return {}
  const parts = labelKey.split(',')
  const out: Record<string, string> = {}
  for (const p of parts) {
    const eqIdx = p.indexOf('=')
    if (eqIdx >= 0) {
      out[p.slice(0, eqIdx)] = p.slice(eqIdx + 1)
    }
  }
  return out
}

/**
 * Escape a Prometheus label value per the exposition format spec
 * (backslash-escape `\`, `"`, `\n`).
 */
function escapePromLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

// ─── Tracing ────────────────────────────────────────────────────────

/**
 * A single span within a trace.
 */
export interface Span {
  /** Unique span identifier (16 hex chars). */
  spanId: string
  /** Span display name. */
  name: string
  /** Trace identifier this span belongs to. */
  traceId: string
  /** Optional parent span ID for building trace trees. */
  parentId?: string
  /** Start time in epoch milliseconds. */
  startTime: number
  /** End time in epoch milliseconds (set when the span is ended). */
  endTime?: number
  /** Duration in milliseconds (computed on end). */
  duration?: number
  /** Span status. */
  status: 'ok' | 'error'
  /** Arbitrary key-value tags. */
  tags: Record<string, string>
}

/**
 * A node in the hierarchical trace tree.
 */
export interface SpanTreeNode {
  /** The span at this node. */
  span: Span
  /** Child spans. */
  children: SpanTreeNode[]
}

/**
 * Lightweight tracer for creating and managing spans within a trace.
 *
 * @example
 * const tracer = new Tracer({ serviceName: 'api' })
 * const parent = tracer.createSpan('request')
 * const child = tracer.createSpan('db.query', { parentSpan: parent })
 * tracer.endSpan(child)
 * tracer.endSpan(parent)
 * console.log(tracer.getTraceTree())
 */
export class Tracer {
  private readonly _traceId: string
  private readonly _spans: Span[] = []

  constructor(opts?: { serviceName?: string; traceId?: string }) {
    this._traceId = opts?.traceId ?? generateId(16)
  }

  /**
   * Create and record a new span.
   * @param name - Span name
   * @param opts.parentSpan - Optional parent span to establish hierarchy
   * @param opts.tags - Initial tags
   */
  createSpan(name: string, opts?: { parentSpan?: Span; tags?: Record<string, string> }): Span {
    const span: Span = {
      spanId: generateId(8),
      name,
      traceId: this._traceId,
      parentId: opts?.parentSpan?.spanId,
      startTime: Date.now(),
      status: 'ok',
      tags: { ...opts?.tags },
    }
    this._spans.push(span)
    return span
  }

  /**
   * End a span by setting its end time, duration and status.
   */
  endSpan(span: Span, status: 'ok' | 'error' = 'ok'): void {
    span.endTime = Date.now()
    span.duration = span.endTime - span.startTime
    span.status = status
  }

  /**
   * Return all recorded spans as a flat array.
   */
  getTrace(): Span[] {
    return [...this._spans]
  }

  /**
   * Return the trace as a hierarchical tree.
   * Root nodes are spans without a parentId.
   */
  getTraceTree(): SpanTreeNode[] {
    const childrenMap = new Map<string, Span[]>()
    const roots: Span[] = []

    for (const span of this._spans) {
      if (span.parentId) {
        const siblings = childrenMap.get(span.parentId) ?? []
        siblings.push(span)
        childrenMap.set(span.parentId, siblings)
      } else {
        roots.push(span)
      }
    }

    function buildTree(span: Span): SpanTreeNode {
      const children = (childrenMap.get(span.spanId) ?? []).map(buildTree)
      return { span, children }
    }

    return roots.map(buildTree)
  }
}

// ─── OTLP Export ────────────────────────────────────────────────────

/**
 * Convert a flat array of spans into a simplified OTLP JSON payload.
 *
 * The output follows the OpenTelemetry Protocol (OTLP) JSON specification:
 * - `traceId` and `spanId` are hex-encoded strings
 * - `startTimeUnixNano` / `endTimeUnixNano` are epoch nanoseconds as strings
 * - `status.code`: 1 = Ok, 2 = Error
 *
 * @example
 * const spans = tracer.getTrace()
 * const otlp = toOTLPJson(spans)
 * // POST the payload to an OTLP-compatible endpoint (e.g. collector:4318)
 */
export function toOTLPJson(spans: Span[]): string {
  const otlpSpans = spans.map((s) => ({
    traceId: s.traceId,
    spanId: s.spanId,
    parentSpanId: s.parentId,
    name: s.name,
    kind: 1, // INTERNAL
    startTimeUnixNano: msToNano(s.startTime),
    endTimeUnixNano: s.endTime ? msToNano(s.endTime) : '0',
    attributes: Object.entries(s.tags).map(([k, v]) => toKeyValue(k, v)),
    status: {
      code: s.status === 'error' ? 2 : 1,
    },
  }))

  const body = {
    resourceSpans: [
      {
        resource: {
          attributes: [toKeyValue('service.name', 'unknown')],
        },
        scopeSpans: [
          {
            scope: {
              name: 'speexkit',
              version: '1.0.0',
            },
            spans: otlpSpans,
          },
        ],
      },
    ],
  }

  return JSON.stringify(body, null, 2)
}
