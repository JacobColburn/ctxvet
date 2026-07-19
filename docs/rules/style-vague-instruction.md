# style/vague-instruction

**Default severity:** info

Flags no-op instructions from a small, exact phrase list: "follow best practices", "write clean code", "be careful", "handle errors appropriately", and ~16 more.

## Why

These lines encode zero decision-relevant information — the model already tries to write clean code and follow best practices. They cost tokens and attention on every turn while changing nothing. The ETH study ([arXiv 2602.11988](https://arxiv.org/abs/2602.11988)) is blunt about this: minimal, project-specific context beats padded context. Replace "follow best practices" with the *actual* practice: "use the repository's Result type, never throw across module boundaries."

## Honest caveats

This is the most opinionated rule in ctxvet, which is why it is `info` by default, matches only exact phrases (no fuzzy matching), and is the easiest to disable:

```json
{ "rules": { "style/vague-instruction": "off" } }
```
