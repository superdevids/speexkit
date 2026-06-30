export { analyzeUsage } from './analyzer/index.js'
export { KNOWN_CVES, KNOWN_MAPPINGS } from './known-mappings.js'
export { generateDiagnosticsOutput, generateReport } from './reporter/index.js'
export { scanBundleSize, scanProject } from './scanner/index.js'
export type {
  BundleSizeEntry,
  BundleSizeResult,
  CliOptions,
  DependencyInfo,
  ReplacementSuggestion,
  ScannerConfig,
  ScanResult,
  SecurityIssue,
} from './types.js'
