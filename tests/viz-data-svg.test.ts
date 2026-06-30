import { describe, it, expect } from 'vitest'
import { svgBarChart, svgLineChart, svgScatterChart, svgPieChart } from '../src/viz-data/index.js'

function assertValidSvg(svg: string): void {
  expect(svg.startsWith('<?xml')).toBe(true)
  expect(svg).toContain('<svg')
  expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
  expect(svg.endsWith('</svg>')).toBe(true)
}

describe('svgBarChart', () => {
  it('renders valid SVG', () => {
    const svg = svgBarChart({ labels: ['A', 'B', 'C'], values: [10, 20, 15] })
    assertValidSvg(svg)
    expect(svg).toContain('<rect')
  })

  it('supports custom colors', () => {
    const svg = svgBarChart({ labels: ['A', 'B'], values: [10, 20], colors: ['#ff0000', '#00ff00'] })
    assertValidSvg(svg)
    expect(svg).toContain('#ff0000')
    expect(svg).toContain('#00ff00')
  })

  it('handles empty data gracefully', () => {
    const svg = svgBarChart({ labels: [], values: [] })
    assertValidSvg(svg)
    expect(svg).toContain('No data')
  })

  it('supports custom dimensions', () => {
    const svg = svgBarChart({ labels: ['X'], values: [42] }, { width: 800, height: 600 })
    assertValidSvg(svg)
    expect(svg).toContain('viewBox="0 0 800 600"')
  })
})

describe('svgLineChart', () => {
  it('renders valid SVG with single dataset', () => {
    const svg = svgLineChart({
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [{ label: 'Sales', values: [100, 120, 150] }],
    })
    assertValidSvg(svg)
    expect(svg).toContain('<polyline')
  })

  it('renders with multiple datasets', () => {
    const svg = svgLineChart({
      labels: ['Q1', 'Q2'],
      datasets: [
        { label: 'A', values: [10, 20] },
        { label: 'B', values: [30, 15] },
      ],
    })
    assertValidSvg(svg)
    // Two datasets → two polylines
    const matches = svg.match(/<polyline/g)
    expect(matches).toHaveLength(2)
  })

  it('includes legend items', () => {
    const svg = svgLineChart({
      labels: ['X', 'Y'],
      datasets: [
        { label: 'Series A', values: [1, 2] },
        { label: 'Series B', values: [3, 4] },
      ],
    })
    assertValidSvg(svg)
    expect(svg).toContain('Series A')
    expect(svg).toContain('Series B')
  })

  it('handles empty data gracefully', () => {
    const svg = svgLineChart({
      labels: [],
      datasets: [],
    })
    assertValidSvg(svg)
    expect(svg).toContain('No data')
  })
})

describe('svgScatterChart', () => {
  it('renders valid SVG', () => {
    const svg = svgScatterChart({
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 5 },
        { x: 4, y: 8 },
      ],
    })
    assertValidSvg(svg)
    // Three points → three circles
    const circles = svg.match(/<circle/g)
    expect(circles).toHaveLength(3)
  })

  it('shows axis labels when provided', () => {
    const svg = svgScatterChart({
      points: [{ x: 1, y: 2 }],
      xLabel: 'Weight',
      yLabel: 'Height',
    })
    assertValidSvg(svg)
    expect(svg).toContain('Weight')
    expect(svg).toContain('Height')
  })

  it('handles empty data gracefully', () => {
    const svg = svgScatterChart({ points: [] })
    assertValidSvg(svg)
    expect(svg).toContain('No data')
  })
})

describe('svgPieChart', () => {
  it('renders valid SVG', () => {
    const svg = svgPieChart({
      labels: ['A', 'B', 'C'],
      values: [30, 50, 20],
    })
    assertValidSvg(svg)
    expect(svg).toContain('<path')
  })

  it('includes legend items', () => {
    const svg = svgPieChart({
      labels: ['Alpha', 'Beta', 'Gamma'],
      values: [10, 20, 30],
    })
    assertValidSvg(svg)
    expect(svg).toContain('Alpha')
    expect(svg).toContain('Beta')
    expect(svg).toContain('Gamma')
  })

  it('handles empty data gracefully', () => {
    const svg = svgPieChart({ labels: [], values: [] })
    assertValidSvg(svg)
    expect(svg).toContain('No data')
  })

  it('handles all-zero values gracefully', () => {
    const svg = svgPieChart({ labels: ['A', 'B'], values: [0, 0] })
    assertValidSvg(svg)
    expect(svg).toContain('No data')
  })
})

describe('general chart features', () => {
  it('renders title when provided', () => {
    const svg = svgBarChart({ labels: ['A'], values: [10] }, { title: 'My Awesome Chart' })
    assertValidSvg(svg)
    expect(svg).toContain('My Awesome Chart')
  })

  it('includes viewBox when responsive', () => {
    const svg = svgLineChart({
      labels: ['A'],
      datasets: [{ label: 'S', values: [1] }],
    })
    expect(svg).toContain('viewBox')
  })

  it('omits viewBox when responsive: false', () => {
    const svg = svgBarChart({ labels: ['A'], values: [1] }, { responsive: false })
    expect(svg).not.toContain('viewBox')
  })

  it('produces well-formed SVG', () => {
    const charts = [
      svgBarChart({ labels: ['A', 'B'], values: [1, 2] }),
      svgLineChart({
        labels: ['X'],
        datasets: [{ label: 'Y', values: [3] }],
      }),
      svgScatterChart({ points: [{ x: 1, y: 2 }] }),
      svgPieChart({ labels: ['A'], values: [100] }),
    ]
    for (const svg of charts) {
      assertValidSvg(svg)
    }
  })

  it('runs without DOM errors (Node.js safe)', () => {
    expect(() => {
      const svg = svgBarChart({ labels: ['A'], values: [10] })
      // Should be a plain string with no DOM references
      expect(typeof svg).toBe('string')
      expect(svg.length).toBeGreaterThan(0)
    }).not.toThrow()
  })
})
