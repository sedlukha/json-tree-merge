import fs from "node:fs"

import { createLogger } from "../lib/create-logger.js"
import { mergeJsonTree } from "../lib/merge-json-tree.js"
import { HELP_TEXT } from "./help.js"
import { type FileConfig, findConfigFile, loadConfig } from "./load-config.js"
import { type ParsedArgs, parseArgs } from "./parse-args.js"
import { type ResolvedOptions, resolveOptions } from "./resolve-options.js"

const readVersion = (): string => {
  // Resolved relative to the compiled file in dist/cli/main.js — climb to the
  // package root. For npx, this is the unpacked tarball.
  const url = new URL("../../package.json", import.meta.url)
  const raw = fs.readFileSync(url, "utf-8")

  return (JSON.parse(raw) as { version: string }).version
}

export const runCli = ({
  argv,
  cwd,
  stderr,
  stdout,
}: {
  argv: string[]
  cwd: string
  stderr: NodeJS.WritableStream
  stdout: NodeJS.WritableStream
}): number => {
  let args: ParsedArgs
  try {
    args = parseArgs(argv)
  } catch (error) {
    stderr.write(`${(error as Error).message}\n`)

    return 2
  }

  if (args.help) {
    stdout.write(HELP_TEXT)

    return 0
  }

  if (args.version) {
    try {
      stdout.write(`${readVersion()}\n`)

      return 0
    } catch {
      stdout.write("0.0.0\n")

      return 0
    }
  }

  let config: FileConfig | null = null

  try {
    const configPath = findConfigFile(args.config, cwd)
    if (configPath) {
      config = loadConfig(configPath)
    }
  } catch (error) {
    stderr.write(`${(error as Error).message}\n`)

    return 2
  }

  let options: ResolvedOptions
  try {
    options = resolveOptions({ args, config, cwd })
  } catch (error) {
    stderr.write(`${(error as Error).message}\n`)

    return 2
  }

  const logger = createLogger(options.debug)

  try {
    const { sourceFiles, written } = mergeJsonTree({
      excludePathSegments: options.excludePathSegments,
      groupNames: options.groupNames,
      inputPaths: options.inputPaths,
      logger,
      outputDir: options.outputDir,
    })

    stdout.write(
      `Merged ${sourceFiles} file(s) into ${written.length} group(s): ${written.join(", ") || "none"}\n`
    )

    return 0
  } catch (error) {
    stderr.write(`Error: ${(error as Error).message}\n`)

    return 1
  }
}
