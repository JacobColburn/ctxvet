# skill/description-quality

**Default severity:** warn

Deterministic triggering-quality heuristics on a skill's `description`: warns when it is under 50 chars, contains no "when to use" signal (`when`, `use for`, `trigger`, `if the user`…), or starts with a wasted "This skill…" prefix.

## Why

The description is the **only** signal the model sees when deciding whether to load a skill — the body is invisible until after triggering. "This skill is for PDFs" tells the model what the skill is about but not *when to reach for it*; "Extract text and tables from PDF files. Use when the user mentions a .pdf file or asks to read/fill/merge PDFs" triggers reliably. This is Anthropic's own authoring guidance ([best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)), enforced deterministically — no LLM judgment involved.

## Suppress

```json
{ "rules": { "skill/description-quality": "off" } }
```
