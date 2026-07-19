import { parse as parseYaml } from 'yaml'
import type { CodeSpan, ContextFile, FileKind, Frontmatter, LinkRef } from './types.js'

const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/
const CODE_SPAN_RE = /`([^`\n]+)`/g
const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s[^)]*)?\)/g

/** Split text into lines and mark which lines are inside (or delimit) fenced code blocks. */
export function markFences(lines: string[]): boolean[] {
  const inFence: boolean[] = new Array(lines.length).fill(false)
  let open: { char: string; len: number } | null = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const m = FENCE_RE.exec(line)
    if (m) {
      const marker = m[1]!
      if (open === null) {
        open = { char: marker[0]!, len: marker.length }
        inFence[i] = true
        continue
      }
      // CommonMark: a fence closes only on the same char at >= opening length
      if (marker[0] === open.char && marker.length >= open.len) {
        inFence[i] = true
        open = null
        continue
      }
    }
    inFence[i] = open !== null
  }
  return inFence
}

/** Extract YAML frontmatter when the file starts with `---`. */
export function extractFrontmatter(lines: string[]): Frontmatter | null {
  if (lines.length === 0 || lines[0]!.trim() !== '---') return null
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]!.trim() === '---' || lines[i]!.trim() === '...') {
      const raw = lines.slice(1, i).join('\n')
      let data: unknown = null
      let parseError: string | null = null
      try {
        data = parseYaml(raw)
      } catch (e) {
        parseError = e instanceof Error ? e.message.split('\n')[0]! : String(e)
      }
      return { raw, data, parseError, startLine: 1, endLine: i + 1 }
    }
  }
  return null
}

export function extractCodeSpans(lines: string[], inFence: boolean[], bodyStartLine: number): CodeSpan[] {
  const spans: CodeSpan[] = []
  for (let i = bodyStartLine - 1; i < lines.length; i++) {
    if (inFence[i]) continue
    const line = lines[i]!
    CODE_SPAN_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = CODE_SPAN_RE.exec(line)) !== null) {
      spans.push({ line: i + 1, col: m.index + 1, text: m[1]! })
    }
  }
  return spans
}

export function extractLinks(lines: string[], inFence: boolean[], bodyStartLine: number): LinkRef[] {
  const links: LinkRef[] = []
  for (let i = bodyStartLine - 1; i < lines.length; i++) {
    if (inFence[i]) continue
    const line = lines[i]!
    LINK_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = LINK_RE.exec(line)) !== null) {
      links.push({ line: i + 1, col: m.index, target: m[1]! })
    }
  }
  return links
}

export function parseContextFile(path: string, absPath: string, kind: FileKind, text: string): ContextFile {
  const lines = text.split(/\r\n|\r|\n/)
  // A trailing newline is a line terminator, not an extra (empty) line.
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  const inFence = markFences(lines)
  const frontmatter = extractFrontmatter(lines)
  const bodyStartLine = frontmatter ? frontmatter.endLine + 1 : 1
  return {
    path,
    absPath,
    kind,
    text,
    lines,
    inFence,
    frontmatter,
    bodyStartLine,
    codeSpans: extractCodeSpans(lines, inFence, bodyStartLine),
    links: extractLinks(lines, inFence, bodyStartLine),
  }
}
