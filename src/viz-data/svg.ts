/**
 * SVG chart generators — pure SVG string output, zero DOM dependencies.
 *
 * @module viz-data/svg
 */

/** Options shared across all chart types */
export interface SvgChartOptions {
  width?: number
  height?: number
  title?: string
  showLegend?: boolean
  showGrid?: boolean
  responsive?: boolean
  backgroundColor?: string
  padding?: number
  colors?: string[]
  fontFamily?: string
  fontSize?: number
  borderRadius?: number
}

/** Input data for {@link svgBarChart} */
export interface BarChartData {
  labels: string[]
  values: number[]
  colors?: string[]
}

/** Input data for {@link svgLineChart} */
export interface LineChartData {
  labels: string[]
  datasets: { label: string; values: number[]; color?: string }[]
}

/** Input data for {@link svgScatterChart} */
export interface ScatterChartData {
  points: { x: number; y: number; label?: string }[]
  xLabel?: string
  yLabel?: string
}

/** Input data for {@link svgPieChart} */
export interface PieChartData {
  labels: string[]
  values: number[]
  colors?: string[]
}

// ── Internal helpers ───────────────────────────────────────────────

const DEFAULT_COLORS: string[] = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
  '#9c755f',
  '#bab0ac',
  '#6b6ecf',
  '#d4a6c8',
]

const DEFAULTS: Required<SvgChartOptions> = {
  width: 600,
  height: 400,
  title: '',
  showLegend: true,
  showGrid: true,
  responsive: true,
  backgroundColor: 'transparent',
  padding: 40,
  colors: DEFAULT_COLORS,
  fontFamily: 'Arial, sans-serif',
  fontSize: 12,
  borderRadius: 2,
}

function fmt(v: number, decimals = 4): string {
  if (!Number.isFinite(v) || Object.is(v, -0)) return '0'
  return parseFloat(v.toFixed(decimals)).toString()
}

function axisFmt(v: number): string {
  if (!Number.isFinite(v) || Object.is(v, -0)) return '0'
  const abs = Math.abs(v)
  let d: number
  if (abs >= 10) d = 0
  else if (abs >= 1) d = 1
  else d = 2
  return parseFloat(v.toFixed(d)).toString()
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function niceInterval(range: number, targetTicks: number): number {
  if (range <= 0) return 1
  const rough = range / targetTicks
  const mag = 10 ** Math.floor(Math.log10(rough))
  const norm = rough / mag
  if (norm <= 1.5) return mag
  if (norm <= 3.5) return 2 * mag
  if (norm <= 7.5) return 5 * mag
  return 10 * mag
}

function niceScale(min: number, max: number, targetTicks = 5): { ticks: number[]; domainMin: number; domainMax: number } {
  if (min === max) {
    if (min === 0) {
      min = -1
      max = 1
    } else {
      const d = Math.abs(min) * 0.1
      min -= d
      max += d
    }
  }
  const range = max - min
  const interval = niceInterval(range, targetTicks)
  const domainMin = Math.floor(min / interval) * interval
  const domainMax = Math.ceil(max / interval) * interval
  const ticks: number[] = []
  for (let v = domainMin; v <= domainMax + interval * 1e-10; v += interval) {
    ticks.push(v)
  }
  return { ticks, domainMin, domainMax }
}

function mergeOptions(opts?: SvgChartOptions): Required<SvgChartOptions> {
  return { ...DEFAULTS, ...opts, colors: opts?.colors ?? DEFAULT_COLORS }
}

// ── SVG building blocks ────────────────────────────────────────────

function buildSvgStyle(opts: Required<SvgChartOptions>): string {
  return `<style>
    .sk-txt { font-family: ${opts.fontFamily}; font-size: ${opts.fontSize}px; fill: #333; }
    .sk-title { font-family: ${opts.fontFamily}; font-size: ${opts.fontSize + 4}px; font-weight: bold; fill: #222; text-anchor: middle; }
    .sk-grid { stroke: #e8e8e8; stroke-width: 1; }
    .sk-axis { stroke: #333; stroke-width: 1.5; }
    .sk-tick { stroke: #333; stroke-width: 1; }
  </style>`
}

function wrapSvg(body: string, opts: Required<SvgChartOptions>): string {
  const parts: string[] = ['<?xml version="1.0" encoding="UTF-8"?>']
  if (opts.responsive) {
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${opts.width} ${opts.height}" width="100%" height="100%">`)
  } else {
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}">`)
  }
  parts.push(buildSvgStyle(opts))
  if (opts.backgroundColor !== 'transparent') {
    parts.push(`  <rect width="${opts.width}" height="${opts.height}" fill="${opts.backgroundColor}" />`)
  }
  if (body) parts.push(body)
  parts.push('</svg>')
  return parts.join('\n')
}

