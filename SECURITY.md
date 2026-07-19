# Security

ctxvet is designed to be run on **untrusted repositories** (e.g. a repo you just cloned to inspect). It treats every scanned file as attacker-controlled data:

- **No code execution.** ctxvet never runs, imports, or evaluates anything from the scanned repo. There are no `child_process`, `eval`, or dynamic-`import` calls on repo content.
- **No network.** It makes zero network requests. The only URLs in the tool are documentation links printed by `--rules`.
- **No writes**, except `ctxvet init`, which writes a single `.ctxvetrc.json` to the current directory and refuses to overwrite an existing one.
- **Terminal-safe output.** Findings echo bytes from scanned files (paths, glob values, frontmatter). All C0 control characters and escape sequences are stripped before printing, so a malicious file cannot inject ANSI/OSC escapes into your terminal. `--format json` escapes control characters via `JSON.stringify`.
- **No filesystem access outside the target.** Path references that resolve above the repo root are skipped, never probed on disk.
- **Bounded work.** Files above 5 MB are skipped; pathological glob patterns are rejected before matching to prevent regex denial-of-service.

## Reporting a vulnerability

Please open a GitHub security advisory or email the maintainer rather than filing a public issue. Include a minimal reproducing repo/file if possible.
