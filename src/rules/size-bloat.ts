import type { Finding, Rule } from '../types.js'

/** bytes/4 heuristic; always labeled an estimate in output */
export function estimateTokens(bytes: number): number {
  return Math.round(bytes / 4)
}

export function formatTokens(tokens: number): string {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens)
}

export const sizeBloat: Rule = {
  id: 'size/bloat',
  defaultSeverity: 'warn',
  docs: {
    summary: 'Context file exceeds size thresholds',
    rationale:
      'Every line of a context file is prepended to every agent turn. The ETH Zurich study found context bloat reduces task success while raising inference cost; Anthropic guidance caps SKILL.md bodies at 500 lines.',
    citation: 'https://arxiv.org/abs/2602.11988',
  },
  check(file, ctx) {
    const findings: Finding[] = []
    const { size } = ctx.config
    const bytes = Buffer.byteLength(file.text, 'utf8')
    const lineCount = file.lines.length
    const tokens = formatTokens(estimateTokens(bytes))
    const kb = (bytes / 1000).toFixed(1)

    if (file.kind === 'skill-md') {
      const bodyLines = file.lines.length - (file.bodyStartLine - 1)
      if (bodyLines > size.skillWarnLines) {
        findings.push({
          ruleId: this.id,
          severity: 'warn',
          file: file.path,
          line: 0,
          message: `SKILL.md body is ${bodyLines} lines (~${tokens} tokens est.) — Anthropic guidance caps skill bodies at ${size.skillWarnLines} lines; move detail into referenced files`,
        })
      }
      return findings
    }

    if (lineCount > size.errorLines || bytes > size.errorBytes) {
      findings.push({
        ruleId: this.id,
        severity: 'error',
        file: file.path,
        line: 0,
        message: `${lineCount} lines / ${kb}KB (~${tokens} tokens est.) — exceeds the error threshold (${size.errorLines} lines / ${size.errorBytes / 1000}KB); this is loaded on every agent turn`,
      })
    } else if (lineCount > size.warnLines || bytes > size.warnBytes) {
      findings.push({
        ruleId: this.id,
        severity: 'warn',
        file: file.path,
        line: 0,
        message: `${lineCount} lines / ${kb}KB (~${tokens} tokens est.) — exceeds the warn threshold (${size.warnLines} lines / ${size.warnBytes / 1000}KB); research links context bloat to lower task success`,
      })
    }
    return findings
  },
}
