import fs from 'fs'
import path from 'path'
import type { Framework } from './types'

/** Auto-detect the test framework from package.json and config files. */
export function detectFramework(cwd: string): Framework {
  const pkgPath = path.join(cwd, 'package.json')

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      }

      // Check in priority order
      if (allDeps['vitest']) return 'vitest'
      if (allDeps['@playwright/test']) return 'playwright'
      if (allDeps['jest']) return 'jest'
      if (allDeps['mocha']) return 'mocha'
    } catch {
      // ignore parse errors
    }
  }

  // Check for config files
  const configs: [string, Framework][] = [
    ['vitest.config.ts', 'vitest'],
    ['vitest.config.js', 'vitest'],
    ['vite.config.ts', 'vitest'],
    ['playwright.config.ts', 'playwright'],
    ['playwright.config.js', 'playwright'],
    ['jest.config.ts', 'jest'],
    ['jest.config.js', 'jest'],
    ['jest.config.json', 'jest'],
    ['.mocharc.yml', 'mocha'],
    ['.mocharc.json', 'mocha'],
  ]

  for (const [file, framework] of configs) {
    if (fs.existsSync(path.join(cwd, file))) {
      return framework
    }
  }

  // Default to vitest
  return 'vitest'
}
