# size/bloat

**Default severity:** warn (error above the hard cap)

Flags context files above size thresholds. Defaults: warn over 300 lines / 12KB, error over 600 lines / 25KB; SKILL.md bodies warn over 500 lines. All configurable via `size` in `.ctxvetrc.json`.

## Why

A context file is prepended to **every** agent turn — you pay its token cost on every request, and attention is finite. The ETH Zurich study ([arXiv 2602.11988](https://arxiv.org/abs/2602.11988)) found LLM-generated context files *reduced* task success (~3%) while raising inference cost over 20%, and that even human-written files help only when they stay minimal (~4% gain). Anthropic's own [skill authoring guidance](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) caps SKILL.md bodies at 500 lines and says to move detail into referenced files.

The thresholds are defaults, not laws — teams that disagree configure them. The output includes an estimated token count (bytes ÷ 4, labeled as an estimate) so the cost is concrete.

## Configure

```json
{ "size": { "warnLines": 300, "warnBytes": 12000, "errorLines": 600, "errorBytes": 25000, "skillWarnLines": 500 } }
```
