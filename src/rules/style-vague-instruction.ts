import type { Finding, Rule } from '../types.js'

/**
 * Deliberately small, exact list. Each pattern is a no-op instruction: it
 * consumes context tokens without changing agent behavior. This is the most
 * opinionated rule and the easiest to turn off.
 */
const VAGUE_PATTERNS: Array<{ re: RegExp; phrase: string }> = [
  { re: /\bwrite (clean|good|great|quality|high[- ]quality) code\b/i, phrase: 'write clean/good code' },
  { re: /\b(follow|use|apply) best practices\b/i, phrase: 'follow best practices' },
  { re: /\bbe careful\b/i, phrase: 'be careful' },
  { re: /\buse common sense\b/i, phrase: 'use common sense' },
  { re: /\bhandle errors? (appropriately|properly|gracefully|correctly)\b/i, phrase: 'handle errors appropriately' },
  { re: /\bkeep (the )?code (clean|maintainable|readable|simple)\b/i, phrase: 'keep the code clean' },
  { re: /\bwrite (maintainable|readable|elegant|idiomatic) code\b/i, phrase: 'write maintainable code' },
  { re: /\bdo a good job\b/i, phrase: 'do a good job' },
  { re: /\bbe (thorough|smart|intelligent|diligent|professional)\b/i, phrase: 'be thorough/smart' },
  { re: /\bact (like|as) a senior (engineer|developer)\b/i, phrase: 'act like a senior engineer' },
  { re: /\bmake sure everything works\b/i, phrase: 'make sure everything works' },
  { re: /\bcode should be (clean|readable|maintainable|well[- ]written)\b/i, phrase: 'code should be clean' },
  { re: /\bfollow (coding|industry) standards\b/i, phrase: 'follow coding standards' },
  { re: /\bwrite (proper|appropriate|sensible) (code|tests)\b/i, phrase: 'write proper code' },
  { re: /\bavoid (bugs|errors|mistakes)\b/i, phrase: 'avoid bugs' },
  { re: /\bpay attention to detail\b/i, phrase: 'pay attention to detail' },
  { re: /\buse (good|proper|meaningful) (naming|names|variable names)\b/i, phrase: 'use good naming' },
  { re: /\bdon'?t (write|introduce) (bad|sloppy|messy) code\b/i, phrase: "don't write bad code" },
  { re: /\bensure (code )?quality\b/i, phrase: 'ensure quality' },
  { re: /\bthink (carefully|hard) (about|before)\b/i, phrase: 'think carefully' },
]

export const styleVagueInstruction: Rule = {
  id: 'style/vague-instruction',
  defaultSeverity: 'info',
  docs: {
    summary: 'No-op instruction that consumes tokens without changing behavior',
    rationale:
      'Instructions like "follow best practices" carry no decision-relevant information — the model already tries to do that. The ETH study found human-curated minimal files outperform padded ones; every line should encode a real, project-specific constraint.',
    citation: 'https://arxiv.org/abs/2602.11988',
  },
  check(file) {
    const findings: Finding[] = []
    for (let i = file.bodyStartLine - 1; i < file.lines.length; i++) {
      if (file.inFence[i]) continue
      const line = file.lines[i]!
      for (const { re, phrase } of VAGUE_PATTERNS) {
        if (re.test(line)) {
          findings.push({
            ruleId: this.id,
            severity: 'info',
            file: file.path,
            line: i + 1,
            message: `no-op instruction ('${phrase}') — replace with a concrete, project-specific constraint or delete`,
          })
          break // one finding per line
        }
      }
    }
    return findings
  },
}
