import path from "node:path"

import { isGroupJsonFile } from "./is-group-json-file.js"

// `path.relative` returns a non-`..` path only when `filePath` is inside `dir`,
// which is safer than a substring check.
const isInside = (filePath: string, dir: string) => {
  const relative = path.relative(dir, filePath)

  return (
    Boolean(relative) &&
    !relative.startsWith("..") &&
    !path.isAbsolute(relative)
  )
}

export const isGroupFileInScope = ({
  filePath,
  groupNames,
  inputPaths,
  outputDir,
}: {
  filePath: string
  groupNames: readonly string[]
  inputPaths: string[]
  outputDir: string
}): boolean => {
  const isInInputPath = inputPaths.some((inputPath) =>
    isInside(filePath, inputPath)
  )
  const isInOutputPath = isInside(filePath, outputDir)

  return (
    isInInputPath && !isInOutputPath && isGroupJsonFile(filePath, groupNames)
  )
}
