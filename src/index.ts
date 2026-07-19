import { buildContext } from './context.js'
import { loadConfig } from './config.js'
import { ALL_RULES } from './rules/index.js'
import { estimateTokens } from './rules/size-bloat.js'
import type { ContextFile, Finding, LintResult, ResolvedConfig, Severity } from './types.js'

export { ConfigError, DEFAULT_CONFIG, loadConfig } from './config.js'
export { ALL_RULES } from './rules/index.js'
export type * from './types.js'

const DISABLE_LINE_RE = /ctxvet-disable-next-line((?:\s+[\w/-]+)*)/
const DISABLE_FILE_RE = /ctxvet-disable-file((?:\s+[\w/-]+)*)/

function idsFrom(match: string | undefined): Set<string> | 'all' {
  const ids = (match ?? '').trim().split(/\s+/).filter(Boolean)
  return ids.length === 0 ? 'all' : new Set(ids)
}

/** Apply `ctxvet-disable-next-line` / `ctxvet-disable-file` suppression comments. */
export function applySuppressions(findings: Finding[], files: ContextFile[]): Finding[] {
  const byPath = new Map(files.map((f) => [f.path, f]))
  return findings.filter((finding) => {
    const file = byPath.get(finding.file)
    if (!file) return true
    // file-level: look in the first 5 lines
    for (let i = 0; i < Math.min(5, file.lines.length); i++) {
      const m = DISABLE_FILE_RE.exec(file.lines[i]!)
      if (m) {
        const ids = idsFrom(m[1])
        if (ids === 'all' || ids.has(finding.ruleId)) return false
      }
    }
    // line-level: the line directly above the finding
    if (finding.line >= 2) {
      const m = DISABLE_LINE_RE.exec(file.lines[finding.line - 2] ?? '')
      if (m) {
        const ids = idsFrom(m[1])
        if (ids === 'all' || ids.has(finding.ruleId)) return false
      }
    }
    return true
  })
}

export interface LintOptions {
  /** override loaded config entirely (tests) */
  config?: ResolvedConfig
}

export function lint(root: string, options: LintOptions = {}): LintResult {
  const config = options.config ?? loadConfig(root)
  const ctx = buildContext(root, config)

  let findings: Finding[] = []
  for (const file of ctx.files) {
    for (const rule of ALL_RULES) {
      const override = config.rules[rule.id]
      if (override === 'off') continue
      let ruleFindings: Finding[]
      try {
        ruleFindings = rule.check(file, ctx)
      } catch {
        continue // a broken rule must never take down the lint run
      }
      if (override) {
        ruleFindings = ruleFindings.map((f) => ({ ...f, severity: override as Severity }))
      }
      findings.push(...ruleFindings)
    }
  }

  findings = applySuppressions(findings, ctx.files)
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.ruleId.localeCompare(b.ruleId))

  const totalBytes = ctx.files.reduce((sum, f) => sum + Buffer.byteLength(f.text, 'utf8'), 0)
  const estDupTokens = findings
    .filter((f) => f.ruleId === 'dup/cross-file')
    .reduce((sum, f) => sum + (typeof f.data?.dupTokens === 'number' ? f.data.dupTokens : 0), 0)

  return {
    findings,
    files: ctx.files.map((f) => f.path),
    summary: {
      filesScanned: ctx.files.length,
      errors: findings.filter((f) => f.severity === 'error').length,
      warnings: findings.filter((f) => f.severity === 'warn').length,
      infos: findings.filter((f) => f.severity === 'info').length,
      estTokens: estimateTokens(totalBytes),
      estDupTokens,
    },
  }
}
