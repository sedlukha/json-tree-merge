import fs from "node:fs"
import path from "node:path"

export interface FileConfig {
  debug?: boolean
  exclude?: string[]
  groups?: string[]
  input?: string[]
  output?: string
}

const DEFAULT_CONFIG_NAMES = [
  "json-tree-merge.config.json",
  ".json-tree-merge.json",
]

// Locates a config file: explicit path wins; otherwise probes well-known names
// in `cwd`. Returns `null` (not throws) when nothing is found so the CLI can
// fall back to pure-flag mode.
export const findConfigFile = (
  explicitPath: string | undefined,
  cwd: string
): string | null => {
  if (explicitPath) {
    const absolute = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.resolve(cwd, explicitPath)

    if (!fs.existsSync(absolute)) {
      throw new Error(`Config file not found: ${absolute}`)
    }

    return absolute
  }

  for (const name of DEFAULT_CONFIG_NAMES) {
    const candidate = path.resolve(cwd, name)

    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string")

const validate = (raw: unknown, source: string): FileConfig => {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${source}: config must be a JSON object`)
  }

  const obj = raw as Record<string, unknown>
  const result: FileConfig = {}

  if (obj.input !== undefined) {
    if (!isStringArray(obj.input)) {
      throw new Error(`${source}: "input" must be an array of strings`)
    }
    result.input = obj.input
  }
  if (obj.output !== undefined) {
    if (typeof obj.output !== "string") {
      throw new Error(`${source}: "output" must be a string`)
    }
    result.output = obj.output
  }
  if (obj.groups !== undefined) {
    if (!isStringArray(obj.groups)) {
      throw new Error(`${source}: "groups" must be an array of strings`)
    }
    result.groups = obj.groups
  }
  if (obj.exclude !== undefined) {
    if (!isStringArray(obj.exclude)) {
      throw new Error(`${source}: "exclude" must be an array of strings`)
    }
    result.exclude = obj.exclude
  }
  if (obj.debug !== undefined) {
    if (typeof obj.debug !== "boolean") {
      throw new Error(`${source}: "debug" must be a boolean`)
    }
    result.debug = obj.debug
  }

  return result
}

export const loadConfig = (configPath: string): FileConfig => {
  let raw: string

  try {
    raw = fs.readFileSync(configPath, "utf-8")
  } catch (error) {
    throw new Error(`Failed to read config ${configPath}`, { cause: error })
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(`Failed to parse config ${configPath}`, { cause: error })
  }

  return validate(parsed, configPath)
}
