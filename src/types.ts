export type Framework = 'vitest' | 'jest' | 'mocha' | 'playwright'

export interface DiffTestOptions {
  /** Test framework to use. Auto-detected if not set. */
  framework?: Framework
  /** Git base ref to diff against. Default: staged + unstaged changes. */
  base?: string
  /** Only consider staged changes. */
  staged?: boolean
  /** Project root directory. Default: git root. */
  cwd?: string
  /** Test file glob patterns. Default: framework-specific patterns. */
  testPatterns?: string[]
  /** File extensions to trace imports through. */
  extensions?: string[]
  /** Directories to ignore when building import graph. */
  ignore?: string[]
  /** Just print affected files, don't run tests. */
  dryRun?: boolean
  /** Pass-through args to the test framework. */
  passthrough?: string[]
}

export interface DiffTestResult {
  /** Files changed in the git diff. */
  changedFiles: string[]
  /** Test files affected by the changes. */
  affectedTests: string[]
  /** Whether tests were actually executed. */
  executed: boolean
  /** Exit code from the test runner (null if dry run). */
  exitCode: number | null
}

/** Reverse dependency map: file path → set of files that import it. */
export type DepGraph = Map<string, Set<string>>
