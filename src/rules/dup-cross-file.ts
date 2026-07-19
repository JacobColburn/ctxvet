import { estimateTokens, formatTokens } from './size-bloat.js'
import type { ContextFile, Finding, Rule } from '../types.js'

const SHINGLE_SIZE = 8
const OVERLAP_THRESHOLD = 0.7
const MIN_PARAGRAPH_WORDS = 15

interface Paragraph {
  startLine: number
  text: string
  shingles: Set<string>
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function paragraphsOf(file: ContextFile): Paragraph[] {
  const paragraphs: Paragraph[] = []
  let buf: string[] = []
  let start = 0
  const flush = (endIdx: number) => {
    void endIdx
    if (buf.length === 0) return
    const text = buf.join(' ')
    const words = normalizeWords(text)
    if (words.length >= MIN_PARAGRAPH_WORDS) {
      const shingles = new Set<string>()
      for (let i = 0; i + SHINGLE_SIZE <= words.length; i++) {
        shingles.add(words.slice(i, i + SHINGLE_SIZE).join(' '))
      }
      if (shingles.size > 0) paragraphs.push({ startLine: start + 1, text, shingles })
    }
    buf = []
  }
  for (let i = file.bodyStartLine - 1; i < file.lines.length; i++) {
    const line = file.lines[i]!
    if (line.trim() === '') {
      flush(i)
    } else {
      if (buf.length === 0) start = i
      buf.push(line)
    }
  }
  flush(file.lines.length)
  return paragraphs
}

function overlap(a: Set<string>, b: Set<string>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  let shared = 0
  for (const s of small) if (large.has(s)) shared++
  return shared / small.size
}

const paragraphCache = new WeakMap<ContextFile, Paragraph[]>()

function cachedParagraphs(file: ContextFile): Paragraph[] {
  let p = paragraphCache.get(file)
  if (!p) {
    p = paragraphsOf(file)
    paragraphCache.set(file, p)
  }
  return p
}

export const dupCrossFile: Rule = {
  id: 'dup/cross-file',
  defaultSeverity: 'warn',
  docs: {
    summary: 'Near-duplicate content across (or within) context files',
    rationale:
      'A paragraph duplicated between CLAUDE.md and AGENTS.md is paid for twice in every prompt. Detected via 8-word shingle overlap; byte-identical files get a single note instead of per-paragraph noise.',
  },
  check(file, ctx) {
    const findings: Finding[] = []
    const mine = cachedParagraphs(file)

    // Intra-file duplication
    for (let i = 0; i < mine.length; i++) {
      for (let j = i + 1; j < mine.length; j++) {
        const ratio = overlap(mine[i]!.shingles, mine[j]!.shingles)
        if (ratio > OVERLAP_THRESHOLD) {
          const dupTokens = estimateTokens(Buffer.byteLength(mine[j]!.text, 'utf8'))
          findings.push({
            ruleId: this.id,
            severity: 'warn',
            file: file.path,
            line: mine[j]!.startLine,
            message: `paragraph duplicates ${file.path}:${mine[i]!.startLine} in the same file (~${Math.round(ratio * 100)}% overlap, ~${formatTokens(dupTokens)} tokens est.)`,
            data: { dupTokens },
          })
        }
      }
    }

    // Cross-file: compare only against earlier files so each pair reports once.
    for (const other of ctx.files) {
      if (other.path >= file.path) continue
      if (other.text === file.text) {
        findings.push({
          ruleId: this.id,
          severity: 'info',
          file: file.path,
          line: 0,
          message: `byte-identical to ${other.path} — keep one canonical file and import/symlink the other (e.g. a CLAUDE.md containing '@AGENTS.md')`,
          data: { dupTokens: estimateTokens(Buffer.byteLength(file.text, 'utf8')) },
        })
        continue
      }
      const theirs = cachedParagraphs(other)
      for (const p of mine) {
        for (const q of theirs) {
          const ratio = overlap(p.shingles, q.shingles)
          if (ratio > OVERLAP_THRESHOLD) {
            const dupTokens = estimateTokens(Buffer.byteLength(p.text, 'utf8'))
            findings.push({
              ruleId: this.id,
              severity: 'warn',
              file: file.path,
              line: p.startLine,
              message: `paragraph duplicates ${other.path}:${q.startLine} (~${Math.round(ratio * 100)}% overlap, ~${formatTokens(dupTokens)} tokens est.) — you pay for this in both files`,
              data: { dupTokens },
            })
            break // one report per paragraph is enough
          }
        }
      }
    }
    return findings
  },
}
