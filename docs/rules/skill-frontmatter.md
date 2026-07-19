# skill/frontmatter

**Default severity:** error

Validates SKILL.md frontmatter against the Agent Skills spec: frontmatter present and parseable, `name` present (kebab-case, ≤64 chars, matching the parent directory), `description` present (≤1024 chars), unknown keys flagged as `info`.

## Why

Skills are discovered and triggered entirely via frontmatter. A skill with a malformed name or missing description doesn't error — it *silently never loads*, which is worse. Constraints follow Anthropic's [skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) and the [skill-creator reference](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md): tools resolve skills by directory name, so `name` must match its directory.

## Suppress

Individual checks can't be disabled separately in v0; set `"skill/frontmatter": "off"` or use a `ctxvet-disable-file` comment in the skill.