function renderTitle(opts: Required<SvgChartOptions>): string {
  if (!opts.title) return ''
  return `  <text x="${opts.width / 2}" y="${opts.padding - 5}" class="sk-title">${esc(opts.title)}</text>`
}

function layoutCartesian(opts: Required<SvgChartOptions>) {
  const p = opts.padding
  const titleH = opts.title ? 28 : 0
  const legendH = opts.showLegend ? 24 : 0
  const axisW = 45
  const axisH = 26

  const left = p + axisW
  const top = p + titleH
  const bottom = opts.height - p - legendH - axisH
  const right = opts.width - p
  const chartW = right - left
  const chartH = bottom - top

  return { left, top, right, bottom, chartW, chartH, axisH, legendH }
}

function renderYAxis(
  scale: ReturnType<typeof niceScale>,
  yPx: (v: number) => number,
  lo: ReturnType<typeof layoutCartesian>,
  opts: Required<SvgChartOptions>,
): string {
  const { left, top, right, bottom } = lo
  const lines: string[] = []

  for (const tick of scale.ticks) {
    const yPos = yPx(tick)
    if (yPos < top - 5 || yPos > bottom + 5) continue
    if (opts.showGrid) {
      lines.push(`    <line x1="${fmt(left)}" y1="${fmt(yPos)}" x2="${fmt(right)}" y2="${fmt(yPos)}" class="sk-grid" />`)
    }
    lines.push(`    <line x1="${fmt(left - 4)}" y1="${fmt(yPos)}" x2="${fmt(left)}" y2="${fmt(yPos)}" class="sk-tick" />`)
    lines.push(
      `    <text x="${fmt(left - 6)}" y="${fmt(yPos + opts.fontSize / 3)}" class="sk-txt" text-anchor="end">${axisFmt(tick)}</text>`,
    )
  }

  lines.push(`    <line x1="${fmt(left)}" y1="${fmt(top)}" x2="${fmt(left)}" y2="${fmt(bottom)}" class="sk-axis" />`)
  lines.push(`    <line x1="${fmt(left)}" y1="${fmt(bottom)}" x2="${fmt(right)}" y2="${fmt(bottom)}" class="sk-axis" />`)

  return lines.join('\n')
}

function renderAxisLabels(
  lo: ReturnType<typeof layoutCartesian>,
  opts: Required<SvgChartOptions>,
  xLabel?: string,
  yLabel?: string,
): string {
  const { left, right, top, bottom } = lo
  const lines: string[] = []
  if (yLabel) {
    const x = opts.padding - 5
    const y = (top + bottom) / 2
    lines.push(
      `    <text x="${fmt(x)}" y="${fmt(y)}" class="sk-txt" text-anchor="middle" transform="rotate(-90, ${fmt(x)}, ${fmt(y)})">${esc(yLabel)}</text>`,
    )
  }
  if (xLabel) {
    lines.push(
      `    <text x="${fmt((left + right) / 2)}" y="${fmt(opts.height - opts.padding + 5)}" class="sk-txt" text-anchor="middle">${esc(xLabel)}</text>`,
    )
  }
  return lines.join('\n')
}

function renderXLabels(
  labels: string[],
  positions: number[],
  lo: ReturnType<typeof layoutCartesian>,
  opts: Required<SvgChartOptions>,
): string {
  const lines: string[] = []
  const y = lo.bottom + opts.fontSize + 5
  for (let i = 0; i < labels.length; i++) {
    lines.push(`    <text x="${fmt(positions[i]!)}" y="${fmt(y)}" class="sk-txt" text-anchor="middle">${esc(labels[i]!)}</text>`)
  }
  return lines.join('\n')
}

