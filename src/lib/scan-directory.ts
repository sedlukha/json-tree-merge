import fs from "node:fs"
import path from "node:path"

import { isGroupJsonFile } from "./is-group-json-file.js"

const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", ".git", "dist"])

const isInside = (childAbs: string, parentAbs: string) => {
  const relative = path.relative(parentAbs, childAbs)

  return (
    relative === "" || !(relative.startsWith("..") || path.isAbsolute(relative))
  )
}

// Recursively scan a directory for group JSON files. Skips well-known
// build/output folders so we never re-ingest our own output.
export const scanDirectory = ({
  directory,
  groupNames,
  outputPath,
}: {
  directory: string
  groupNames: readonly string[]
  outputPath: string
}): string[] => {
  if (isInside(path.resolve(directory), path.resolve(outputPath))) {
    return []
  }

  const items = fs.readdirSync(directory, { withFileTypes: true })

  return items.flatMap((item): string[] => {
    const fullPath = path.join(directory, item.name)

    if (item.isDirectory()) {
      if (SKIP_DIRS.has(item.name)) {
        return []
      }

      return scanDirectory({
        directory: fullPath,
        groupNames,
        outputPath,
      })
    }

    if (item.isFile() && isGroupJsonFile(item.name, groupNames)) {
      return [fullPath]
    }

    return []
  })
}
