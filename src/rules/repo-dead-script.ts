import type { Finding, Rule } from '../types.js'

const RUN_RE = /\b(npm|pnpm|yarn|bun)\s+run\s+([A-Za-z0-9:_.-]+)/g
const MAKE_RE = /\bmake\s+([A-Za-z0-9_./-]+)/g
const PLACEHOLDER = /[<>{}$]|^(script|name|task|target)$/i

export const repoDeadScript: Rule = {
  id: 'repo/dead-script',
  defaultSeverity: 'warn',
  docs: {
    summary: 'Referenced script/target does not exist',
    rationale:
      "An agent told to `npm run typecheck` when no such script exists wastes a turn failing and guessing. Script mentions are checked against the scripts of every package.json in the repo (and `make` targets against the Makefile).",
  },
  check(file, ctx) {
    const findings: Finding[] = []
    const seen = new Set<string>()

    // Commands live in prose AND fenced blocks — scan every body line.
    for (let i = file.bodyStartLine - 1; i < file.lines.length; i++) {
      const line = file.lines[i]!
      const lineNo = i + 1

      if (ctx.hasPackageJson) {
        RUN_RE.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = RUN_RE.exec(line)) !== null) {
          const script = m[2]!
          if (PLACEHOLDER.test(script)) continue
          if (ctx.packageScripts.has(script)) continue
          const key = `${lineNo}:${script}`
          if (seen.has(key)) continue
          seen.add(key)
          findings.push({
            ruleId: this.id,
            severity: 'warn',
            file: file.path,
            line: lineNo,
            message: `'${m[1]} run ${script}' — no script named '${script}' in any package.json in this repo`,
          })
        }
      }

      // `make X` only inside code fences or code spans (prose "make sure" is English, not a command)
      if (ctx.makeTargets.size > 0) {
        const inSpan = file.codeSpans.some((s) => s.line === lineNo && /\bmake\s/.test(s.text))
        if (file.inFence[i] || inSpan) {
          MAKE_RE.lastIndex = 0
          let m: RegExpExecArray | null
          while ((m = MAKE_RE.exec(line)) !== null) {
            const target = m[1]!
            if (PLACEHOLDER.test(target) || target.startsWith('-')) continue
            if (ctx.makeTargets.has(target)) continue
            const key = `${lineNo}:make:${target}`
            if (seen.has(key)) continue
            seen.add(key)
            findings.push({
              ruleId: this.id,
              severity: 'warn',
              file: file.path,
              line: lineNo,
              message: `'make ${target}' — no such target in the Makefile`,
            })
          }
        }
      }
    }
    return findings
  },
}
