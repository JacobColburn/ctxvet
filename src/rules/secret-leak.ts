import type { Finding, Rule } from '../types.js'

/** Vendor-prefixed patterns only — entropy-only matching is deliberately excluded (too noisy). */
const SECRET_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'Anthropic API key', re: /sk-ant-[A-Za-z0-9_-]{10,}/g },
  { name: 'OpenAI-style API key', re: /sk-(?!ant-)[A-Za-z0-9_-]{20,}/g },
  { name: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{20,}/g },
  { name: 'GitHub fine-grained token', re: /github_pat_[A-Za-z0-9_]{20,}/g },
  { name: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'Slack token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'private key block', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
]

const ASSIGNMENT_RE =
  /\b(api[_-]?key|access[_-]?token|auth[_-]?token|secret|password)\b["']?\s*[:=]\s*["']?([A-Za-z0-9+/_-]{16,})/gi

const PLACEHOLDER_VALUE = /(xxx|your|<|example|placeholder|changeme|123456|abcdef|\.\.\.|\bENV\b|process\.env|\$\{)/i

function redact(value: string): string {
  return `${value.slice(0, 6)}… (${value.length} chars)`
}

export const secretLeak: Rule = {
  id: 'secret/leak',
  defaultSeverity: 'error',
  docs: {
    summary: 'Secret-looking value in a context file',
    rationale:
      'Context files are read into every agent conversation and usually committed. A credential here is a credential in your git history and in every prompt. Only high-precision vendor-prefixed patterns are matched.',
  },
  check(file) {
    const findings: Finding[] = []
    for (let i = 0; i < file.lines.length; i++) {
      const line = file.lines[i]!
      for (const { name, re } of SECRET_PATTERNS) {
        re.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = re.exec(line)) !== null) {
          findings.push({
            ruleId: this.id,
            severity: 'error',
            file: file.path,
            line: i + 1,
            message: `possible ${name}: ${redact(m[0])} — move it to an env var and rotate it`,
          })
        }
      }
      ASSIGNMENT_RE.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = ASSIGNMENT_RE.exec(line)) !== null) {
        const value = m[2]!
        if (PLACEHOLDER_VALUE.test(line)) continue
        if (new Set(value).size < 6) continue // low variety = placeholder, not a credential
        findings.push({
          ruleId: this.id,
          severity: 'error',
          file: file.path,
          line: i + 1,
          message: `possible hardcoded ${m[1]!.toLowerCase()}: ${redact(value)} — move it to an env var and rotate it`,
        })
      }
    }
    return findings
  },
}
