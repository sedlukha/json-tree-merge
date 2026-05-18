export interface ParsedArgs {
  config?: string
  debug?: boolean
  exclude?: string[]
  groups?: string[]
  help?: boolean
  input?: string[]
  output?: string
  version?: boolean
}

const splitList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

// Tiny argv parser: supports `--flag value`, `--flag=value`, repeated flags
// (e.g. `--input a --input b`), and boolean flags (`--debug`, `--help`).
// Avoids pulling in `yargs`/`commander` for a ~6-flag CLI.
export const parseArgs = (argv: string[]): ParsedArgs => {
  const result: ParsedArgs = {}
  const inputs: string[] = []
  const groups: string[] = []
  const excludes: string[] = []

  let i = 0

  while (i < argv.length) {
    const token = argv[i]
    let key: string
    let value: string | undefined

    if (token === undefined) {
      break
    }

    if (token.startsWith("--")) {
      const eq = token.indexOf("=")

      if (eq >= 0) {
        key = token.slice(2, eq)
        value = token.slice(eq + 1)
      } else {
        key = token.slice(2)
        const next = argv[i + 1]

        if (next !== undefined && !next.startsWith("--")) {
          value = next
          i += 1
        }
      }
    } else {
      throw new Error(`Unexpected positional argument: ${token}`)
    }

    switch (key) {
      case "input":
      case "i":
        if (value === undefined) {
          throw new Error("--input requires a directory path")
        }
        inputs.push(...splitList(value))
        break
      case "output":
      case "o":
        if (value === undefined) {
          throw new Error("--output requires a directory path")
        }
        result.output = value
        break
      case "groups":
      case "g":
        if (value === undefined) {
          throw new Error("--groups requires a comma-separated list")
        }
        groups.push(...splitList(value))
        break
      case "exclude":
      case "e":
        if (value === undefined) {
          throw new Error("--exclude requires a comma-separated list")
        }
        excludes.push(...splitList(value))
        break
      case "config":
      case "c":
        if (value === undefined) {
          throw new Error("--config requires a file path")
        }
        result.config = value
        break
      case "debug":
        result.debug = value === undefined ? true : value !== "false"
        break
      case "help":
      case "h":
        result.help = true
        break
      case "version":
      case "v":
        result.version = true
        break
      default:
        throw new Error(`Unknown flag: --${key}`)
    }

    i += 1
  }

  if (inputs.length > 0) {
    result.input = inputs
  }
  if (groups.length > 0) {
    result.groups = groups
  }
  if (excludes.length > 0) {
    result.exclude = excludes
  }

  return result
}
