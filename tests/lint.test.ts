import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lint } from '../src/index.js'

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function ruleIds(root: string): string[] {
  return lint(join(fixtures, root)).findings.map((f) => `${f.file}|${f.ruleId}`)
}

describe('clean fixture', () => {
  it('produces no findings', () => {
    const result = lint(join(fixtures, 'clean'))
    // Regression guard: SKILL.md paths resolve relative to the skill's own
    // directory, and bare filenames in skills refer to the user's project.
    expect(result.findings).toEqual([])
    expect(result.summary.filesScanned).toBe(2) // CLAUDE.md + SKILL.md
  })
})

describe('dead-refs fixture', () => {
  const result = lint(join(fixtures, 'dead-refs'))
  it('flags the dead path but not the alive one or placeholders', () => {
    const deadPaths = result.findings.filter((f) => f.ruleId === 'repo/dead-path')
    const messages = deadPaths.map((f) => f.message)
    expect(messages.some((m) => m.includes('src/utils/legacy.ts'))).toBe(true)
    expect(messages.some((m) => m.includes('docs/setup.md'))).toBe(true)
    expect(messages.some((m) => m.includes('lib/**/*.rs'))).toBe(true)
    expect(messages.some((m) => m.includes('src/main.ts'))).toBe(false)
    expect(messages.some((m) => m.includes('path/to'))).toBe(false)
    expect(messages.some((m) => m.includes('your-module'))).toBe(false)
    expect(messages.some((m) => m.includes('src/**/*.ts'))).toBe(false)
  })
  it('flags the dead script', () => {
    const scripts = result.findings.filter((f) => f.ruleId === 'repo/dead-script')
    expect(scripts).toHaveLength(1)
    expect(scripts[0]!.message).toContain('typecheck')
  })
  it('flags the orphan cursor rule but not the alive one', () => {
    const orphans = result.findings.filter((f) => f.ruleId === 'repo/orphan-rule-file')
    expect(orphans).toHaveLength(1)
    expect(orphans[0]!.file).toContain('orphan.mdc')
  })
})

describe('bloated fixture', () => {
  it('warns on size', () => {
    expect(ruleIds('bloated')).toContain('CLAUDE.md|size/bloat')
  })
})

describe('dup fixture', () => {
  it('flags the shared paragraph across files exactly once', () => {
    const dups = lint(join(fixtures, 'dup')).findings.filter((f) => f.ruleId === 'dup/cross-file')
    expect(dups).toHaveLength(1)
    expect(dups[0]!.message).toContain('AGENTS.md')
    expect(dups[0]!.data?.dupTokens).toBeGreaterThan(10)
  })
})

describe('skills-bad fixture', () => {
  const result = lint(join(fixtures, 'skills-bad'))
  it('flags bad name, unknown key, thin description, and missing frontmatter', () => {
    const msgs = result.findings.map((f) => `${f.ruleId}:${f.message}`)
    expect(msgs.some((m) => m.startsWith('skill/frontmatter:') && m.includes('PDF_Tools'))).toBe(true)
    expect(msgs.some((m) => m.includes("unknown frontmatter key 'color'"))).toBe(true)
    expect(msgs.some((m) => m.startsWith('skill/description-quality:'))).toBe(true)
    expect(msgs.some((m) => m.includes('missing YAML frontmatter'))).toBe(true)
  })
})

describe('secrets fixture', () => {
  const result = lint(join(fixtures, 'secrets'))
  it('flags the github token and assignment, redacted', () => {
    const secrets = result.findings.filter((f) => f.ruleId === 'secret/leak')
    expect(secrets.length).toBeGreaterThanOrEqual(2)
    for (const s of secrets) {
      expect(s.message).not.toContain('ghp_abcdefghijklmnopqrstuv0123456789')
      expect(s.message).toContain('…')
    }
  })
  it('does not flag the env-var guidance line', () => {
    const secrets = result.findings.filter((f) => f.ruleId === 'secret/leak')
    expect(secrets.every((f) => f.line !== 7)).toBe(true)
  })
})

describe('traversal fixture (security)', () => {
  it('skips ..-escaping references and only flags the in-repo dead path', () => {
    const deadPaths = lint(join(fixtures, 'traversal')).findings.filter((f) => f.ruleId === 'repo/dead-path')
    expect(deadPaths).toHaveLength(1)
    expect(deadPaths[0]!.message).toContain('src/gone.ts')
  })
})

describe('suppression-forms fixture', () => {
  it('bare disable-next-line suppresses; fenced examples are not directives', () => {
    const deadPaths = lint(join(fixtures, 'suppression-forms')).findings.filter((f) => f.ruleId === 'repo/dead-path')
    expect(deadPaths).toHaveLength(1)
    expect(deadPaths[0]!.message).toContain('src/gone-b.ts')
  })
})

describe('gitignore-semantics fixture', () => {
  it('honors negation re-includes and slash anchoring like git', () => {
    const files = lint(join(fixtures, 'gitignore-semantics')).files
    expect(files).toContain('dist2/keep/CLAUDE.md')
    expect(files).toContain('sub/docs/temp/CLAUDE.md')
    expect(files).not.toContain('docs/temp/CLAUDE.md')
  })
})

describe('cursor-unquoted fixture', () => {
  it('checks unquoted globs (YAML parse error) via raw fallback', () => {
    const orphans = lint(join(fixtures, 'cursor-unquoted')).findings.filter((f) => f.ruleId === 'repo/orphan-rule-file')
    expect(orphans).toHaveLength(1)
    expect(orphans[0]!.message).toContain('*.rsx')
  })
})

describe('ignored-ref fixture', () => {
  it('does not flag paths that exist on disk but are excluded by ignore globs', () => {
    expect(lint(join(fixtures, 'ignored-ref')).findings.filter((f) => f.ruleId === 'repo/dead-path')).toEqual([])
  })
})

describe('suppressed fixture', () => {
  it('honors ctxvet-disable-next-line but only for that line', () => {
    const deadPaths = lint(join(fixtures, 'suppressed')).findings.filter((f) => f.ruleId === 'repo/dead-path')
    expect(deadPaths).toHaveLength(1)
    expect(deadPaths[0]!.message).toContain('src/also-removed.ts')
  })
})

describe('no-package-json fixture', () => {
  const result = lint(join(fixtures, 'no-package-json'))
  it('does not flag npm scripts when there is no package.json', () => {
    expect(result.findings.filter((f) => f.ruleId === 'repo/dead-script')).toEqual([])
  })
  it('flags the vague instruction', () => {
    expect(result.findings.filter((f) => f.ruleId === 'style/vague-instruction')).toHaveLength(1)
  })
})
