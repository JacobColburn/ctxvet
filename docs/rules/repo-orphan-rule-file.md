# repo/orphan-rule-file

**Default severity:** warn

Flags `.cursor/rules/*.mdc` files whose `globs:` frontmatter patterns match zero files in the repo.

## Why

A glob-scoped Cursor rule only activates when a matching file is in context. If the rule is scoped to `**/*.rs` and the Rust code was removed (or never existed — copy-pasted rule packs do this), the rule is dead weight that will never fire. Nobody notices, because a rule that never fires produces no symptoms.

## What it skips

- Rules with `alwaysApply: true`
- Rules with no `globs:` at all (agent-requested or manual rules)

## Suppress

Set `"repo/orphan-rule-file": "off"` in `.ctxvetrc.json`, or delete the dead rule file.
