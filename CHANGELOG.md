# Changelog

All notable changes to ctxvet are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/); versioning follows [semver](https://semver.org/).

## [Unreleased]

## [0.1.1] — 2026-07-19

Documentation, discoverability, and release-automation improvements. No changes to linter behavior — the checks and their output are identical to 0.1.0.

### Added
- Animated demo (`assets/demo.gif`) and a hero terminal screenshot in the README.
- FAQ section answering real questions ("why is my agent ignoring my CLAUDE.md?", "does it validate SKILL.md?", CI usage).
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and GitHub issue templates (including a dedicated false-positive report).
- npm trusted-publishing workflow (`.github/workflows/publish.yml`) with provenance, and `RELEASING.md`.

### Changed
- Expanded npm `keywords` and sharpened the package `description` for discoverability.

### Fixed
- CI now builds before running tests (the CLI tests exercise the built binary); the CLI test also self-builds if `dist/` is missing.
- Committed test fixtures that a fixture's own `.gitignore` had excluded, so a fresh checkout runs the full suite.

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

[Unreleased]: https://github.com/JacobColburn/ctxvet/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/JacobColburn/ctxvet/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/JacobColburn/ctxvet/releases/tag/v0.1.0
