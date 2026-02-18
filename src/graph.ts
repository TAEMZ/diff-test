import fs from 'fs'
import path from 'path'
import type { DepGraph } from './types'

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
const DEFAULT_IGNORE = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next']

// Matches: import ... from '...',  require('...'),  export ... from '...'
const IMPORT_PATTERNS = [
  /(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/g,
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
]

/** Build a reverse dependency graph: for each file, which files import it. */
export function buildDepGraph(
  rootDir: string,
  extensions: string[] = DEFAULT_EXTENSIONS,
  ignore: string[] = DEFAULT_IGNORE
): DepGraph {
  const graph: DepGraph = new Map()
  const allFiles = collectFiles(rootDir, extensions, ignore)

  for (const filePath of allFiles) {
    const imports = extractImports(filePath, rootDir, extensions)
    for (const imp of imports) {
      if (!graph.has(imp)) {
        graph.set(imp, new Set())
      }
      graph.get(imp)!.add(filePath)
    }
  }

  return graph
}

/** Collect all source files recursively. */
function collectFiles(dir: string, extensions: string[], ignore: string[]): string[] {
  const results: string[] = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    if (ignore.includes(entry.name)) continue

    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, extensions, ignore))
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath)
    }
  }

  return results
}

/** Extract resolved import paths from a file. */
function extractImports(filePath: string, rootDir: string, extensions: string[]): string[] {
  let content: string
  try {
    content = fs.readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  const imports: string[] = []
  const dir = path.dirname(filePath)

  for (const pattern of IMPORT_PATTERNS) {
    // Reset regex state
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null

    while ((match = regex.exec(content)) !== null) {
      const specifier = match[1]

      // Only resolve relative imports
      if (!specifier.startsWith('.')) continue

      const resolved = resolveImport(specifier, dir, extensions)
      if (resolved) {
        imports.push(resolved)
      }
    }
  }

  return imports
}

/** Resolve a relative import specifier to an absolute file path. */
function resolveImport(specifier: string, fromDir: string, extensions: string[]): string | null {
  const base = path.resolve(fromDir, specifier)

  // Try exact path
  if (fs.existsSync(base) && fs.statSync(base).isFile()) {
    return base
  }

  // Try with extensions
  for (const ext of extensions) {
    const withExt = base + ext
    if (fs.existsSync(withExt)) {
      return withExt
    }
  }

  // Try as directory with index file
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const ext of extensions) {
      const indexPath = path.join(base, 'index' + ext)
      if (fs.existsSync(indexPath)) {
        return indexPath
      }
    }
  }

  return null
}
