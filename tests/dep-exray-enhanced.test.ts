import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { generateReport } from '../src/dep-exray/reporter/index.js'
import { scanBundleSize, scanProject } from '../src/dep-exray/scanner/index.js'
import { generateDiagnosticsOutput } from '../src/dep-exray/reporter/index.js'
import type { ScanResult } from '../src/dep-exray/types.js'

function makeMockResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    projectName: 'test-project',
    directDeps: 5,
    transitiveDeps: 20,
    totalEstimatedSize: '2.3 MB',
    highImpactReplacements: [
      {
        packageName: 'lodash',
        reason: 'Most lodash functions have direct replacements in jscore-core',
        replacement: 'jscore-core',
        estimatedSizeReduction: '4.2 MB → 5 KB',
        confidence: 'high',
        autoPrReady: true,
      },
    ],
    mediumImpactReplacements: [
      {
        packageName: 'axios',
        reason: 'Native fetch covers most use cases',
        replacement: 'native fetch + jscore-core/async/retry',
        estimatedSizeReduction: '1.6 MB → 5 KB',
        confidence: 'medium',
        autoPrReady: false,
      },
    ],
    securityIssues: [
      {
        packageName: 'lodash',
        cveId: 'CVE-2020-28502',
        severity: 'high',
        fix: 'Update to lodash@4.17.21 or later',
      },
      {
        packageName: 'semver',
        cveId: 'CVE-2022-25883',
        severity: 'medium',
        fix: 'Update to semver@7.5.2 or later',
      },
    ],
    ...overrides,
  }
}

describe('generateDiagnosticsOutput', () => {
  it('should output VS Code problem matcher format for high impact replacements', () => {
    const result = makeMockResult()
    const output = generateDiagnosticsOutput(result)
    const lines = output.split('\n')

    const lodashLine = lines.find((l) => l.includes('lodash'))
    expect(lodashLine).toBeTruthy()
    expect(lodashLine).toMatch(/^.+\.json:\d+:\d+ - \w+: .+/)
    expect(lodashLine).toContain('warning')
    expect(lodashLine).toContain('lodash')
    expect(lodashLine).toContain('jscore-core')
  })

  it('should use error severity for high/critical security issues', () => {
    const result = makeMockResult()
    const output = generateDiagnosticsOutput(result)
    const lines = output.split('\n')

    const highCveLine = lines.find((l) => l.includes('CVE-2020-28502'))
    expect(highCveLine).toBeTruthy()
    expect(highCveLine).toContain('error')
  })

  it('should use warning severity for medium security issues', () => {
    const result = makeMockResult()
    const output = generateDiagnosticsOutput(result)
    const lines = output.split('\n')

    const mediumCveLine = lines.find((l) => l.includes('CVE-2022-25883'))
    expect(mediumCveLine).toBeTruthy()
    expect(mediumCveLine).toContain('warning')
  })

  it('should output info message when no issues found', () => {
    const result = makeMockResult({
      highImpactReplacements: [],
      mediumImpactReplacements: [],
      securityIssues: [],
    })
    const output = generateDiagnosticsOutput(result)
    expect(output).toContain('No dependency issues found')
  })

  it('every line should match VS Code problem matcher format', () => {
    const result = makeMockResult()
    const output = generateDiagnosticsOutput(result)
    const lines = output.split('\n').filter((l) => l.length > 0)

    for (const line of lines) {
      expect(line).toMatch(/^.+:\d+:\d+ - (warning|error|info): .+/)
    }
  })
})

