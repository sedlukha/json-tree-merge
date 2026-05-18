import path from "node:path"

import type { Logger } from "./create-logger.js"
import { findGroupFiles } from "./find-group-files.js"
import { mergeFilesIntoTree } from "./merge-files-into-tree.js"
import { writeTree } from "./write-tree.js"

const noop: Logger = () => {}

const alwaysFalse = () => false

export const mergeJsonTree = ({
  excludePathSegments,
  groupNames,
  inputPaths,
  isShuttingDown = alwaysFalse,
  logger = noop,
  outputDir,
  relevantChanges = [],
}: {
  excludePathSegments?: string[]
  groupNames: readonly string[]
  inputPaths: string[]
  isShuttingDown?: () => boolean
  logger?: Logger
  outputDir: string
  relevantChanges?: string[]
}): { sourceFiles: number; written: string[] } => {
  if (relevantChanges.length > 0) {
    const fileNames = relevantChanges.map((f) => path.basename(f)).join(", ")
    logger(`Merging: ${fileNames}`)
  }

  logger("Getting group files from:", inputPaths)

  const groupFiles = findGroupFiles({
    groupNames,
    inputPaths,
    logger,
    outputDir,
  })

  logger("Found group files count:", groupFiles.length)

  if (groupFiles.length === 0) {
    logger("No group files found!")

    return { sourceFiles: 0, written: [] }
  }

  logger("Merging files into tree...")

  const tree = mergeFilesIntoTree({
    excludePathSegments: excludePathSegments ?? [],
    files: groupFiles,
    inputPaths,
  })

  logger("Tree top-level keys:", Object.keys(tree))

  const { written } = writeTree({
    isShuttingDown,
    logger,
    outputDir,
    tree,
  })

  logger("Merge completed")

  return { sourceFiles: groupFiles.length, written }
}
