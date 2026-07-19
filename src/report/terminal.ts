import pc from 'picocolors'
import { formatTokens } from '../rules/size-bloat.js'
import type { Finding, LintResult, Severity } from '../types.js'

function sevLabel(severity: Severity): string {
  switch (severity) {
    case 'error':
      return pc.red('error')
    case 'warn':
      return pc.yellow('warn ')
    case 'info':
      return pc.cyan('info ')
  }
}

export function renderTerminal(result: LintResult, quiet: boolean): string {
  const out: string[] = []
  const shown = quiet ? result.findings.filter((f) => f.severity === 'error') : result.findings

  const byFile = new Map<string, Finding[]>()
  for (const f of shown) {
    const list = byFile.get(f.file) ?? []
    list.push(f)
    byFile.set(f.file, list)
  }

  for (const [file, findings] of byFile) {
    out.push(pc.bold(pc.underline(file)))
    for (const f of findings) {
      const loc = f.line > 0 ? `:${f.line}` : ''
      out.push(`  ${pc.dim(`${file}${loc}`)}  ${sevLabel(f.severity)}  ${pc.dim(f.ruleId)}  ${f.message}`)
    }
    out.push('')
  }

  const { filesScanned, errors, warnings, infos, estTokens, estDupTokens } = result.summary
  const counts: string[] = []
  counts.push(`${filesScanned} file${filesScanned === 1 ? '' : 's'} scanned`)
  counts.push(errors > 0 ? pc.red(`${errors} error${errors === 1 ? '' : 's'}`) : pc.green('0 errors'))
  counts.push(warnings > 0 ? pc.yellow(`${warnings} warning${warnings === 1 ? '' : 's'}`) : '0 warnings')
  if (infos > 0 && !quiet) counts.push(pc.cyan(`${infos} info`))
  let tokenNote = `est. ${formatTokens(estTokens)} tokens of context`
  if (estDupTokens > 0) tokenNote += ` (~${formatTokens(estDupTokens)} in duplicates)`
  counts.push(pc.dim(tokenNote))
  out.push(counts.join(pc.dim(' · ')))

  if (filesScanned === 0) {
    out.push(pc.dim('no context files found (looked for CLAUDE.md, AGENTS.md, GEMINI.md, .cursor/rules, copilot-instructions.md, .windsurfrules, SKILL.md)'))
  }
  return out.join('\n')
}