function renderLegend(
  items: { label: string; color: string }[],
  lo: ReturnType<typeof layoutCartesian>,
  opts: Required<SvgChartOptions>,
): string {
  if (!opts.showLegend || items.length === 0) return ''
  const lines: string[] = []
  const y = opts.height - opts.padding - lo.legendH + 4
  let x = lo.left
  const maxX = lo.right
  const fs = opts.fontSize

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!
    const textW = item.label.length * (fs * 0.6) + 22
    if (x + textW > maxX && x > lo.left) {
      x = lo.left
    }
    lines.push(`    <rect x="${fmt(x)}" y="${fmt(y)}" width="10" height="10" fill="${item.color}" rx="2" />`)
    lines.push(`    <text x="${fmt(x + 14)}" y="${fmt(y + 9)}" class="sk-txt">${esc(item.label)}</text>`)
    x += textW + 8
  }
  return lines.join('\n')
}

// ── Chart functions ────────────────────────────────────────────────

/**
 * Generate an SVG bar chart.
 *
 * @param data - Labels and values for each bar.
 * @param options - Optional chart configuration.
 * @returns A complete SVG string.
 * @example
 * ```ts
 * const svg = svgBarChart(
 *   { labels: ['A','B','C'], values: [10, 20, 15] },
 *   { title: 'My Chart' },
 * )
 * ```
 */
export function svgBarChart(data: BarChartData, options?: SvgChartOptions): string {
  const opts = mergeOptions(options)
  const lo = layoutCartesian(opts)

  if (!data.labels.length || !data.values.length) {
    return wrapSvg(`    <text x="${opts.width / 2}" y="${opts.height / 2}" class="sk-txt" text-anchor="middle">No data</text>`, opts)
  }

  const n = Math.min(data.labels.length, data.values.length)
  const values = data.values.slice(0, n)
  const minVal = Math.min(0, ...values)
  const maxVal = Math.max(...values)
  const scale = niceScale(minVal, maxVal, 5)
  const yPx = (v: number): number => lo.bottom - ((v - scale.domainMin) / (scale.domainMax - scale.domainMin)) * lo.chartH

  const barWidth = (lo.chartW / n) * 0.7
  const gap = (lo.chartW / n) * 0.3
  const colors = data.colors ?? opts.colors

  const parts: string[] = [renderYAxis(scale, yPx, lo, opts)]

  const zeroY = yPx(0)

  for (let i = 0; i < n; i++) {
    const v = values[i]!
    const x = lo.left + (i / n) * lo.chartW + gap / 2
    const y = yPx(Math.max(0, v))
    const h = Math.abs(yPx(v) - zeroY)
    const color = colors[i % colors.length]!
    parts.push(
      `    <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(barWidth)}" height="${fmt(Math.max(1, h))}" fill="${color}" rx="${opts.borderRadius}" />`,
    )
  }

  const xPositions = Array.from({ length: n }, (_, i) => lo.left + (i + 0.5) * (lo.chartW / n))
  parts.push(renderXLabels(data.labels.slice(0, n), xPositions, lo, opts))

  const title = renderTitle(opts)
  if (title) parts.unshift(title)

  return wrapSvg(parts.join('\n'), opts)
}

/**
 * Generate an SVG line chart.
 *
 * @param data - Labels and datasets (each with label + values).
 * @param options - Optional chart configuration.
 * @returns A complete SVG string.
 * @example
 * ```ts
 * const svg = svgLineChart(
 *   {
 *     labels: ['Jan','Feb','Mar'],
 *     datasets: [
 *       { label: 'Sales', values: [100, 120, 150] },
 *       { label: 'Target', values: [110, 110, 140] },
 *     ],
 *   },
 *   { title: 'Sales vs Target' },
 * )
 * ```
 */
