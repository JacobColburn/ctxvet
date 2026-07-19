# Changelog

All notable changes to ctxvet are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/); versioning follows [semver](https://semver.org/).

## [Unreleased]

## [0.1.0] — 2026-07-19

First public release.

### Added
- Nine deterministic rules for AI agent context files (CLAUDE.md, AGENTS.md, `.cursor/rules/*.mdc`, SKILL.md):
  - `repo/dead-path` — backticked/linked paths that don't exist in the repo
  - `repo/dead-script` — `npm run` / `make` targets with no matching script
  - `repo/orphan-rule-file` — Cursor rules whose globs match zero files
  - `size/bloat` — context files over evidence-based size thresholds, with token estimates
  - `dup/cross-file` — near-duplicate paragraphs across and within context files
  - `style/vague-instruction` — no-op instructions like "follow best practices"
  - `skill/frontmatter` — SKILL.md spec conformance
  - `skill/description-quality` — descriptions unlikely to trigger reliably
  - `secret/leak` — vendor-prefixed credentials in context files
- Terminal and JSON (`--format json`) reporters; `--quiet`, `--rules`, `--max-warnings`, and `ctxvet init`.
- Inline suppression comments (`<!-- ctxvet-disable-next-line <rule-id> -->`) and `.ctxvetrc.json` config.
- Zero LLM calls, zero network, four runtime dependencies. MIT licensed.

[Unreleased]: https://github.com/JacobColburn/ctxvet/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/JacobColburn/ctxvet/releases/tag/v0.1.0