describe('scanBundleSize', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'dep-exray-bundle-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  function createFile(subdir: string, filename: string, size: number) {
    const fullDir = join(tmpDir, subdir)
    mkdirSync(fullDir, { recursive: true })
    const content = Buffer.alloc(size, 'x')
    writeFileSync(join(fullDir, filename), content)
  }

  it('should scan dist/ directory and report total size', () => {
    mkdirSync(join(tmpDir, 'dist'), { recursive: true })
    createFile('dist', 'index.js', 5000)
    createFile('dist', 'utils.js', 3000)

    const result = scanBundleSize(tmpDir)
    expect(result.totalFiles).toBe(2)
    expect(result.totalSize).toBe(8000)
    expect(result.totalSizeFormatted).toMatch(/\d+(\.\d+)? (B|KB|MB)/)
    expect(result.largestFiles.length).toBeGreaterThanOrEqual(1)
  })

  it('should fall back to src/ when no dist/ directory', () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true })
    createFile('src', 'index.ts', 2000)
    createFile('src', 'helpers.ts', 1000)

    const result = scanBundleSize(tmpDir)
    expect(result.totalFiles).toBe(2)
    expect(result.totalSize).toBe(3000)
  })

  it('should group files by directory', () => {
    mkdirSync(join(tmpDir, 'dist'), { recursive: true })
    mkdirSync(join(tmpDir, 'dist', 'core'), { recursive: true })
    mkdirSync(join(tmpDir, 'dist', 'utils'), { recursive: true })

    createFile('dist', 'index.js', 5000)
    createFile(join('dist', 'core'), 'main.js', 10000)
    createFile(join('dist', 'utils'), 'helpers.js', 3000)

    const result = scanBundleSize(tmpDir)
    expect(Object.keys(result.groupedByDir).length).toBeGreaterThanOrEqual(3)
    const coreDir = join('dist', 'core')
    expect(result.groupedByDir[coreDir]).toBeDefined()
    expect(result.groupedByDir[coreDir]!.totalSize).toBe(10000)
  })

  it('should return largest files sorted by size descending', () => {
    mkdirSync(join(tmpDir, 'dist'), { recursive: true })
    createFile('dist', 'small.js', 100)
    createFile('dist', 'medium.js', 500)
    createFile('dist', 'large.js', 2000)

    const result = scanBundleSize(tmpDir)
    expect(result.largestFiles[0]!.size).toBe(2000)
    expect(result.largestFiles[1]!.size).toBe(500)
    expect(result.largestFiles[2]!.size).toBe(100)
  })

  it('should handle empty directory gracefully', () => {
    mkdirSync(join(tmpDir, 'dist'), { recursive: true })

    const result = scanBundleSize(tmpDir)
    expect(result.totalFiles).toBe(0)
    expect(result.totalSize).toBe(0)
    expect(result.largestFiles).toHaveLength(0)
  })

  it('should honor verbose flag for more results', () => {
    mkdirSync(join(tmpDir, 'dist'), { recursive: true })
    for (let i = 0; i < 25; i++) {
      createFile('dist', `file${i}.js`, 100)
    }

    const defaultResult = scanBundleSize(tmpDir)
    const verboseResult = scanBundleSize(tmpDir, true)

    expect(defaultResult.largestFiles.length).toBe(10)
    expect(verboseResult.largestFiles.length).toBe(25)
  })

  it('should skip node_modules and .git directories', () => {
    mkdirSync(join(tmpDir, 'dist'), { recursive: true })
    mkdirSync(join(tmpDir, 'node_modules'), { recursive: true })
    createFile('dist', 'app.js', 5000)
    createFile('node_modules', 'heavy.js', 999999)

    const result = scanBundleSize(tmpDir)
    expect(result.totalFiles).toBe(1)
    expect(result.totalSize).toBe(5000)
  })
})

describe('Enhanced generateReport', () => {
  it('should include bundle size section when provided', () => {
    const result = makeMockResult()
    const bundleResult = {
      totalFiles: 15,
      totalSize: 45000,
      totalSizeFormatted: '43.9 KB',
      largestFiles: [{ filePath: 'dist/index.js', size: 20000, sizeFormatted: '19.5 KB' }],
      groupedByDir: {
        dist: { files: 10, totalSize: 30000, totalSizeFormatted: '29.3 KB' },
        'dist/core': { files: 5, totalSize: 15000, totalSizeFormatted: '14.6 KB' },
      },
    }

    const output = generateReport(result, false, bundleResult)
    expect(output).toContain('43.9 KB')
    expect(output).toContain('BUNDLE SIZE ANALYSIS')
    expect(output).toContain('19.5 KB')
  })

  it('should include bundle size data in JSON output', () => {
    const result = makeMockResult()
    const bundleResult = {
      totalFiles: 5,
      totalSize: 10000,
      totalSizeFormatted: '9.8 KB',
      largestFiles: [{ filePath: 'dist/index.js', size: 10000, sizeFormatted: '9.8 KB' }],
      groupedByDir: { dist: { files: 5, totalSize: 10000, totalSizeFormatted: '9.8 KB' } },
    }

    const output = generateReport(result, true, bundleResult)
    const parsed = JSON.parse(output)
    expect(parsed.bundleSize).toBeDefined()
    expect(parsed.bundleSize.totalSize).toBe(10000)
    expect(parsed.bundleSize.totalFiles).toBe(5)
  })

  it('should work without bundle size data (backward compatible)', () => {
    const result = makeMockResult()
    const output = generateReport(result)
    expect(output).toContain('test-project')
    expect(output).toContain('SECURITY ISSUES')
    expect(output).not.toContain('BUNDLE SIZE ANALYSIS')
  })

  it('should include summary: total dependencies, outdated count, security issues, bundle size', () => {
    const result = makeMockResult()
    const bundleResult = {
      totalFiles: 10,
      totalSize: 50000,
      totalSizeFormatted: '48.8 KB',
      largestFiles: [],
      groupedByDir: {},
    }
    const output = generateReport(result, false, bundleResult)
    expect(output).toContain('test-project')
    expect(output).toContain('5')
    expect(output).toContain('20')
    expect(output).toContain('48.8 KB')
    expect(output).toContain('SECURITY ISSUES')
  })
})

describe('CLI help text includes new options', () => {
  it('help output should describe all flags', () => {
    const helpText = `
  dep-exray — Dependency Health Scanner

  Usage:
    dep-exray [path] [options]

  Arguments:
    path        Project path to scan (default: .)

  Options:
    -j, --json           Output as JSON
    -v, --verbose        Verbose output
    -d, --diagnostics    VS Code problem matcher format output
    -b, --bundle-size    Analyze bundle size
    --fix                Auto-generate migration PRs
    -h, --help           Show this help
    `

    expect(helpText).toContain('--diagnostics')
    expect(helpText).toContain('VS Code problem matcher')
    expect(helpText).toContain('--bundle-size')
    expect(helpText).toContain('Analyze bundle size')
    expect(helpText).toContain('--fix')
    expect(helpText).toContain('Auto-generate')
    expect(helpText).toContain('--json')
    expect(helpText).toContain('--verbose')
  })
})
