/**
 * Minimal glob-to-regex conversion used to test patterns against the in-memory
 * repo snapshot (no filesystem rescan). Supports: **, *, ?, {a,b}, character
 * classes, and leading-`/` anchoring. Good enough for `.cursor/rules` globs and
 * path-aliveness checks; not a full micromatch replacement.
 */
export function globToRegExp(pattern: string): RegExp {
  let p = pattern.trim()
  if (p.startsWith('./')) p = p.slice(2)
  if (p.startsWith('/')) p = p.slice(1)
  // A bare directory-style pattern matches everything beneath it.
  if (p.endsWith('/')) p += '**'

  let re = ''
  let i = 0
  while (i < p.length) {
    const c = p[i]!
    if (c === '*') {
      if (p[i + 1] === '*') {
        // `**` and `**/` match any depth (including none)
        if (p[i + 2] === '/') {
          re += '(?:.*/)?'
          i += 3
        } else {
          re += '.*'
          i += 2
        }
      } else {
        re += '[^/]*'
        i += 1
      }
    } else if (c === '?') {
      re += '[^/]'
      i += 1
    } else if (c === '{') {
      const end = p.indexOf('}', i)
      if (end === -1) {
        re += '\\{'
        i += 1
      } else {
        const alts = p
          .slice(i + 1, end)
          .split(',')
          .map((a) => a.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'))
        re += `(?:${alts.join('|')})`
        i = end + 1
      }
    } else if (c === '[') {
      const end = p.indexOf(']', i)
      if (end === -1) {
        re += '\\['
        i += 1
      } else {
        re += p.slice(i, end + 1)
        i = end + 1
      }
    } else {
      re += c.replace(/[.+^$()|\\]/g, '\\$&')
      i += 1
    }
  }
  // A pattern with no slash (e.g. `*.ts`) conventionally matches at any depth.
  const anchored = p.includes('/') ? re : `(?:.*/)?${re}`
  return new RegExp(`^${anchored}$`)
}

export function globMatchesAny(pattern: string, paths: Iterable<string>): boolean {
  let re: RegExp
  try {
    re = globToRegExp(pattern)
  } catch {
    return true // unparseable pattern: assume alive rather than false-positive
  }
  for (const path of paths) {
    if (re.test(path)) return true
  }
  return false
}
