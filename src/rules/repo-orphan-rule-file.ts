import type { Finding, Rule } from '../types.js'

function globsFromFrontmatter(data: unknown): string[] | null {
  if (typeof data !== 'object' || data === null) return null
  const fm = data as Record<string, unknown>
  const raw = fm.globs
  if (raw === undefined || raw === null) return null
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean)
  }
  if (Array.isArray(raw)) {
    return raw.filter((g): g is string => typeof g === 'string' && g.trim() !== '').map((g) => g.trim())
  }
  return null
}

export const repoOrphanRuleFile: Rule = {
  id: 'repo/orphan-rule-file',
  defaultSeverity: 'warn',
  docs: {
    summary: 'Cursor rule file can never fire',
    rationale:
      'A `.cursor/rules/*.mdc` file whose `globs:` patterns match zero files in the repo is dead weight — the rule is scoped to files that do not exist.',
  },
  check(file, ctx) {
    if (file.kind !== 'cursor-rule' || !file.frontmatter) return []
    const fm = file.frontmatter.data
    if (typeof fm === 'object' && fm !== null && (fm as Record<string, unknown>).alwaysApply === true) return []
    let globs = globsFromFrontmatter(fm)
    // Cursor's common unquoted form (`globs: *.tsx`) is a YAML alias parse
    // error — fall back to reading the raw line so the rule still works.
    if (file.frontmatter.parseError) {
      if (/^alwaysApply:\s*true/m.test(file.frontmatter.raw)) return []
      const m = /^globs:\s*(.+)$/m.exec(file.frontmatter.raw)
      if (m) {
        globs = m[1]!
          .split(',')
          .map((g) => g.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean)
      }
    }
    if (!globs || globs.length === 0) return []
    const alive = globs.some((g) => ctx.globMatches(g))
    if (alive) return []
    return [
      {
        ruleId: this.id,
        severity: 'warn',
        file: file.path,
        line: file.frontmatter.startLine,
        message: `globs [${globs.join(', ')}] match no files in this repo — this rule can never fire`,
      },
    ]
  },
}
