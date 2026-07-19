# dup/cross-file

**Default severity:** warn

Flags near-duplicate paragraphs across context files (CLAUDE.md vs AGENTS.md vs `.cursor/rules`) and within a single file. Detection: paragraphs are normalized, split into 8-word shingles, and flagged above 70% shingle overlap.

## Why

Teams running multiple agent tools duplicate the same instructions into each tool's file, then the copies drift — and while they don't, you pay for the same paragraph twice in every prompt of every tool. The summary line reports the estimated duplicated tokens so the cost is visible.

## Special cases

- Byte-identical files produce a single `info` suggesting one canonical file plus an import (e.g. a CLAUDE.md containing `@AGENTS.md`) instead of per-paragraph noise.
- Short paragraphs (under 15 words) are never compared — headers and one-liners legitimately repeat.

## Suppress

```markdown
<!-- ctxvet-disable-next-line dup/cross-file -->
```
