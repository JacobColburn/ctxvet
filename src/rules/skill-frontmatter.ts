import type { Finding, Rule } from '../types.js'

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const KNOWN_KEYS = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata', 'version'])

export const skillFrontmatter: Rule = {
  id: 'skill/frontmatter',
  defaultSeverity: 'error',
  docs: {
    summary: 'SKILL.md frontmatter violates the Agent Skills spec',
    rationale:
      'Skills are discovered and triggered via frontmatter. A missing or malformed name/description means the skill silently never loads. Constraints follow Anthropic’s skill authoring guidance: kebab-case name ≤64 chars matching the directory, description ≤1024 chars.',
    citation: 'https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices',
  },
  check(file) {
    if (file.kind !== 'skill-md') return []
    const findings: Finding[] = []
    const push = (severity: 'error' | 'warn' | 'info', line: number, message: string) =>
      findings.push({ ruleId: this.id, severity, file: file.path, line, message })

    if (!file.frontmatter) {
      push('error', 1, 'missing YAML frontmatter — a skill without frontmatter is never discovered')
      return findings
    }
    const fm = file.frontmatter
    if (fm.parseError) {
      push('error', fm.startLine, `frontmatter is not valid YAML: ${fm.parseError}`)
      return findings
    }
    if (typeof fm.data !== 'object' || fm.data === null || Array.isArray(fm.data)) {
      push('error', fm.startLine, 'frontmatter must be a YAML mapping (key: value pairs)')
      return findings
    }
    const data = fm.data as Record<string, unknown>

    const name = data.name
    if (typeof name !== 'string' || name.trim() === '') {
      push('error', fm.startLine, "missing 'name' — required for the skill to be discovered")
    } else {
      if (!NAME_RE.test(name)) {
        push('warn', fm.startLine, `name '${name}' should be lowercase letters/digits/hyphens only (kebab-case)`)
      }
      if (name.length > 64) {
        push('warn', fm.startLine, `name is ${name.length} chars — the spec caps it at 64`)
      }
      const segments = file.path.split('/')
      const parentDir = segments.length >= 2 ? segments[segments.length - 2]! : null
      if (parentDir && parentDir !== name) {
        push('warn', fm.startLine, `name '${name}' does not match its directory '${parentDir}' — tools resolve skills by directory name`)
      }
    }

    const description = data.description
    if (typeof description !== 'string' || description.trim() === '') {
      push('error', fm.startLine, "missing 'description' — the description is how the skill gets triggered")
    } else if (description.length > 1024) {
      push('warn', fm.startLine, `description is ${description.length} chars — the spec caps it at 1024`)
    }

    for (const key of Object.keys(data)) {
      if (!KNOWN_KEYS.has(key)) {
        push('info', fm.startLine, `unknown frontmatter key '${key}' — not part of the Agent Skills spec, most tools will ignore it`)
      }
    }
    return findings
  },
}
