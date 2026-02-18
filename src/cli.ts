#!/usr/bin/env node

import path from 'path'
import { diffTest } from './index'
import type { Framework } from './types'

const HELP = `
diff-test — Only run tests affected by your git changes

Usage:
  npx diff-test [options] [-- ...passthrough]

Options:
  --framework <name>   Test framework: vitest, jest, mocha, playwright (auto-detected)
  --base <ref>         Git ref to diff against (e.g. main, HEAD~3)
  --staged             Only consider staged changes
  --dry-run            Show affected tests without running them
  --cwd <path>         Project root directory
  --help               Show this help

Examples:
  npx diff-test                          # auto-detect framework, run affected tests
  npx diff-test --framework vitest       # use vitest explicitly
  npx diff-test --base main              # tests affected since branching from main
  npx diff-test --staged                 # tests affected by staged changes only
  npx diff-test --dry-run                # just list affected test files
  npx diff-test -- --reporter verbose    # pass args through to test framework
`

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {}
  const passthrough: string[] = []
  let i = 0

  while (i < argv.length) {
    const arg = argv[i]

    if (arg === '--') {
      passthrough.push(...argv.slice(i + 1))
      break
    }

    if (arg === '--help' || arg === '-h') {
      args.help = true
    } else if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--staged') {
      args.staged = true
    } else if (arg === '--framework' && argv[i + 1]) {
      args.framework = argv[++i]
    } else if (arg === '--base' && argv[i + 1]) {
      args.base = argv[++i]
    } else if (arg === '--cwd' && argv[i + 1]) {
      args.cwd = argv[++i]
    }

    i++
  }

  return { args, passthrough }
}

async function main() {
  const { args, passthrough } = parseArgs(process.argv.slice(2))

  if (args.help) {
    console.log(HELP)
    process.exit(0)
  }

  const framework = args.framework as Framework | undefined
  if (framework && !['vitest', 'jest', 'mocha', 'playwright'].includes(framework)) {
    console.error(`Unknown framework: ${framework}`)
    console.error('Supported: vitest, jest, mocha, playwright')
    process.exit(1)
  }

  try {
    const result = await diffTest({
      framework,
      base: args.base as string | undefined,
      staged: args.staged === true,
      cwd: args.cwd ? path.resolve(args.cwd as string) : undefined,
      dryRun: args.dryRun === true,
      passthrough,
    })

    if (result.changedFiles.length === 0) {
      console.log('No changes detected.')
      process.exit(0)
    }

    console.log(`Changed files: ${result.changedFiles.length}`)
    console.log(`Affected tests: ${result.affectedTests.length}`)

    if (result.affectedTests.length === 0) {
      console.log('No test files affected by changes.')
      process.exit(0)
    }

    if (args.dryRun) {
      console.log('\nAffected test files:')
      for (const f of result.affectedTests) {
        const rel = args.cwd ? path.relative(args.cwd as string, f) : f
        console.log(`  ${rel}`)
      }
      process.exit(0)
    }

    process.exit(result.exitCode ?? 0)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`Error: ${msg}`)
    process.exit(1)
  }
}

main()
