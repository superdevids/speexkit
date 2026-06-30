#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateDiagnosticsOutput, generateReport } from './reporter/index.js'
import { scanBundleSize, scanProject } from './scanner/index.js'

function parseArgs(args: string[]): {
  path: string
  json: boolean
  verbose: boolean
  fix: boolean
  diagnostics: boolean
  bundleSize: boolean
} {
  let path = '.'
  let json = false
  let verbose = false
  let fix = false
  let diagnostics = false
  let bundleSize = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '--json' || arg === '-j') {
      json = true
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true
    } else if (arg === '--fix') {
      fix = true
    } else if (arg === '--diagnostics' || arg === '-d') {
      diagnostics = true
    } else if (arg === '--bundle-size' || arg === '-b') {
      bundleSize = true
    } else if (!arg.startsWith('-')) {
      path = arg
    }
  }

  return { path, json, verbose, fix, diagnostics, bundleSize }
}

function printHelp(): void {
  console.log(`
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
    `)
}

async function runFix(result: Awaited<ReturnType<typeof scanProject>>, projectPath: string): Promise<void> {
  const allReplacements = [...result.highImpactReplacements, ...result.mediumImpactReplacements]
  if (allReplacements.length === 0) {
    console.log('  Nothing to fix — no replacement suggestions found.\n')
    return
  }

  const srcDir = join(projectPath, 'src')
  const pkgPath = join(projectPath, 'package.json')
  let pkgData: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {}
  try {
    pkgData = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  } catch {
    // will handle missing pkg later
  }

  const edits: { file: string; from: string; to: string; packageName: string }[] = []

  for (const r of allReplacements) {
    const depName = r.packageName
    const replacement = r.replacement

    if (pkgData.dependencies?.[depName]) {
      delete pkgData.dependencies[depName]
      if (
        replacement !== 'native' &&
        !replacement.startsWith('native ') &&
        !replacement.startsWith('crypto.') &&
        !replacement.startsWith('template literal')
      ) {
        const repName = replacement.includes('/') ? replacement.split('/')[0]! : replacement
        pkgData.dependencies[repName] = 'latest'
      }
    }
    if (pkgData.devDependencies?.[depName]) {
      delete pkgData.devDependencies[depName]
    }

    if (existsSync(srcDir)) {
      const sourceFiles = findFiles(srcDir)
      for (const file of sourceFiles) {
        try {
          const content = readFileSync(file, 'utf-8')
          const importRegex = new RegExp(
            `(from\\s+['"])${escapeRegex(depName)}(['"]|/)|(require\\(\\s*['"])${escapeRegex(depName)}(['"]|\\))`,
            'g',
          )
          if (importRegex.test(content)) {
            const newContent = content.replace(importRegex, (match, g1, g2, g3, g4, g5) => {
              if (g1 !== undefined && g2 !== undefined) {
                const repModule =
                  replacement === 'native' ||
                  replacement.startsWith('native ') ||
                  replacement.startsWith('crypto.') ||
                  replacement.startsWith('template literal')
                    ? depName
                    : replacement
                return `${g1}${repModule}${g2}`
              }
              if (g3 !== undefined && g4 !== undefined && g5 !== undefined) {
                const repModule =
                  replacement === 'native' ||
                  replacement.startsWith('native ') ||
                  replacement.startsWith('crypto.') ||
                  replacement.startsWith('template literal')
                    ? depName
                    : replacement
                return `${g3}${repModule}${g5}`
              }
              return match
            })
            if (newContent !== content) {
              edits.push({ file, from: depName, to: replacement, packageName: depName })
              writeFileSync(file, newContent)
            }
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  if (pkgData) {
    writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2) + '\n')
  }

  if (edits.length === 0) {
    console.log('  No source files were modified.\n')
    return
  }

  console.log(`  Modified ${edits.length} file(s) and updated package.json\n`)

  try {
    const branchName = `dep-exray/fix-${Date.now()}`
    execSync('git checkout -b ' + branchName, { cwd: projectPath, stdio: 'pipe' })
    execSync('git add -A', { cwd: projectPath, stdio: 'pipe' })
    execSync('git commit -m "chore: apply dep-exray dependency replacements"', { cwd: projectPath, stdio: 'pipe' })

    let hasGh = false
    try {
      execSync('gh --version', { stdio: 'pipe' })
      hasGh = true
    } catch {
      hasGh = false
    }
    if (hasGh) {
      execSync('git push -u origin ' + branchName, { cwd: projectPath, stdio: 'pipe' })
      const prUrl = execSync(
        `gh pr create --title "chore: apply dep-exray dependency replacements" --body "Auto-generated PR from dep-exray --fix"`,
        { cwd: projectPath, stdio: 'pipe' },
      )
        .toString()
        .trim()
      console.log(`  PR created: ${prUrl}\n`)
    } else {
      console.log('  gh CLI not found. To create a PR manually:\n')
      console.log(`    git push -u origin ${branchName}`)
      console.log(
        '    gh pr create --title "chore: apply dep-exray dependency replacements" --body "Auto-generated PR from dep-exray --fix"\n',
      )
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.log(`  Git/PR operation failed: ${message}`)
    console.log('  Changes have been applied locally. You can review and commit them manually.\n')
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findFiles(dir: string): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === 'coverage') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findFiles(full))
      } else if (entry.isFile()) {
        const ext = entry.name.split('.').pop()
        if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') {
          results.push(full)
        }
      }
    }
  } catch {
    // skip inaccessible dirs
  }
  return results
}

