#!/usr/bin/env node
/**
 * Field-study runner: lints a set of cloned public repos with the built CLI
 * and writes aggregate results to study/results.json. Reproduce with:
 *
 *   node study/run.mjs <dir-with-clones>
 *
 * Every number in the launch material traces back to this file's output.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const cli = join(here, '..', 'dist', 'cli.js')
const clonesDir = process.argv[2]
if (!clonesDir || !existsSync(clonesDir)) {
  console.error('usage: node study/run.mjs <dir-with-clones>')
  process.exit(2)
}

const results = []
for (const name of readdirSync(clonesDir).sort()) {
  const repoDir = join(clonesDir, name)
  let raw
  try {
    raw = execFileSync(process.execPath, [cli, repoDir, '--format', 'json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch (e) {
    if (!e.stdout) {
      results.push({ repo: name, error: String(e.message).split('\n')[0] })
      continue
    }
    raw = e.stdout // exit code 1 still prints the report
  }
  const report = JSON.parse(raw)
  const byRule = {}
  for (const f of report.findings) byRule[f.ruleId] = (byRule[f.ruleId] ?? 0) + 1
  results.push({
    repo: name,
    filesScanned: report.summary.filesScanned,
    estTokens: report.summary.estTokens,
    estDupTokens: report.summary.estDupTokens,
    errors: report.summary.errors,
    warnings: report.summary.warnings,
    infos: report.summary.infos,
    byRule,
  })
  console.log(`${name}: ${report.summary.filesScanned} files, ${report.summary.errors}E/${report.summary.warnings}W/${report.summary.infos}I`)
}

writeFileSync(join(here, 'results.json'), JSON.stringify({ generatedWith: 'ctxvet 0.1.0', repos: results }, null, 2))
console.log(`\nwrote study/results.json (${results.length} repos)`)
