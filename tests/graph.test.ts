import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { buildDepGraph } from '../src/graph'
import { findAffectedTests } from '../src/finder'
import { detectFramework } from '../src/detect'

let tmpDir: string

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diff-test-'))

  // Create a mini project structure:
  // src/utils.ts        (imported by src/auth.ts and src/api.ts)
  // src/auth.ts          (imported by src/auth.test.ts)
  // src/api.ts           (imported by src/api.test.ts)
  // src/auth.test.ts     (test file)
  // src/api.test.ts      (test file)
  // src/standalone.test.ts (test file, imports nothing from src)

  fs.mkdirSync(path.join(tmpDir, 'src'))

  fs.writeFileSync(
    path.join(tmpDir, 'src/utils.ts'),
    `export function add(a: number, b: number) { return a + b }\nexport function sub(a: number, b: number) { return a - b }\n`
  )

  fs.writeFileSync(
    path.join(tmpDir, 'src/auth.ts'),
    `import { add } from './utils'\nexport function login() { return add(1, 2) }\n`
  )

  fs.writeFileSync(
    path.join(tmpDir, 'src/api.ts'),
    `import { sub } from './utils'\nexport function fetchData() { return sub(5, 3) }\n`
  )

  fs.writeFileSync(
    path.join(tmpDir, 'src/auth.test.ts'),
    `import { login } from './auth'\ntest('login', () => { expect(login()).toBe(3) })\n`
  )

  fs.writeFileSync(
    path.join(tmpDir, 'src/api.test.ts'),
    `import { fetchData } from './api'\ntest('fetch', () => { expect(fetchData()).toBe(2) })\n`
  )

  fs.writeFileSync(
    path.join(tmpDir, 'src/standalone.test.ts'),
    `test('standalone', () => { expect(1 + 1).toBe(2) })\n`
  )
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('buildDepGraph', () => {
  it('builds reverse dependency graph', () => {
    const graph = buildDepGraph(tmpDir)

    const utilsPath = path.join(tmpDir, 'src/utils.ts')
    const importers = graph.get(utilsPath)

    expect(importers).toBeDefined()
    expect(importers!.size).toBe(2)
    expect(importers!.has(path.join(tmpDir, 'src/auth.ts'))).toBe(true)
    expect(importers!.has(path.join(tmpDir, 'src/api.ts'))).toBe(true)
  })

  it('tracks auth.ts → auth.test.ts dependency', () => {
    const graph = buildDepGraph(tmpDir)
    const authPath = path.join(tmpDir, 'src/auth.ts')
    const importers = graph.get(authPath)

    expect(importers).toBeDefined()
    expect(importers!.has(path.join(tmpDir, 'src/auth.test.ts'))).toBe(true)
  })
})

describe('findAffectedTests', () => {
  it('finds tests affected by a leaf change', () => {
    const graph = buildDepGraph(tmpDir)
    const changed = [path.join(tmpDir, 'src/auth.ts')]
    const affected = findAffectedTests(changed, graph, 'vitest')

    expect(affected).toHaveLength(1)
    expect(affected[0]).toContain('auth.test.ts')
  })

  it('finds ALL tests affected by a shared dependency change', () => {
    const graph = buildDepGraph(tmpDir)
    const changed = [path.join(tmpDir, 'src/utils.ts')]
    const affected = findAffectedTests(changed, graph, 'vitest')

    // utils.ts → auth.ts → auth.test.ts
    // utils.ts → api.ts  → api.test.ts
    expect(affected).toHaveLength(2)
    expect(affected.some((f) => f.includes('auth.test.ts'))).toBe(true)
    expect(affected.some((f) => f.includes('api.test.ts'))).toBe(true)
  })

  it('includes test file if the test itself changed', () => {
    const graph = buildDepGraph(tmpDir)
    const changed = [path.join(tmpDir, 'src/standalone.test.ts')]
    const affected = findAffectedTests(changed, graph, 'vitest')

    expect(affected).toHaveLength(1)
    expect(affected[0]).toContain('standalone.test.ts')
  })

  it('returns empty when no tests are affected', () => {
    const graph = buildDepGraph(tmpDir)
    const changed = [path.join(tmpDir, 'src/nonexistent.ts')]
    const affected = findAffectedTests(changed, graph, 'vitest')

    expect(affected).toHaveLength(0)
  })

  it('does not include unrelated tests', () => {
    const graph = buildDepGraph(tmpDir)
    const changed = [path.join(tmpDir, 'src/api.ts')]
    const affected = findAffectedTests(changed, graph, 'vitest')

    expect(affected).toHaveLength(1)
    expect(affected[0]).toContain('api.test.ts')
    // auth.test.ts should NOT be affected
    expect(affected.some((f) => f.includes('auth.test.ts'))).toBe(false)
  })
})

describe('detectFramework', () => {
  it('detects vitest from package.json', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-'))
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { vitest: '^1.0.0' } })
    )
    expect(detectFramework(dir)).toBe('vitest')
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('detects jest from package.json', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-'))
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { jest: '^29.0.0' } })
    )
    expect(detectFramework(dir)).toBe('jest')
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('detects playwright from package.json', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-'))
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { '@playwright/test': '^1.0.0' } })
    )
    expect(detectFramework(dir)).toBe('playwright')
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('prioritizes vitest over jest', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-'))
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { vitest: '^1.0.0', jest: '^29.0.0' } })
    )
    expect(detectFramework(dir)).toBe('vitest')
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('defaults to vitest when nothing found', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-'))
    expect(detectFramework(dir)).toBe('vitest')
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
