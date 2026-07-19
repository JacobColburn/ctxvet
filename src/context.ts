import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { discoverTargets, snapshotRepo } from './discover.js'
import { globMatchesAny } from './glob.js'
import { parseContextFile } from './parse.js'
import type { ContextFile, LintContext, ResolvedConfig } from './types.js'

function collectPackageScripts(root: string, repoFiles: Set<string>): { scripts: Set<string>; hasPackageJson: boolean } {
  const scripts = new Set<string>()
  let hasPackageJson = false
  for (const path of repoFiles) {
    if (path !== 'package.json' && !path.endsWith('/package.json')) continue
    hasPackageJson = true
    try {
      const parsed = JSON.parse(readFileSync(join(root, path), 'utf8')) as { scripts?: Record<string, unknown> }
      for (const name of Object.keys(parsed.scripts ?? {})) scripts.add(name)
    } catch {
      // unreadable/invalid package.json: skip, never crash the lint
    }
  }
  return { scripts, hasPackageJson }
}

const MAKE_TARGET_RE = /^([A-Za-z0-9][A-Za-z0-9_./-]*)\s*:(?!=)/

function collectMakeTargets(root: string, repoFiles: Set<string>): Set<string> {
  const targets = new Set<string>()
  for (const name of ['Makefile', 'makefile', 'GNUmakefile']) {
    if (!repoFiles.has(name)) continue
    try {
      for (const line of readFileSync(join(root, name), 'utf8').split(/\r?\n/)) {
        const m = MAKE_TARGET_RE.exec(line)
        if (m && m[1] !== '.PHONY') targets.add(m[1]!)
      }
    } catch {
      // ignore
    }
  }
  return targets
}

function deriveDirs(repoFiles: Set<string>): Set<string> {
  const dirs = new Set<string>()
  for (const file of repoFiles) {
    let idx = file.indexOf('/')
    while (idx !== -1) {
      dirs.add(file.slice(0, idx))
      idx = file.indexOf('/', idx + 1)
    }
  }
  return dirs
}

export function buildContext(root: string, config: ResolvedConfig): LintContext {
  const normalizedRoot = root.replace(/\\/g, '/')
  const { targets } = discoverTargets(normalizedRoot, config.ignore)
  const repoFiles = snapshotRepo(normalizedRoot, config.ignore)
  const repoDirs = deriveDirs(repoFiles)
  const { scripts: packageScripts, hasPackageJson } = collectPackageScripts(normalizedRoot, repoFiles)
  const makeTargets = collectMakeTargets(normalizedRoot, repoFiles)

  const basenames = new Set<string>()
  for (const f of repoFiles) basenames.add(f.slice(f.lastIndexOf('/') + 1))

  // A context file over this size is pathological (or hostile) — skip reading
  // it whole into memory. Real context files are kilobytes, not megabytes.
  const MAX_FILE_BYTES = 5_000_000

  const files: ContextFile[] = []
  for (const [path, kind] of targets) {
    const abs = join(normalizedRoot, path)
    try {
      if (statSync(abs).size > MAX_FILE_BYTES) continue
    } catch {
      continue
    }
    let text: string
    try {
      text = readFileSync(abs, 'utf8')
    } catch {
      continue
    }
    files.push(parseContextFile(path, `${normalizedRoot}/${path}`, kind, text))
  }
  files.sort((a, b) => a.path.localeCompare(b.path))

  return {
    root: normalizedRoot,
    files,
    repoFiles,
    repoDirs,
    packageScripts,
    hasPackageJson,
    makeTargets,
    config,
    hasPath(p: string): boolean {
      const clean = p.replace(/^\.\//, '').replace(/\/+$/, '')
      if (repoFiles.has(clean) || repoDirs.has(clean)) return true
      // Defense in depth: never touch the filesystem outside the repo root.
      if (clean === '..' || clean.startsWith('../') || clean.includes('/../') || clean.startsWith('/')) {
        return false
      }
      // The snapshot excludes ignored globs, but an ignored path still exists —
      // "dead" means gone from disk, not merely unscanned.
      return existsSync(join(normalizedRoot, clean))
    },
    hasBasename(name: string): boolean {
      return basenames.has(name)
    },
    globMatches(pattern: string): boolean {
      return globMatchesAny(pattern, repoFiles)
    },
  }
}
