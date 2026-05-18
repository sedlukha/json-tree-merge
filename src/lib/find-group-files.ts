import type { Logger } from "./create-logger.js"
import { scanDirectory } from "./scan-directory.js"

// `inputPaths` and `outputDir` are expected to be absolute. The library does
// not re-resolve them — callers are responsible for normalization.
export const findGroupFiles = ({
  groupNames,
  inputPaths,
  logger,
  outputDir,
}: {
  groupNames: readonly string[]
  inputPaths: string[]
  logger: Logger
  outputDir: string
}): string[] => {
  logger("Starting file scan...")
  logger("Input paths:", inputPaths)
  logger("Output dir:", outputDir)
  logger("Looking for groups:", groupNames)

  const results = inputPaths.flatMap((directory) => {
    logger("Scanning directory:", directory)

    return scanDirectory({
      directory,
      groupNames,
      outputPath: outputDir,
    })
  })

  logger("Total files found:", results.length)

  return results
}