function renderBundleSizeTable(
  result: {
    totalFiles: number
    totalSize: number
    totalSizeFormatted: string
    largestFiles: { filePath: string; size: number; sizeFormatted: string }[]
    groupedByDir: Record<string, { files: number; totalSize: number; totalSizeFormatted: string }>
  },
  json: boolean,
): string {
  if (json) return JSON.stringify(result, null, 2)

  const lines: string[] = []
  const hr = '─'.repeat(58)

  lines.push(`┌${hr}┐`)
  lines.push(`│${' '.repeat(18)}Bundle Size Analysis${' '.repeat(22)}│`)
  lines.push(`├${hr}┤`)
  lines.push(`│  Total: ${String(result.totalFiles).padStart(5)} files  ${result.totalSizeFormatted.padStart(12)}${' '.repeat(26)}│`)
  lines.push(`├${hr}┤`)
  lines.push(`│  ${'Directory'.padEnd(36)} Files  Size${' '.repeat(5)}│`)

  const dirs = Object.entries(result.groupedByDir)
    .sort((a, b) => b[1].totalSize - a[1].totalSize)
    .slice(0, 10)
  for (const [dir, info] of dirs) {
    const label = dir || '(root)'
    const truncated = label.length > 35 ? '...' + label.slice(-32) : label
    lines.push(`│  ${truncated.padEnd(36)} ${String(info.files).padStart(4)}  ${info.totalSizeFormatted.padStart(10)} │`)
  }

  lines.push(`├${hr}┤`)
  lines.push(`│  ${'Largest Files'.padEnd(48)} │`)
  lines.push(`├${hr}┤`)
  for (const entry of result.largestFiles.slice(0, 10)) {
    const truncated = entry.filePath.length > 42 ? '...' + entry.filePath.slice(-39) : entry.filePath
    lines.push(`│  ${entry.sizeFormatted.padStart(10)}  ${truncated}${' '.repeat(Math.max(1, 43 - truncated.length))}│`)
  }
  lines.push(`└${hr}┘`)

  return lines.join('\n')
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp()
    process.exit(0)
  }

  const opts = parseArgs(args)
  const { path, json, verbose, fix, diagnostics, bundleSize } = opts

  try {
    if (diagnostics) {
      const result = await scanProject({ path, verbose, jsonOutput: json })
      const diagnosticsOutput = generateDiagnosticsOutput(result)
      if (json) {
        console.log(JSON.stringify({ diagnostics: diagnosticsOutput.split('\n') }, null, 2))
      } else {
        console.log(diagnosticsOutput)
      }
      return
    }

    if (bundleSize) {
      const sizeResult = scanBundleSize(path, verbose)
      console.log(renderBundleSizeTable(sizeResult, json))
      return
    }

    const result = await scanProject({ path, verbose, jsonOutput: json })
    let bundleResult: ReturnType<typeof scanBundleSize> | undefined
    if (json || verbose) {
      bundleResult = scanBundleSize(path, verbose)
    }
    console.log(generateReport(result, json, bundleResult))

    if (fix) {
      console.log()
      await runFix(result, path)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}

main()
