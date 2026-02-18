import path from 'path'
import type { DepGraph, Framework } from './types'

const FRAMEWORK_PATTERNS: Record<Framework, RegExp[]> = {
  vitest: [/\.test\.[tjm]sx?$/, /\.spec\.[tjm]sx?$/, /__tests__\/.+\.[tjm]sx?$/],
  jest: [/\.test\.[tjm]sx?$/, /\.spec\.[tjm]sx?$/, /__tests__\/.+\.[tjm]sx?$/],
  mocha: [/\.test\.[tjm]sx?$/, /\.spec\.[tjm]sx?$/, /test\/.+\.[tjm]sx?$/],
  playwright: [/\.spec\.[tjm]sx?$/, /e2e\/.+\.[tjm]sx?$/, /tests\/.+\.[tjm]sx?$/],
}

/**
 * Find test files affected by changed files.
 *
 * A test is affected if:
 * 1. The test file itself was changed, OR
 * 2. The test file imports (directly or transitively) a changed file
 */
export function findAffectedTests(
  changedFiles: string[],
  depGraph: DepGraph,
  framework: Framework,
  customPatterns?: string[]
): string[] {
  const testPatterns = customPatterns
    ? customPatterns.map((p) => new RegExp(p))
    : FRAMEWORK_PATTERNS[framework]

  const affected = new Set<string>()

  for (const changed of changedFiles) {
    // If the changed file IS a test file, include it directly
    if (isTestFile(changed, testPatterns)) {
      affected.add(changed)
    }

    // Walk the reverse dep graph to find all files that depend on this change
    const dependents = getTransitiveDependents(changed, depGraph)
    for (const dep of dependents) {
      if (isTestFile(dep, testPatterns)) {
        affected.add(dep)
      }
    }
  }

  return [...affected].sort()
}

/** Walk the reverse dep graph to find all transitive dependents. */
function getTransitiveDependents(file: string, graph: DepGraph): Set<string> {
  const visited = new Set<string>()
  const queue = [file]

  while (queue.length > 0) {
    const current = queue.pop()!
    if (visited.has(current)) continue
    visited.add(current)

    const importers = graph.get(current)
    if (importers) {
      for (const importer of importers) {
        if (!visited.has(importer)) {
          queue.push(importer)
        }
      }
    }
  }

  // Remove the original file from results
  visited.delete(file)
  return visited
}

function isTestFile(filePath: string, patterns: RegExp[]): boolean {
  const basename = path.basename(filePath)
  const relative = filePath
  return patterns.some((p) => p.test(basename) || p.test(relative))
}
