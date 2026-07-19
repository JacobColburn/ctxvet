# repo/dead-script

**Default severity:** warn

Flags `npm run X` / `pnpm run X` / `yarn run X` / `bun run X` mentions with no matching script in any `package.json` in the repo, and `make X` (inside code spans/fences only) with no matching Makefile target.

## Why

"Run `npm run typecheck` before pushing" is an instruction the agent will follow literally. If the script was renamed to `check:types` two months ago, the agent burns a turn on the failure and starts guessing. Scripts are the highest-traffic instructions in most context files and the most likely to drift.

## What it skips (false-positive control)

- Repos with no `package.json` at all (not a JS project — the mention is probably illustrative)
- Placeholders (`npm run <script>`)
- `make X` in prose ("make sure…" is English, not a command) — only code spans and fenced blocks are checked
- Workspace-scoped invocations (`--prefix`, `-w`) are not resolved in v0 — a script defined in *any* package.json in the repo counts

## Suppress

```markdown
<!-- ctxvet-disable-next-line repo/dead-script -->
```
