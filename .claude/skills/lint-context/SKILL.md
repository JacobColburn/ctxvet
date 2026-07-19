---
name: lint-context
description: Lint this repo's agent context files with ctxvet and fix what it finds. Use when the user asks to check, lint, or clean up CLAUDE.md, AGENTS.md, cursor rules, or skills, or before publishing context-file changes.
---

# Lint context files

1. Build if `dist/` is missing: `npm run build`.
2. Run `npm run lint:self` (or `node dist/cli.js . --format json` for machine-readable output).
3. For each finding, prefer fixing the underlying rot (delete the stale path, dedupe the paragraph) over suppressing. Suppress only with a reason: `<!-- ctxvet-disable-next-line <rule-id> -->` on the line above.
4. Re-run until exit code 0. CI enforces this.
