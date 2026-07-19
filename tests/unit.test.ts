import { describe, expect, it } from 'vitest'
import { stripJsonComments } from '../src/config.js'
import { globToRegExp } from '../src/glob.js'
import { markFences, extractFrontmatter, parseContextFile } from '../src/parse.js'
import { isPathCandidate } from '../src/rules/repo-dead-path.js'

describe('markFences', () => {
  it('marks fenced lines including delimiters', () => {
    const lines = ['a', '```ts', 'code', '```', 'b']
    expect(markFences(lines)).toEqual([false, true, true, true, false])
  })
  it('handles unclosed fences', () => {
    expect(markFences(['```', 'x'])).toEqual([true, true])
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

describe('stripJsonComments', () => {
  it('strips line and block comments but not strings', () => {
    const input = '{\n  // comment\n  "a": "http://x/y", /* block */ "b": 1\n}'
    expect(JSON.parse(stripJsonComments(input))).toEqual({ a: 'http://x/y', b: 1 })
  })
})
