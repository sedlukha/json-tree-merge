import { renameSync, unlinkSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import type { Logger } from "./create-logger.js"

// Atomic write: stage to a temp file then rename over the destination.
// POSIX `rename` is atomic on the same filesystem, so a reader (or a
// SIGTERM mid-write) can never observe a truncated file.
const atomicWrite = (destination: string, content: string) => {
  const tempPath = `${destination}.${process.pid}.tmp`

  try {
    writeFileSync(tempPath, content, "utf-8")
    renameSync(tempPath, destination)
  } catch (error) {
    try {
      unlinkSync(tempPath)
    } catch {
      // Temp may not exist if writeFileSync failed before creating it.
    }

    throw error
  }
}

export const writeTree = ({
  isShuttingDown,
  logger,
  outputDir,
  tree,
}: {
  isShuttingDown: () => boolean
  logger: Logger
  outputDir: string
  tree: Record<string, unknown>
}): { written: string[] } => {
  const written: string[] = []

  if (isShuttingDown()) {
    logger("Skipping write — process is shutting down")

    return { written }
  }

  logger("Writing tree to disk...")
  logger("Output dir:", outputDir)

  for (const [groupName, branch] of Object.entries(tree)) {
    if (isShuttingDown()) {
      logger(`Aborting before ${groupName}.json — shutting down`)

      return { written }
    }

    try {
      const destination = resolve(outputDir, `${groupName}.json`)
      const content = JSON.stringify(branch, null, 2)

      logger(`Writing ${groupName}.json (${content.length} bytes)`)
      atomicWrite(destination, content)
      written.push(groupName)
      logger(`Wrote ${groupName}.json`)
    } catch (error) {
      logger(`Error writing ${groupName}.json:`, error)
    }
  }

  logger("All files written")

  return { written }
}
