import { execSync } from 'child_process'
import path from 'path'

/** Get the git repository root. */
export function getGitRoot(cwd?: string): string {
  return execSync('git rev-parse --show-toplevel', {
    cwd,
    encoding: 'utf-8',
  }).trim()
}

/** Get files changed in git diff. */
export function getChangedFiles(options: {
  base?: string
  staged?: boolean
  cwd?: string
}): string[] {
  const { base, staged, cwd } = options
  const root = getGitRoot(cwd)
  const files = new Set<string>()

  if (base) {
    // Diff against a branch/commit
    const output = execSync(`git diff --name-only ${base}`, {
      cwd: root,
      encoding: 'utf-8',
    })
    for (const f of output.trim().split('\n')) {
      if (f) files.add(path.resolve(root, f))
    }
  } else if (staged) {
    // Only staged changes
    const output = execSync('git diff --cached --name-only', {
      cwd: root,
      encoding: 'utf-8',
    })
    for (const f of output.trim().split('\n')) {
      if (f) files.add(path.resolve(root, f))
    }
  } else {
    // Staged + unstaged + untracked
    const staged = execSync('git diff --cached --name-only', {
      cwd: root,
      encoding: 'utf-8',
    })
    const unstaged = execSync('git diff --name-only', {
      cwd: root,
      encoding: 'utf-8',
    })
    const untracked = execSync('git ls-files --others --exclude-standard', {
      cwd: root,
      encoding: 'utf-8',
    })

    for (const output of [staged, unstaged, untracked]) {
      for (const f of output.trim().split('\n')) {
        if (f) files.add(path.resolve(root, f))
      }
    }
  }

  return [...files]
}
