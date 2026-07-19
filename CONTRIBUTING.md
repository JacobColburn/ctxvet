# Contributing to ctxvet

Thanks for helping make agent context files less rotten. The most valuable contribution you can make is a **false-positive report** — if ctxvet flagged something it shouldn't, that's a bug worth fixing (see below).

## Setup

```bash
git clone https://github.com/JacobColburn/ctxvet
cd ctxvet
npm ci
npm test        # 64 tests; the CLI tests self-build if dist/ is missing
```

- Node 20+ · TypeScript (strict, ESM) · Vitest · tsup
- `npm run build` — bundle to `dist/`
- `npm run typecheck` — `tsc --noEmit`
- `node dist/cli.js .` — run ctxvet on this repo (it must pass its own linter)

## Reporting a false positive

Open an issue with the **False positive** template. Include the smallest context-file snippet that triggers it and what you expected. We treat FPs as high priority: a linter people don't trust gets uninstalled. Every confirmed FP becomes a regression fixture.

## Adding or changing a rule

A rule is one pure function. To add one:

1. Create `src/rules/<group>-<name>.ts` exporting a `Rule` (see `src/rules/types.ts`):
   ```ts
   export const myRule: Rule = {
     id: 'group/name',
     defaultSeverity: 'warn',
     docs: { summary: '…', rationale: '…', citation: 'https://…' },
     check(file, ctx) { /* return Finding[] */ },
   }
   ```
2. Register it in [`src/rules/index.ts`](src/rules/index.ts).
3. Add a fixture repo under `tests/fixtures/<name>/` and assertions in `tests/lint.test.ts`.
4. Add a doc page `docs/rules/<group>-<name>.md` that **cites why the rule exists** (research or a vendor spec — not opinion).

Rules must be **deterministic**: no LLM calls, no network, no reading files outside the scanned repo. Everything a rule needs is on `LintContext` (repo file tree, package scripts, Makefile targets) — rules never touch the filesystem directly.

## Design principles

- **Prefer a missed finding over a false positive.** Any heuristic that guesses needs adversarial tests (see `tests/unit.test.ts`).
- **Every rule earns its keep with a citation.** If you can't say *why* a rule matters with a source, it's an opinion, not a rule.
- **Zero runtime surprises.** No new runtime dependency without discussion; the tiny dep tree is a feature.

## Pull requests

- Keep PRs focused. One rule or one fix per PR.
- `npm run typecheck && npm test` must pass; CI runs on Linux + Windows, Node 20 & 22.
- New behavior needs a fixture. New rules need a doc page.

By contributing you agree your work is licensed under the [MIT License](LICENSE).
