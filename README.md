# ctxvet

**A deterministic linter for AI agent context files — checked against your actual repo.**

Your `CLAUDE.md`, `AGENTS.md`, `.cursor/rules`, and `SKILL.md` files are prepended to every agent turn. When they bloat, duplicate, or rot, you pay for it in tokens *and* in agent mistakes. An ETH Zurich study ([arXiv 2602.11988](https://arxiv.org/abs/2602.11988)) found LLM-generated context files **reduced** task success (~3%) while raising inference cost over 20% — and even human-written files only help when they stay minimal.

Code gets linters. The files that steer your agents get nothing. `ctxvet` fixes that:

```
npx ctxvet
```

![ctxvet running against a repo, flagging a dead path, a dead script, a vague instruction, and a cross-file duplicate](https://raw.githubusercontent.com/JacobColburn/ctxvet/main/assets/demo.gif)

Zero config, no LLM calls, no network, no telemetry. Four runtime dependencies.

## What it catches

We ran ctxvet across 10 popular open-source repos that ship context files (results committed in [study/results.json](study/results.json), reproducible with [study/run.mjs](study/run.mjs)). **Every one of the 10 had at least one reference to a file that no longer exists** — 146 unique dead paths across ~80 context files. Not because these teams are careless — because context files rot silently. A path that stops existing produces no error, no failing test, nothing. Your agent just follows instructions into a wall.

```
CLAUDE.md
  CLAUDE.md:42   warn   repo/dead-path    'src/utils/legacy.ts' does not exist in this repo
  CLAUDE.md:17   warn   repo/dead-script  'npm run typecheck' — no script named 'typecheck' in any package.json
  CLAUDE.md:88   warn   dup/cross-file    paragraph duplicates AGENTS.md:31 (~85% overlap, ~120 tokens est.) — you pay for this in both files

3 files scanned · 0 errors · 3 warnings · est. 4.1k tokens of context (~2.9k in duplicates)
```

## Rules

| Rule | What it checks |
|---|---|
| `repo/dead-path` | Backticked/linked paths that don't exist on disk (resolved from the file's dir and the root) |
| `repo/dead-script` | `npm run X` / `make X` mentions with no matching script or target |
| `repo/orphan-rule-file` | `.cursor/rules/*.mdc` whose globs match zero files — the rule can never fire |
| `size/bloat` | Files over evidence-based size thresholds, with estimated token cost |
| `dup/cross-file` | Near-duplicate paragraphs across CLAUDE.md / AGENTS.md / cursor rules (8-word shingles) |
| `style/vague-instruction` | No-op lines like "follow best practices" (info-level, easy to disable) |
| `skill/frontmatter` | SKILL.md spec conformance: name format, directory match, description limits |
| `skill/description-quality` | Descriptions too thin or missing a "when to use" signal — the skill silently never triggers |
| `secret/leak` | Vendor-prefixed API keys and key blocks in context files (redacted in output) |

Every rule has a doc page in [docs/rules](docs/rules) citing *why it exists* — research or vendor spec, not vibes. The repo-grounded rules are the point: most context linters read the markdown in isolation; ctxvet checks it against your real file tree, package scripts, and Makefile.

## Usage

```
npx ctxvet                  # lint the current repo
npx ctxvet path/to/repo
npx ctxvet --format json    # stable schema for CI/tooling
npx ctxvet --rules          # list rules with rationale
npx ctxvet --max-warnings 0 # strict mode for CI
npx ctxvet init             # write a commented .ctxvetrc.json
```

Exit codes: `0` clean/warnings, `1` errors (or warnings over `--max-warnings`), `2` tool failure.

Suppress a finding with a reason:

```markdown
<!-- ctxvet-disable-next-line repo/dead-path -->
Known-gone file: `src/removed.ts` (kept for history).
```

Configure via `.ctxvetrc.json` (comments allowed):

```json
{
  "rules": { "style/vague-instruction": "off" },
  "ignore": ["vendor/**"],
  "size": { "warnLines": 300 }
}
```

## Why not just one AGENTS.md?

Fair question. AGENTS.md is a real standard (Linux Foundation AAIF, 20+ tools read it) — but Claude Code deliberately reads `CLAUDE.md` instead, Cursor keeps glob-scoped `.mdc` rules AGENTS.md can't express, and Copilot keeps its own file. Multi-format is the stable state, and *every* format rots the same way. ctxvet lints whatever you have, wherever the industry lands.

## This repo passes its own linter

`node dist/cli.js .` runs in CI on every push ([workflow](.github/workflows/ci.yml)). The [lint-context skill](.claude/skills/lint-context/SKILL.md) shipped here is both dogfood and a demo.

## FAQ

**Why is my agent ignoring my CLAUDE.md?** Often because it's rotted — it points at files or scripts that no longer exist, or it's so long the important lines get lost. `ctxvet` catches the first class directly and flags the second with size/token warnings.

**My CLAUDE.md is too long — how do I trim it?** Run `ctxvet` and start with the `size/bloat` and `style/vague-instruction` findings: delete no-op lines ("follow best practices") and dedupe anything the `dup/cross-file` rule flags as living in two files at once.

**How is this different from cclint / ctxlint / AgentLint?** ctxvet's checks are **repo-grounded** — it validates every path, script, and glob against your actual file tree, package.json, and Makefile, not the markdown in isolation. It also lints **SKILL.md** quality (triggering, frontmatter), which most context linters don't touch. No LLM calls, no network.

**Does it validate SKILL.md?** Yes — `skill/frontmatter` checks spec conformance (name/description/directory match) and `skill/description-quality` flags descriptions too thin or missing a "when to use" signal, which is why skills silently never trigger.

**Can I run it in CI?** Yes. `ctxvet` exits non-zero on errors (and on warnings over `--max-warnings N`), and `--format json` gives a stable schema. See the [workflow](.github/workflows/ci.yml) in this repo.

## Roadmap

- GitHub Action wrapper (the JSON format + exit codes already make this trivial)
- More repo-grounded checks (workspace-aware script resolution, `.claude/rules` path scoping)
- Sharing/versioning for rulesets is being explored — tell us if you'd use it

## Contributing

A rule is one pure function: `check(file, ctx) => Finding[]`. Add a file in [src/rules](src/rules), register it, add a fixture. If a rule needs a heuristic, it needs an adversarial test — we prefer a missed finding over a false positive. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide, and please file [false-positive reports](https://github.com/JacobColburn/ctxvet/issues/new?labels=false-positive) — they're the most useful feedback for a linter.

MIT © Hunter Colburn
