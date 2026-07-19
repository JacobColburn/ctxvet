import type { Finding, Rule } from '../types.js'

/** Extensions that make a slash-less token still look like a file reference. */
const KNOWN_EXTENSIONS =
  /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|mdx|mdc|yml|yaml|toml|py|rb|go|rs|java|kt|c|h|cpp|hpp|cs|sh|bash|ps1|sql|css|scss|html|vue|svelte|txt|env|lock|prisma|graphql|proto)$/i

/** Placeholder shapes that must never be flagged. */
const PLACEHOLDER =
  /(<|>|\{|\}|\$|path\/to|your[-_]|foo\/bar|example\.|\.\.\.|\/etc\/|\/usr\/|\/tmp\b|^~|^[a-z]:|[A-Za-z]Here(\.|\/|$))/i

/** Files that are intentionally absent from a fresh clone (user-created, gitignored). */
const INTENTIONALLY_ABSENT = /^\.env(\..+)?$|(^|\/)(\.env(\..+)?|node_modules|dist|build)(\/|$)/

const PATH_SHAPE = /^[\w.@-][\w./@-]*$/

function normalize(token: string): string {
  return token.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
}

export function isPathCandidate(raw: string): string | null {
  const token = normalize(raw.trim())
  if (token.length < 3 || token.length > 200) return null
  if (/\s/.test(token)) return null
  if (/:\/\//.test(token) || /^(https?|mailto|file):/i.test(token)) return null
  if (PLACEHOLDER.test(raw) || PLACEHOLDER.test(token)) return null
  // globs are handled by the caller via globMatches
  if (token.includes('*') || token.includes('?')) {
    // Reject pathological globs before they reach the matcher (ReDoS guard):
    // real rule globs have few `**` segments.
    if ((token.match(/\*\*/g) ?? []).length > 3) return null
    return token.includes('/') || KNOWN_EXTENSIONS.test(token.replace(/\*/g, 'x')) ? token : null
  }
  if (!PATH_SHAPE.test(token)) return null
  // require a slash or a known extension — bare words like `main` are not path references
  if (!token.includes('/') && !KNOWN_EXTENSIONS.test(token)) return null
  // dotted identifiers like `package.json.scripts` or version strings are not paths
  if (!token.includes('/') && token.split('.').length > 2) return null
  return token
}

/**
 * Collapse `.` and `..` segments in a repo-relative path. Returns null when the
 * path escapes above the repo root — such a reference points outside the
 * scanned tree and must never reach existsSync (path-traversal oracle guard).
 */
export function normalizeSegments(path: string): string | null {
  const out: string[] = []
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') {
      if (out.length === 0) return null // escapes the repo root
      out.pop()
      continue
    }
    out.push(seg)
  }
  return out.join('/')
}

export const repoDeadPath: Rule = {
  id: 'repo/dead-path',
  defaultSeverity: 'warn',
  docs: {
    summary: 'Referenced path does not exist in this repo',
    rationale:
      'Context files rot: a path mentioned in CLAUDE.md that no longer exists sends the agent hunting for a file that is not there. This is provable staleness — checked against the actual repo file tree.',
  },
  check(file, ctx) {
    const findings: Finding[] = []
    const seen = new Set<string>()

    const candidates: Array<{ line: number; token: string; raw: string }> = []
    for (const span of file.codeSpans) {
      candidates.push({ line: span.line, token: span.text, raw: span.text })
    }
    for (const link of file.links) {
      const target = link.target.split('#')[0]!
      if (!target) continue
      candidates.push({ line: link.line, token: target, raw: link.target })
    }

    const fileDir = file.path.split('/').slice(0, -1).join('/')
    // A SKILL.md describes work in the USER'S project as often as in its own
    // bundle — only slash-containing references are checkable there.
    const isSkill = file.kind === 'skill-md'

    for (const { line, token: rawToken } of candidates) {
      const token = isPathCandidate(rawToken)
      if (!token) continue
      if (isSkill && !token.includes('/')) continue
      if (INTENTIONALLY_ABSENT.test(token)) continue
      // A bare filename is usually a pattern reference ("each module has a
      // service.py") — alive if any file with that basename exists anywhere.
      if (!token.includes('/') && ctx.hasBasename(token)) continue
      const key = `${line}:${token}`
      if (seen.has(key)) continue
      seen.add(key)

      // References are legal relative to the file's own directory OR the root.
      // Both are normalized; a path escaping the repo root becomes null and is
      // never probed on disk (traversal-oracle guard).
      const rootRelative = normalizeSegments(token)
      const dirRelative = fileDir ? normalizeSegments(`${fileDir}/${token}`) : null
      if (rootRelative === null && dirRelative === null) continue

      if (token.includes('*') || token.includes('?')) {
        if (isSkill && !fileDir) continue
        const alive =
          (rootRelative !== null && ctx.globMatches(rootRelative)) ||
          (dirRelative !== null && ctx.globMatches(dirRelative))
        if (!alive) {
          findings.push({
            ruleId: this.id,
            severity: 'warn',
            file: file.path,
            line,
            message: `glob '${token}' matches no files in this repo`,
          })
        }
        continue
      }
      // Extension-less tokens (e.g. `repo/dead-path`, route patterns, rule ids)
      // are only treated as paths when anchored in a real directory.
      if (!KNOWN_EXTENSIONS.test(token)) {
        const firstSegment = (rootRelative ?? '').split('/')[0]!
        const anchored =
          ctx.repoDirs.has(firstSegment) || (fileDir !== '' && ctx.hasPath(`${fileDir}/${firstSegment}`))
        if (!anchored) continue
      }
      const alive =
        (rootRelative !== null && ctx.hasPath(rootRelative)) || (dirRelative !== null && ctx.hasPath(dirRelative))
      if (!alive) {
        findings.push({
          ruleId: this.id,
          severity: 'warn',
          file: file.path,
          line,
          message: `'${token}' does not exist in this repo (checked from the repo root and from ${fileDir || 'the file'}/)`,
        })
      }
    }
    return findings
  },
}
