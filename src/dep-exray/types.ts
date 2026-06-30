export interface DependencyInfo {
  name: string
  version: string
  isDirect: boolean
  estimatedSize: number
  isUnused: boolean
  cveCount: number
}

export interface ReplacementSuggestion {
  packageName: string
  reason: string
  replacement: string
  estimatedSizeReduction: string
  confidence: 'high' | 'medium' | 'low'
  autoPrReady: boolean
}

export interface ScanResult {
  projectName: string
  directDeps: number
  transitiveDeps: number
  totalEstimatedSize: string
  highImpactReplacements: ReplacementSuggestion[]
  mediumImpactReplacements: ReplacementSuggestion[]
  securityIssues: SecurityIssue[]
}

export interface SecurityIssue {
  packageName: string
  cveId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  fix: string
}

export interface ScannerConfig {
  path?: string
  verbose?: boolean
  jsonOutput?: boolean
}

export interface BundleSizeEntry {
  filePath: string
  size: number
  sizeFormatted: string
}

export interface BundleSizeResult {
  totalFiles: number
  totalSize: number
  totalSizeFormatted: string
  largestFiles: BundleSizeEntry[]
  groupedByDir: Record<string, { files: number; totalSize: number; totalSizeFormatted: string }>
}

export interface CliOptions {
  path: string
  json: boolean
  verbose: boolean
  fix: boolean
  diagnostics: boolean
  bundleSize: boolean
}
