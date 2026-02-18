import { describe, it, expect } from 'vitest'
import { buildCommand } from '../src/runner'

describe('buildCommand', () => {
  const cwd = '/project'
  const files = ['/project/src/auth.test.ts', '/project/src/api.test.ts']

  it('builds vitest command', () => {
    const cmd = buildCommand('vitest', files, cwd)
    expect(cmd).toBe('npx vitest run src/auth.test.ts src/api.test.ts')
  })

  it('builds jest command', () => {
    const cmd = buildCommand('jest', files, cwd)
    expect(cmd).toBe('npx jest src/auth.test.ts src/api.test.ts')
  })

  it('builds mocha command', () => {
    const cmd = buildCommand('mocha', files, cwd)
    expect(cmd).toBe('npx mocha src/auth.test.ts src/api.test.ts')
  })

  it('builds playwright command', () => {
    const cmd = buildCommand('playwright', files, cwd)
    expect(cmd).toBe('npx playwright test src/auth.test.ts src/api.test.ts')
  })

  it('passes through extra args', () => {
    const cmd = buildCommand('vitest', files, cwd, ['--reporter', 'verbose'])
    expect(cmd).toBe('npx vitest run src/auth.test.ts src/api.test.ts --reporter verbose')
  })
})
