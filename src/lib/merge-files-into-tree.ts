import fs from "node:fs"
import path from "node:path"

interface NestedTree {
  [key: string]: NestedTree | unknown
}

const readJsonFile = (filePath: string): NestedTree => {
  let raw: string

  try {
    raw = fs.readFileSync(filePath, "utf-8")
  } catch (error) {
    throw new Error(`Failed to read ${filePath}`, { cause: error })
  }

  try {
    return JSON.parse(raw) as NestedTree
  } catch (error) {
    throw new Error(`Failed to parse JSON in ${filePath}`, { cause: error })
  }
}

export const mergeFilesIntoTree = ({
  excludePathSegments,
  files,
  inputPaths,
}: {
  excludePathSegments: string[]
  files: string[]
  inputPaths: string[]
}): Record<string, NestedTree> =>
  files.reduce<Record<string, NestedTree>>((tree, filePath) => {
    const fileName = path.basename(filePath)
    const groupName = path.basename(fileName, ".json")

    // `inputPaths` are expected to be absolute. Pick the longest matching
    // parent so nested input paths resolve to the deepest match.
    const matchingInputPath = inputPaths
      .filter((inputPath) => {
        const relative = path.relative(inputPath, filePath)

        return !(relative.startsWith("..") || path.isAbsolute(relative))
      })
      .sort((a, b) => b.length - a.length)[0]

    if (!matchingInputPath) {
      throw new Error(`File path ${filePath} does not match any input paths.`)
    }

    const relativeDir = path.relative(matchingInputPath, path.dirname(filePath))
    const pathParts = relativeDir
      .split(path.sep)
      .filter((part) => part && !excludePathSegments.includes(part))

    const fileContents = readJsonFile(filePath)

    tree[groupName] ??= {}

    const branch = pathParts.reduce<NestedTree>((current, part) => {
      current[part] ??= {}

      return current[part] as NestedTree
    }, tree[groupName])

    Object.assign(branch, fileContents)

    return tree
  }, {})
