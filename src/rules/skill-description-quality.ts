import type { Finding, Rule } from '../types.js'

const WHEN_SIGNAL = /\b(when|use (for|this|it|whenever)|trigger|if the user|use when|helps? (with|you))\b/i
const WASTED_PREFIX = /^\s*(this skill|a skill|skill (that|for|to))/i

export const skillDescriptionQuality: Rule = {
  id: 'skill/description-quality',
  defaultSeverity: 'warn',
  docs: {
    summary: 'SKILL.md description unlikely to trigger reliably',
    rationale:
      'The description is the ONLY signal the model sees when deciding whether to load a skill. Too short, no "when to use" cue, or a wasted "This skill…" prefix all measurably hurt triggering. Deterministic heuristics; no LLM judgment.',
    citation: 'https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices',
  },
  check(file) {
    if (file.kind !== 'skill-md' || !file.frontmatter || file.frontmatter.parseError) return []
    const data = file.frontmatter.data
    if (typeof data !== 'object' || data === null) return []
    const description = (data as Record<string, unknown>).description
    if (typeof description !== 'string' || description.trim() === '') return [] // skill/frontmatter covers absence

    const findings: Finding[] = []
    const line = file.frontmatter.startLine
    const push = (message: string) =>
      findings.push({ ruleId: this.id, severity: 'warn', file: file.path, line, message })

    const trimmed = description.trim()
    if (trimmed.length < 50) {
      push(`description is ${trimmed.length} chars — too thin to trigger reliably; say what the skill does AND when to use it`)
    }
    if (!WHEN_SIGNAL.test(trimmed)) {
      push(`description has no "when to use" signal (no 'when', 'use for', 'trigger', 'if the user'…) — the model can't tell when to load it`)
    }
    if (WASTED_PREFIX.test(trimmed)) {
      push(`description starts with '${trimmed.split(/\s+/).slice(0, 2).join(' ')}…' — wasted prefix tokens; lead with what it does`)
    }
    return findings
  },
}
