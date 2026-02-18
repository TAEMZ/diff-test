import { getChangedFiles, getGitRoot } from './diff'
import { buildDepGraph } from './graph'
import { findAffectedTests } from './finder'
import { detectFramework } from './detect'
import { runTests, buildCommand } from './runner'
import type { DiffTestOptions, DiffTestResult } from './types'

export { getChangedFiles, getGitRoot } from './diff'
export { buildDepGraph } from './graph'
export { findAffectedTests } from './finder'
export { detectFramework } from './detect'
export { runTests, buildCommand } from './runner'
export type { DiffTestOptions, DiffTestResult, Framework, DepGraph } from './types'

/** Run the full diff-test pipeline. */
export async function diffTest(options: DiffTestOptions = {}): Promise<DiffTestResult> {
  const cwd = options.cwd ?? getGitRoot()
  const framework = options.framework ?? detectFramework(cwd)

  // 1. Get changed files
  const changedFiles = getChangedFiles({
    base: options.base,
    staged: options.staged,
    cwd,
  })

  if (changedFiles.length === 0) {
    return { changedFiles: [], affectedTests: [], executed: false, exitCode: null }
  }

  // 2. Build import graph
  const graph = buildDepGraph(cwd, options.extensions, options.ignore)

  // 3. Find affected tests
  const affectedTests = findAffectedTests(changedFiles, graph, framework)

  if (affectedTests.length === 0) {
    return { changedFiles, affectedTests: [], executed: false, exitCode: null }
  }

  // 4. Run or dry-run
  if (options.dryRun) {
    return { changedFiles, affectedTests, executed: false, exitCode: null }
  }

  const exitCode = runTests(framework, affectedTests, cwd, options.passthrough)
  return { changedFiles, affectedTests, executed: true, exitCode }
}
