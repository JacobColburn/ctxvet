import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ResolvedConfig, Severity } from './types.js'

export const DEFAULT_CONFIG: ResolvedConfig = {
  rules: {},
  ignore: [],
  size: {
    warnLines: 300,
    warnBytes: 12_000,
    errorLines: 600,
    errorBytes: 25_000,
    skillWarnLines: 500,
  },
}

const SEVERITIES = new Set(['error', 'warn', 'info', 'off'])

export class ConfigError extends Error {}

/** Strip // and /* *\/ comments (outside strings) so the config can be commented. */
export function stripJsonComments(text: string): string {
  let out = ''
  let inString = false
  let inLine = false
  let inBlock = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    const next = text[i + 1]
    if (inLine) {
      if (c === '\n') {
        inLine = false
        out += c
      }
      continue
    }
    if (inBlock) {
      if (c === '*' && next === '/') {
        inBlock = false
        i++
      }
      continue
    }
    if (inString) {
      out += c
      if (c === '\\') {
        if (next !== undefined) {
          out += next
          i++
        }
      } else if (c === '"') {
        inString = false
      }
      continue
    }
    if (c === '"') {
      inString = true
      out += c
    } else if (c === '/' && next === '/') {
      inLine = true
      i++
    } else if (c === '/' && next === '*') {
      inBlock = true
      i++
    } else {
      out += c
    }
  }
  return out
}

/** Load .ctxvetrc.json from root; missing file yields defaults, invalid file throws ConfigError. */
export function loadConfig(root: string): ResolvedConfig {
  let text: string
  try {
    text = readFileSync(join(root, '.ctxvetrc.json'), 'utf8')
  } catch {
    return DEFAULT_CONFIG
  }
  let raw: unknown
  try {
    raw = JSON.parse(stripJsonComments(text))
  } catch (e) {
    throw new ConfigError(`.ctxvetrc.json is not valid JSON: ${e instanceof Error ? e.message : e}`)
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ConfigError('.ctxvetrc.json must be a JSON object')
  }
  const obj = raw as Record<string, unknown>
  const config: ResolvedConfig = {
    rules: {},
    ignore: [],
    size: { ...DEFAULT_CONFIG.size },
  }
  if (obj.rules !== undefined) {
    if (typeof obj.rules !== 'object' || obj.rules === null || Array.isArray(obj.rules)) {
      throw new ConfigError('"rules" must be an object of ruleId -> "error"|"warn"|"info"|"off"')
    }
    for (const [id, sev] of Object.entries(obj.rules as Record<string, unknown>)) {
      if (typeof sev !== 'string' || !SEVERITIES.has(sev)) {
        throw new ConfigError(`rule "${id}": severity must be "error", "warn", "info", or "off" (got ${JSON.stringify(sev)})`)
      }
      config.rules[id] = sev as Severity | 'off'
    }
  }
  if (obj.ignore !== undefined) {
    if (!Array.isArray(obj.ignore) || obj.ignore.some((g) => typeof g !== 'string')) {
      throw new ConfigError('"ignore" must be an array of glob strings')
    }
    config.ignore = obj.ignore as string[]
  }
  if (obj.size !== undefined) {
    if (typeof obj.size !== 'object' || obj.size === null || Array.isArray(obj.size)) {
      throw new ConfigError('"size" must be an object')
    }
    for (const key of Object.keys(config.size) as Array<keyof typeof config.size>) {
      const v = (obj.size as Record<string, unknown>)[key]
      if (v === undefined) continue
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
        throw new ConfigError(`size.${key} must be a positive number`)
      }
      config.size[key] = v
    }
  }
  return config
}

export const INIT_TEMPLATE = `{
  // ctxvet configuration — delete any section to use defaults.
  // Severity per rule: "error" | "warn" | "info" | "off"
  "rules": {
    // "style/vague-instruction": "off"
  },
  // Extra glob patterns to skip during discovery (repo-relative)
  "ignore": [
    // "vendor/**"
  ],
  // Size thresholds for context files
  "size": {
    "warnLines": 300,
    "warnBytes": 12000,
    "errorLines": 600,
    "errorBytes": 25000,
    "skillWarnLines": 500
  }
}
`
