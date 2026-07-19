import type { LintResult } from '../types.js'

/** Stable, versioned schema for CI and tooling. */
export function renderJson(result: LintResult): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      summary: result.summary,
      files: result.files,
      findings: result.findings.map((f) => ({
        ruleId: f.ruleId,
        severity: f.severity,
        file: f.file,
        line: f.line,
        message: f.message,
        ...(f.data ? { data: f.data } : {}),
      })),
    },
    null,
    2,
  )
}
