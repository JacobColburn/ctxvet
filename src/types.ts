export type Severity = 'error' | 'warn' | 'info'

export type FileKind =
  | 'claude-md'
  | 'agents-md'
  | 'gemini-md'
  | 'copilot-instructions'
  | 'windsurfrules'
  | 'cursor-rule'
  | 'skill-md'

export interface CodeSpan {
  /** 1-indexed line */
  line: number
  /** 0-indexed column of the span content */
  col: number
  text: string
}

export interface LinkRef {
  line: number
  col: number
  target: string
}

export interface Frontmatter {
  raw: string
  /** parsed YAML, or null when parsing failed */
  data: unknown
  parseError: string | null
  /** 1-indexed line of opening --- */
  startLine: number
  /** 1-indexed line of closing --- */
  endLine: number
}

export interface ContextFile {
  /** repo-relative path, forward slashes */
  path: string
  absPath: string
  kind: FileKind
  text: string
  /** raw lines, index 0 = line 1 */
  lines: string[]
  /** per-line: true when the line is inside (or delimits) a fenced code block */
  inFence: boolean[]
  frontmatter: Frontmatter | null
  /** 1-indexed first body line (after frontmatter, 1 if none) */
  bodyStartLine: number
  /** inline code spans outside fences */
  codeSpans: CodeSpan[]
  /** markdown link targets outside fences */
  links: LinkRef[]
}

export interface Finding {
  ruleId: string
  severity: Severity
  /** repo-relative path */
  file: string
  /** 1-indexed; 0 means whole-file */
  line: number
  message: string
  /** optional machine-readable extras (e.g. duplicate token estimates) */
  data?: Record<string, unknown>
}

export interface SizeThresholds {
  warnLines: number
  warnBytes: number
  errorLines: number
  errorBytes: number
  /** separate line cap for SKILL.md bodies (Anthropic guidance: 500) */
  skillWarnLines: number
}

export interface ResolvedConfig {
  /** rule id -> severity override or 'off' */
  rules: Record<string, Severity | 'off'>
  /** extra ignore globs for discovery (repo-relative) */
  ignore: string[]
  size: SizeThresholds
}

export interface RuleDocs {
  summary: string
  rationale: string
  citation?: string
}

export interface LintContext {
  /** absolute root, forward slashes */
  root: string
  /** every discovered context file (cross-file rules read this) */
  files: ContextFile[]
  /** repo-relative file paths, forward slashes */
  repoFiles: Set<string>
  /** repo-relative directory paths */
  repoDirs: Set<string>
  /** union of script names across all package.json files in the repo */
  packageScripts: Set<string>
  /** true when at least one package.json exists */
  hasPackageJson: boolean
  /** Makefile targets (empty when no Makefile) */
  makeTargets: Set<string>
  config: ResolvedConfig
  /** does a repo-relative path exist (file or dir)? */
  hasPath(p: string): boolean
  /** does any file with this basename exist anywhere in the repo? */
  hasBasename(name: string): boolean
  /** does a glob pattern match at least one repo file? */
  globMatches(pattern: string): boolean
}

export interface Rule {
  id: string
  defaultSeverity: Severity
  docs: RuleDocs
  check(file: ContextFile, ctx: LintContext): Finding[]
}

export interface LintSummary {
  filesScanned: number
  errors: number
  warnings: number
  infos: number
  /** estimated tokens across scanned context files (bytes/4 heuristic) */
  estTokens: number
  /** estimated tokens duplicated across files (from dup/cross-file) */
  estDupTokens: number
}

export interface LintResult {
  findings: Finding[]
  files: string[]
  summary: LintSummary
}