export function svgLineChart(data: LineChartData, options?: SvgChartOptions): string {
  const opts = mergeOptions(options)
  const lo = layoutCartesian(opts)

  if (!data.labels.length || !data.datasets.length) {
    return wrapSvg(`    <text x="${opts.width / 2}" y="${opts.height / 2}" class="sk-txt" text-anchor="middle">No data</text>`, opts)
  }

  const n = data.labels.length
  const allValues = data.datasets.flatMap((d) => d.values)
  if (!allValues.length) {
    return wrapSvg(`    <text x="${opts.width / 2}" y="${opts.height / 2}" class="sk-txt" text-anchor="middle">No data</text>`, opts)
  }

  const minVal = Math.min(0, ...allValues)
  const maxVal = Math.max(...allValues)
  const scale = niceScale(minVal, maxVal, 5)
  const yPx = (v: number): number => lo.bottom - ((v - scale.domainMin) / (scale.domainMax - scale.domainMin)) * lo.chartH

  const parts: string[] = [renderYAxis(scale, yPx, lo, opts)]

  for (let di = 0; di < data.datasets.length; di++) {
    const ds = data.datasets[di]!
    const color = ds.color ?? opts.colors[di % opts.colors.length]!
    const pts: string[] = []
    for (let i = 0; i < n && i < ds.values.length; i++) {
      const x = lo.left + (i + 0.5) * (lo.chartW / n)
      const y = yPx(ds.values[i]!)
      pts.push(`${fmt(x)},${fmt(y)}`)
    }
    if (pts.length < 2) continue
    parts.push(
      `    <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`,
    )
    for (let i = 0; i < pts.length; i++) {
      const [px, py] = pts[i]!.split(',')
      parts.push(`    <circle cx="${px}" cy="${py}" r="3" fill="${color}" />`)
    }
  }

  const xPositions = Array.from({ length: n }, (_, i) => lo.left + (i + 0.5) * (lo.chartW / n))
  parts.push(renderXLabels(data.labels.slice(0, n), xPositions, lo, opts))

  const legendItems = data.datasets.map((ds, i) => ({
    label: ds.label,
    color: ds.color ?? opts.colors[i % opts.colors.length]!,
  }))
  parts.push(renderLegend(legendItems, lo, opts))

  const title = renderTitle(opts)
  if (title) parts.unshift(title)

  return wrapSvg(parts.join('\n'), opts)
}

/**
 * Generate an SVG scatter chart.
 *
 * @param data - Points with x/y coordinates and optional labels.
 * @param options - Optional chart configuration.
 * @returns A complete SVG string.
 * @example
 * ```ts
 * const svg = svgScatterChart(
 *   {
 *     points: [{ x: 1, y: 2 }, { x: 3, y: 5 }],
 *     xLabel: 'Weight',
 *     yLabel: 'Height',
 *   },
 *   { title: 'Scatter' },
 * )
 * ```
 */
export function svgScatterChart(data: ScatterChartData, options?: SvgChartOptions): string {
  const opts = mergeOptions(options)
  const lo = layoutCartesian(opts)

  if (!data.points.length) {
    return wrapSvg(`    <text x="${opts.width / 2}" y="${opts.height / 2}" class="sk-txt" text-anchor="middle">No data</text>`, opts)
  }

  const xs = data.points.map((p) => p.x)
  const ys = data.points.map((p) => p.y)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)

  const xScale = niceScale(xMin, xMax, 5)
  const yScale = niceScale(yMin, yMax, 5)

  const xPx = (v: number): number => lo.left + ((v - xScale.domainMin) / (xScale.domainMax - xScale.domainMin)) * lo.chartW
  const yPx = (v: number): number => lo.bottom - ((v - yScale.domainMin) / (yScale.domainMax - yScale.domainMin)) * lo.chartH

  const parts: string[] = []

  // Y axis
  parts.push(renderYAxis(yScale, yPx, lo, opts))

  // X grid & labels
  for (const tick of xScale.ticks) {
    const xPos = xPx(tick)
    if (xPos < lo.left - 5 || xPos > lo.right + 5) continue
    if (opts.showGrid) {
      parts.push(`    <line x1="${fmt(xPos)}" y1="${fmt(lo.top)}" x2="${fmt(xPos)}" y2="${fmt(lo.bottom)}" class="sk-grid" />`)
    }
    parts.push(`    <line x1="${fmt(xPos)}" y1="${fmt(lo.bottom)}" x2="${fmt(xPos)}" y2="${fmt(lo.bottom + 4)}" class="sk-tick" />`)
    parts.push(
      `    <text x="${fmt(xPos)}" y="${fmt(lo.bottom + opts.fontSize + 5)}" class="sk-txt" text-anchor="middle">${axisFmt(tick)}</text>`,
    )
  }

  // Points
  const color = opts.colors[0]!
  for (const pt of data.points) {
    const cx = xPx(pt.x)
    const cy = yPx(pt.y)
    parts.push(`    <circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="4" fill="${color}" opacity="0.8" />`)
    if (pt.label) {
      parts.push(`    <text x="${fmt(cx + 6)}" y="${fmt(cy - 4)}" class="sk-txt" font-size="${opts.fontSize - 1}">${esc(pt.label)}</text>`)
    }
  }

  parts.push(renderAxisLabels(lo, opts, data.xLabel, data.yLabel))

  const title = renderTitle(opts)
  if (title) parts.unshift(title)

  return wrapSvg(parts.join('\n'), opts)
}

