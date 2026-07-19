import fg from 'fast-glob'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { FileKind } from './types.js'

/** Discovery patterns per file kind. All matching is repo-relative, forward slashes. */
const KIND_PATTERNS: Array<{ kind: FileKind; patterns: string[] }> = [
  { kind: 'claude-md', patterns: ['**/CLAUDE.md', '**/CLAUDE.local.md'] },
  { kind: 'agents-md', patterns: ['**/AGENTS.md'] },
  { kind: 'gemini-md', patterns: ['**/GEMINI.md'] },
  { kind: 'copilot-instructions', patterns: ['**/.github/copilot-instructions.md'] },
  { kind: 'windsurfrules', patterns: ['**/.windsurfrules'] },
  { kind: 'cursor-rule', patterns: ['**/.cursor/rules/**/*.mdc', '**/.cursorrules'] },
  { kind: 'skill-md', patterns: ['**/SKILL.md'] },
]

export const ALWAYS_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.venv/**',
  '**/venv/**',
]

/** Best-effort conversion of root .gitignore lines to ignore globs. */
export function gitignoreGlobs(root: string): string[] {
  let text: string
  try {
    text = readFileSync(join(root, '.gitignore'), 'utf8')
  } catch {
    return []
  }
  const globs: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('!')) continue
    let g = line
    if (g.endsWith('/')) g = g.slice(0, -1)
    if (g.startsWith('/')) {
      globs.push(`${g.slice(1)}`, `${g.slice(1)}/**`)
    } else {
      globs.push(`**/${g}`, `**/${g}/**`)
    }
  }
  return globs
}

export interface Discovered {
  /** repo-relative path -> kind */
  targets: Map<string, FileKind>
}

export function discoverTargets(root: string, extraIgnore: string[]): Discovered {
  const ignore = [...ALWAYS_IGNORE, ...gitignoreGlobs(root), ...extraIgnore]
  const targets = new Map<string, FileKind>()
  for (const { kind, patterns } of KIND_PATTERNS) {
    const found = fg.sync(patterns, { cwd: root, ignore, dot: true, onlyFiles: true })
    for (const path of found) {
      if (!targets.has(path)) targets.set(path, kind)
    }
  }
  return { targets }
}

/** Snapshot every repo file path (for repo-grounded rules). */
export function snapshotRepo(root: string, extraIgnore: string[]): Set<string> {
  const ignore = [...ALWAYS_IGNORE, ...gitignoreGlobs(root), ...extraIgnore]
  const files = fg.sync(['**/*'], { cwd: root, ignore, dot: true, onlyFiles: true })
  return new Set(files)
}
