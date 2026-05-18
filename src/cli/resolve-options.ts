import path from "node:path"

import type { FileConfig } from "./load-config.js"
import type { ParsedArgs } from "./parse-args.js"

export interface ResolvedOptions {
  debug: boolean
  excludePathSegments: string[]
  groupNames: string[]
  inputPaths: string[]
  outputDir: string
}

const resolveDir = (cwd: string, value: string): string =>
  path.isAbsolute(value) ? value : path.resolve(cwd, value)

// Merge precedence: CLI flags > config file > defaults. Required fields are
// surfaced via a single error so users see everything that's missing at once.
export const resolveOptions = ({
  args,
  config,
  cwd,
}: {
  args: ParsedArgs
  config: FileConfig | null
  cwd: string
}): ResolvedOptions => {
  const inputRaw = args.input ?? config?.input
  const outputRaw = args.output ?? config?.output
  const groupsRaw = args.groups ?? config?.groups
  const excludeRaw = args.exclude ?? config?.exclude ?? []
  const debug = args.debug ?? config?.debug ?? false

  const missing: string[] = []
  if (!inputRaw || inputRaw.length === 0) {
    missing.push("input")
  }
  if (!outputRaw) {
    missing.push("output")
  }
  if (!groupsRaw || groupsRaw.length === 0) {
    missing.push("groups")
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required option(s): ${missing.join(", ")}. Run with --help.`
    )
  }

  return {
    debug,
    excludePathSegments: excludeRaw,
    groupNames: groupsRaw as string[],
    inputPaths: (inputRaw as string[]).map((dir) => resolveDir(cwd, dir)),
    outputDir: resolveDir(cwd, outputRaw as string),
  }
}