/**
 * Generate an SVG pie / doughnut chart.
 *
 * @param data - Labels and values for each slice.
 * @param options - Optional chart configuration.
 * @returns A complete SVG string.
 * @example
 * ```ts
 * const svg = svgPieChart(
 *   { labels: ['A','B','C'], values: [30, 50, 20] },
 *   { title: 'Distribution' },
 * )
 * ```
 */
export function svgPieChart(data: PieChartData, options?: SvgChartOptions): string {
  const opts = mergeOptions(options)
  const lo = layoutCartesian(opts)

  if (!data.labels.length || !data.values.length) {
    return wrapSvg(`    <text x="${opts.width / 2}" y="${opts.height / 2}" class="sk-txt" text-anchor="middle">No data</text>`, opts)
  }

  const n = Math.min(data.labels.length, data.values.length)
  const values = data.values.slice(0, n)
  const total = values.reduce((a, b) => a + b, 0)
  if (total <= 0) {
    return wrapSvg(`    <text x="${opts.width / 2}" y="${opts.height / 2}" class="sk-txt" text-anchor="middle">No data</text>`, opts)
  }

  const cx = opts.width / 2
  const cy = (lo.top + lo.bottom) / 2
  const radius = Math.min(lo.chartW, lo.chartH) / 2 - 10

  const colors = data.colors ?? opts.colors
  const parts: string[] = []

  let startAngle = -Math.PI / 2

  for (let i = 0; i < n; i++) {
    const v = values[i]!
    if (v <= 0) continue
    const sliceAngle = (v / total) * 2 * Math.PI
    const endAngle = startAngle + sliceAngle
    const color = colors[i % colors.length]!

    const x1 = cx + radius * Math.cos(startAngle)
    const y1 = cy + radius * Math.sin(startAngle)
    const x2 = cx + radius * Math.cos(endAngle)
    const y2 = cy + radius * Math.sin(endAngle)
    const largeArc = sliceAngle > Math.PI ? 1 : 0

    // Full circle case
    if (Math.abs(sliceAngle - 2 * Math.PI) < 1e-10) {
      parts.push(`    <circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(radius)}" fill="${color}" />`)
    } else {
      parts.push(
        `    <path d="M ${fmt(cx)} ${fmt(cy)} L ${fmt(x1)} ${fmt(y1)} A ${fmt(radius)} ${fmt(radius)} 0 ${largeArc} 1 ${fmt(x2)} ${fmt(y2)} Z" fill="${color}" />`,
      )
    }

    // Label (percentage) at midpoint
    const midAngle = startAngle + sliceAngle / 2
    const labelR = radius * 0.65
    const lx = cx + labelR * Math.cos(midAngle)
    const ly = cy + labelR * Math.sin(midAngle)
    const pct = (v / total) * 100
    if (pct >= 5) {
      parts.push(
        `    <text x="${fmt(lx)}" y="${fmt(ly + opts.fontSize / 3)}" class="sk-txt" text-anchor="middle" font-weight="bold" fill="#fff" font-size="${opts.fontSize - 1}">${fmt(pct, 1)}%</text>`,
      )
    }

    startAngle = endAngle
  }

  // Legend
  const legendItems = Array.from({ length: n }, (_, i) => ({
    label: data.labels[i]!,
    color: colors[i % colors.length]!,
  }))
  parts.push(renderLegend(legendItems, lo, opts))

  const title = renderTitle(opts)
  if (title) parts.unshift(title)

  return wrapSvg(parts.join('\n'), opts)
}
