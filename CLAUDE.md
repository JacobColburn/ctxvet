# ctxvet

Deterministic linter for AI agent context files (CLAUDE.md, AGENTS.md, `.cursor/rules`, SKILL.md). ESM-only TypeScript, Node 20+, four runtime deps. No LLM calls, no network, no telemetry — keep it that way.

## Commands

- `npm run build` — tsup bundle to `dist/`
- `npm run typecheck` — tsc strict, no emit
- `npm test` — vitest; fixture repos live in `tests/fixtures/`
- `npm run lint:self` — this repo must always pass its own linter

## Architecture

One pass: [src/discover.ts](src/discover.ts) finds context files → [src/context.ts](src/context.ts) snapshots the repo (file tree, package.json scripts, Makefile targets) → each rule in [src/rules](src/rules) is a pure `check(file, ctx)` → reporters in [src/report](src/report). Rules never touch the filesystem; everything they need is on `LintContext`.

## Conventions

- Adding a rule: one file in `src/rules/`, register in [src/rules/index.ts](src/rules/index.ts), add a fixture under `tests/fixtures/`, and a doc page in `docs/rules/` citing why the rule exists.
- All paths are repo-relative with forward slashes, normalized at the boundary (Windows dev happens here).
- Prefer a missed finding over a false positive — every heuristic that guesses gets an adversarial test.
