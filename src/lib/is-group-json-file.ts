import path from "node:path"

export const isGroupJsonFile = (
  fileName: string,
  groupNames: readonly string[]
): boolean => {
  const ext = path.extname(fileName)
  const name = path.basename(fileName, ext)

  return ext === ".json" && groupNames.includes(name)
}
