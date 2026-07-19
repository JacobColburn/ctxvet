# secret/leak

**Default severity:** error

Flags secret-looking values in context files: vendor-prefixed API keys (`sk-ant-…`, `sk-…`, `ghp_…`, `github_pat_…`, `AKIA…`, `xox…`), private-key blocks, and `key/token/secret/password = <long value>` assignments. Matched values are redacted in output (first 6 chars + length).

## Why

Context files are committed to git and read into every agent conversation — a credential here is a credential in your history, your teammates' prompts, and potentially your agent's tool calls. Context files are also exactly where "temporary" keys get pasted during setup and forgotten.

## False-positive control

Only high-precision vendor-prefixed patterns are used; entropy-only scanning is deliberately excluded (too noisy for a default-on `error` rule). Assignment matching skips placeholder shapes (`your-key`, `xxx`, `<example>`, `process.env…`) and low-variety strings.

## On finding one

Rotate the credential — removing it from the file does not remove it from git history.
