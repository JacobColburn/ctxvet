import { describe, expect, it } from 'vitest'
import { stripJsonComments } from '../src/config.js'
import { globToRegExp } from '../src/glob.js'
import { markFences, extractFrontmatter, parseContextFile } from '../src/parse.js'
import { isPathCandidate, normalizeSegments } from '../src/rules/repo-dead-path.js'
import { renderTerminal } from '../src/report/terminal.js'

describe('markFences', () => {
  it('marks fenced lines including delimiters', () => {
    const lines = ['a', '```ts', 'code', '```', 'b']
    expect(markFences(lines)).toEqual([false, true, true, true, false])
  })
  it('handles unclosed fences', () => {
    expect(markFences(['```', 'x'])).toEqual([true, true])
  })
  it('a 4-backtick fence is not closed by an inner 3-backtick fence (CommonMark)', () => {
    const lines = ['````md', '```', 'inner `src/x.ts`', '```', '````', 'after']
    expect(markFences(lines)).toEqual([true, true, true, true, true, false])
  })
  it('a ``` fence is not closed by ~~~', () => {
    expect(markFences(['```', '~~~', 'x', '```'])).toEqual([true, true, true, true])
  })
})

describe('parseContextFile line counting', () => {
  it('does not count a trailing newline as an extra line', () => {
    const f = parseContextFile('CLAUDE.md', '/x/CLAUDE.md', 'claude-md', 'a\nb\nc\n')
    expect(f.lines).toHaveLength(3)
  })
})

describe('extractFrontmatter', () => {
  it('parses valid yaml frontmatter', () => {
    const fm = extractFrontmatter(['---', 'name: x', '---', 'body'])
    expect(fm?.data).toEqual({ name: 'x' })
    expect(fm?.endLine).toBe(3)
  })
  it('returns null when absent', () => {
    expect(extractFrontmatter(['# title'])).toBeNull()
  })
  it('captures parse errors without throwing', () => {
    const fm = extractFrontmatter(['---', ': {{bad', '---'])
    expect(fm?.parseError).toBeTruthy()
  })
})

describe('parseContextFile extraction', () => {
  it('extracts code spans and links outside fences', () => {
    const f = parseContextFile('CLAUDE.md', '/x/CLAUDE.md', 'claude-md', 'See `src/a.ts` and [docs](docs/x.md)\n```\n`ignored/in.fence`\n```\n')
    expect(f.codeSpans.map((s) => s.text)).toEqual(['src/a.ts'])
    expect(f.links.map((l) => l.target)).toEqual(['docs/x.md'])
  })
})

describe('globToRegExp', () => {
  const cases: Array<[string, string, boolean]> = [
    ['src/[!a]*.ts', 'src/b1.ts', true],
    ['src/[!a]*.ts', 'src/a1.ts', false],
    ['**/*.ts', 'src/deep/a.ts', true],
    ['**/*.ts', 'a.ts', true],
    ['**/*.rs', 'src/a.ts', false],
    ['src/*.ts', 'src/a.ts', true],
    ['src/*.ts', 'src/deep/a.ts', false],
    ['*.md', 'docs/readme.md', true], // no-slash patterns match at any depth
    ['src/', 'src/deep/file.txt', true],
    ['{src,lib}/**', 'lib/x.js', true],
  ]
  for (const [pattern, path, expected] of cases) {
    it(`${pattern} vs ${path} -> ${expected}`, () => {
      expect(globToRegExp(pattern).test(path)).toBe(expected)
    })
  }
})

describe('isPathCandidate (adversarial)', () => {
  const accepted: string[] = ['src/utils/legacy.ts', 'docs/setup.md', './src/a.ts', 'src\\win\\style.ts', 'package.json']
  const rejected: string[] = [
    'path/to/file.ts',
    '<your-module>.ts',
    'https://example.com/a.ts',
    'npm run build',
    'foo/bar',
    '${VAR}/x.ts',
    '/etc/passwd',
    '~/notes.md',
    'a',
    'v1.2.3',
    'package.json.scripts',
    'tests/ci/test_action_EventNameHere.py',
  ]
  for (const t of accepted) {
    it(`accepts ${t}`, () => expect(isPathCandidate(t)).not.toBeNull())
  }
  for (const t of rejected) {
    it(`rejects ${t}`, () => expect(isPathCandidate(t)).toBeNull())
  }
})

describe('security: normalizeSegments traversal guard', () => {
  it('collapses . and .. within the tree', () => {
    expect(normalizeSegments('a/./b/../c.ts')).toBe('a/c.ts')
  })
  it('returns null when a path escapes the repo root', () => {
    expect(normalizeSegments('../EXISTS.ts')).toBeNull()
    expect(normalizeSegments('a/../../etc/passwd')).toBeNull()
  })
})

describe('security: glob ReDoS guard', () => {
  it('rejects a glob token with many ** segments before it reaches the matcher', () => {
    const evil = Array.from({ length: 40 }, () => '**').join('/') + '/z.ts'
    expect(isPathCandidate(evil)).toBeNull()
  })
})

describe('security: terminal control-char sanitization', () => {
  it('strips ANSI/OSC escape sequences from finding messages and file names', () => {
    const ESC = String.fromCharCode(27)
    const out = renderTerminal(
      {
        findings: [
          { ruleId: 'repo/dead-path', severity: 'warn', file: 'CLAUDE.md', line: 1, message: `glob '${ESC}]0;PWNED${ESC}[2J' matches no files` },
        ],
        files: ['CLAUDE.md'],
        summary: { filesScanned: 1, errors: 0, warnings: 1, infos: 0, estTokens: 10, estDupTokens: 0 },
      },
      false,
    )
    // Strip legitimate SGR color codes picocolors may add, then assert no
    // dangerous control chars survive (the report's own \n line breaks are fine).
    const stripped = out.replace(/\x1b\[[0-9;]*m/g, '')
    expect(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(stripped)).toBe(false)
  })
})

describe('stripJsonComments', () => {
  it('strips line and block comments but not strings', () => {
    const input = '{\n  // comment\n  "a": "http://x/y", /* block */ "b": 1\n}'
    expect(JSON.parse(stripJsonComments(input))).toEqual({ a: 'http://x/y', b: 1 })
  })
})
