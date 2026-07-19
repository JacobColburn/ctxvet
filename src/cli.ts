#!/usr/bin/env node
import { Command } from 'commander'
import { existsSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ConfigError, INIT_TEMPLATE } from './config.js'
import { lint } from './index.js'
import { renderJson } from './report/json.js'
import { renderTerminal } from './report/terminal.js'
import { ALL_RULES } from './rules/index.js'

const program = new Command()

program
  .name('ctxvet')
  .description('Evidence-grounded linter for AI agent context files (CLAUDE.md, AGENTS.md, .cursor/rules, SKILL.md)')
  .version('0.1.0')

program
  .argument('[path]', 'repo root to lint', '.')
  .option('--format <format>', 'output format: terminal | json', 'terminal')
  .option('--quiet', 'errors only', false)
  .option('--max-warnings <n>', 'exit 1 when warnings exceed n', undefined)
  .option('--rules', 'list all rules with rationale and exit', false)
  .action((path: string, opts: { format: string; quiet: boolean; maxWarnings?: string; rules: boolean }) => {
    if (opts.rules) {
      for (const rule of ALL_RULES) {
        console.log(`${rule.id}  [${rule.defaultSeverity}]`)
        console.log(`  ${rule.docs.summary}`)
        console.log(`  docs: https://github.com/JacobColburn/ctxvet/blob/main/docs/rules/${rule.id.replace('/', '-')}.md`)
      }
      process.exitCode = 0
      return
    }
    if (opts.format !== 'terminal' && opts.format !== 'json') {
      console.error(`ctxvet: unknown format '${opts.format}' (expected terminal or json)`)
      process.exitCode = 2
      return
    }
    const root = resolve(path)
    if (!existsSync(root)) {
      console.error(`ctxvet: path not found: ${root}`)
      process.exitCode = 2
      return
    }
    if (!statSync(root).isDirectory()) {
      console.error(`ctxvet: not a directory: ${root} (point ctxvet at a repo root, not a file)`)
      process.exitCode = 2
      return
    }
    let result
    try {
      result = lint(root)
    } catch (e) {
      if (e instanceof ConfigError) {
        console.error(`ctxvet: ${e.message}`)
        process.exitCode = 2
        return
      }
      throw e
    }
    console.log(opts.format === 'json' ? renderJson(result) : renderTerminal(result, opts.quiet))

    let failed = result.summary.errors > 0
    if (opts.maxWarnings !== undefined) {
      const max = Number(opts.maxWarnings)
      if (!Number.isFinite(max) || max < 0) {
        console.error(`ctxvet: --max-warnings must be a non-negative number`)
        process.exitCode = 2
        return
      }
      if (result.summary.warnings > max) failed = true
    }
    process.exitCode = failed ? 1 : 0
  })

program
  .command('init')
  .description('write a commented .ctxvetrc.json (the only file ctxvet ever writes)')
  .action(() => {
    const target = resolve('.ctxvetrc.json')
    if (existsSync(target)) {
      console.error('ctxvet: .ctxvetrc.json already exists — not overwriting')
      process.exitCode = 2
      return
    }
    writeFileSync(target, INIT_TEMPLATE, 'utf8')
    console.log('wrote .ctxvetrc.json')
  })

program.parse()
