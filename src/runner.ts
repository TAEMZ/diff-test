import { execSync } from 'child_process'
import path from 'path'
import type { Framework } from './types'

/** Build the test command for a given framework and file list. */
export function buildCommand(
  framework: Framework,
  testFiles: string[],
  cwd: string,
  passthrough: string[] = []
): string {
  // Convert absolute paths to relative for cleaner output
  const relative = testFiles.map((f) => path.relative(cwd, f))
  const extra = passthrough.length > 0 ? ' ' + passthrough.join(' ') : ''

  switch (framework) {
    case 'vitest':
      return `npx vitest run ${relative.join(' ')}${extra}`
    case 'jest':
      return `npx jest ${relative.join(' ')}${extra}`
    case 'mocha':
      return `npx mocha ${relative.join(' ')}${extra}`
    case 'playwright':
      return `npx playwright test ${relative.join(' ')}${extra}`
  }
}

/** Run the test command and return the exit code. */
export function runTests(
  framework: Framework,
  testFiles: string[],
  cwd: string,
  passthrough: string[] = []
): number {
  const cmd = buildCommand(framework, testFiles, cwd, passthrough)

  try {
    execSync(cmd, { cwd, stdio: 'inherit' })
    return 0
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err) {
      return (err as { status: number }).status ?? 1
    }
    return 1
  }
}
