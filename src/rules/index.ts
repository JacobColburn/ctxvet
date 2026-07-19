import { dupCrossFile } from './dup-cross-file.js'
import { repoDeadPath } from './repo-dead-path.js'
import { repoDeadScript } from './repo-dead-script.js'
import { repoOrphanRuleFile } from './repo-orphan-rule-file.js'
import { secretLeak } from './secret-leak.js'
import { sizeBloat } from './size-bloat.js'
import { skillDescriptionQuality } from './skill-description-quality.js'
import { skillFrontmatter } from './skill-frontmatter.js'
import { styleVagueInstruction } from './style-vague-instruction.js'
import type { Rule } from '../types.js'

/** Repo-grounded rules first: they are the differentiator and lead the report. */
export const ALL_RULES: Rule[] = [
  repoDeadPath,
  repoDeadScript,
  repoOrphanRuleFile,
  sizeBloat,
  dupCrossFile,
  styleVagueInstruction,
  skillFrontmatter,
  skillDescriptionQuality,
  secretLeak,
]
