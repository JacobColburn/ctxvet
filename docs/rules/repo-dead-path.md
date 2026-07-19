# repo/dead-path

**Default severity:** warn

Flags backticked paths and markdown link targets in a context file that do not exist on disk.

## Why

Context files rot faster than code: the file gets written once and the repo moves on. A CLAUDE.md that says helpers live in `src/utils/legacy.ts` after that file was deleted sends the agent hunting for something that is not there — wasted turns, wrong conclusions. This is *provable* staleness, checked against your actual file tree, not a heuristic guess about file age.

## What it skips (false-positive control)

- Anything with placeholder shapes: `path/to/…`, `<your-module>`, `${VAR}`, `foo/bar`, absolute system paths, `~`
- URLs and anchors
- Bare words without a `/` or a known file extension
- Extension-less tokens whose first segment is not a real top-level directory (rule IDs, route patterns)
- Globs are checked for liveness instead: `src/**/*.ts` passes if it matches at least one file
- Paths excluded by your `ignore` config but present on disk still count as alive

## Suppress

```markdown
<!-- ctxvet-disable-next-line repo/dead-path -->
Known-gone file: `src/removed.ts` (kept for history).
```
