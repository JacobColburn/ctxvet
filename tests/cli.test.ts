import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cli = join(root, 'dist', 'cli.js')
const fixtures = join(root, 'tests', 'fixtures')

function run(args: string[]): { stdout: string; code: number } {
  try {
    const stdout = execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
    return { stdout, code: 0 }
  } catch (e) {
    const err = e as { status?: number; stdout?: string }
    return { stdout: err.stdout ?? '', code: err.status ?? -1 }
  }
}

describe('cli (built)', () => {
  it('exits 0 on the clean fixture', () => {
    const { code, stdout } = run([join(fixtures, 'clean')])
    expect(code).toBe(0)
    expect(stdout).toContain('2 files scanned')
  })
  it('exits 1 on the secrets fixture (errors)', () => {
    const { code } = run([join(fixtures, 'secrets')])
    expect(code).toBe(1)
  })
  it('exits 0 on warnings by default but 1 with --max-warnings 0', () => {
    expect(run([join(fixtures, 'dead-refs')]).code).toBe(0)
    expect(run([join(fixtures, 'dead-refs'), '--max-warnings', '0']).code).toBe(1)
  })
  it('exits 2 on a missing path', () => {
    expect(run([join(fixtures, 'does-not-exist')]).code).toBe(2)
  })
  it('emits stable json', () => {
    const { stdout } = run([join(fixtures, 'dead-refs'), '--format', 'json'])
    const parsed = JSON.parse(stdout) as { schemaVersion: number; findings: unknown[] }
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.findings.length).toBeGreaterThan(0)
  })
})
