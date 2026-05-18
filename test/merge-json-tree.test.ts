import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, it } from "node:test"

import { mergeJsonTree } from "../src/lib/merge-json-tree.js"

const makeTempDir = (): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), "json-tree-merge-test-"))

const writeJson = (filePath: string, data: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
}

const readJson = (filePath: string): unknown =>
  JSON.parse(fs.readFileSync(filePath, "utf-8"))

describe("mergeJsonTree", () => {
  let tmpRoot: string
  let inputDir: string
  let outputDir: string

  beforeEach(() => {
    tmpRoot = makeTempDir()
    inputDir = path.join(tmpRoot, "input")
    outputDir = path.join(tmpRoot, "output")
    fs.mkdirSync(inputDir, { recursive: true })
    fs.mkdirSync(outputDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  })

  it("merges flat files into one tree per group", () => {
    writeJson(path.join(inputDir, "auth", "en.json"), { login: "Log in" })
    writeJson(path.join(inputDir, "auth", "ru.json"), { login: "Войти" })
    writeJson(path.join(inputDir, "settings", "en.json"), { title: "Settings" })

    const result = mergeJsonTree({
      groupNames: ["en", "ru"],
      inputPaths: [inputDir],
      outputDir,
    })

    assert.equal(result.sourceFiles, 3)
    assert.deepEqual(result.written.sort(), ["en", "ru"])

    const en = readJson(path.join(outputDir, "en.json"))
    assert.deepEqual(en, {
      auth: { login: "Log in" },
      settings: { title: "Settings" },
    })

    const ru = readJson(path.join(outputDir, "ru.json"))
    assert.deepEqual(ru, { auth: { login: "Войти" } })
  })

  it("strips excluded path segments from nested keys", () => {
    writeJson(path.join(inputDir, "auth", "messages", "en.json"), { ok: "OK" })

    mergeJsonTree({
      excludePathSegments: ["messages"],
      groupNames: ["en"],
      inputPaths: [inputDir],
      outputDir,
    })

    const en = readJson(path.join(outputDir, "en.json"))
    assert.deepEqual(en, { auth: { ok: "OK" } })
  })

  it("ignores files whose basename is not in groupNames", () => {
    writeJson(path.join(inputDir, "auth", "en.json"), { a: 1 })
    writeJson(path.join(inputDir, "auth", "de.json"), { a: 2 })

    const result = mergeJsonTree({
      groupNames: ["en"],
      inputPaths: [inputDir],
      outputDir,
    })

    assert.equal(result.sourceFiles, 1)
    assert.deepEqual(result.written, ["en"])
    assert.ok(!fs.existsSync(path.join(outputDir, "de.json")))
  })

  it("returns empty result when nothing matches", () => {
    writeJson(path.join(inputDir, "auth", "de.json"), { a: 1 })

    const result = mergeJsonTree({
      groupNames: ["en"],
      inputPaths: [inputDir],
      outputDir,
    })

    assert.equal(result.sourceFiles, 0)
    assert.deepEqual(result.written, [])
  })

  it("skips writes when isShuttingDown returns true", () => {
    writeJson(path.join(inputDir, "auth", "en.json"), { a: 1 })

    const result = mergeJsonTree({
      groupNames: ["en"],
      inputPaths: [inputDir],
      isShuttingDown: () => true,
      outputDir,
    })

    assert.equal(result.sourceFiles, 1)
    assert.deepEqual(result.written, [])
    assert.ok(!fs.existsSync(path.join(outputDir, "en.json")))
  })

  it("merges across multiple input paths", () => {
    const secondInput = path.join(tmpRoot, "input2")
    fs.mkdirSync(secondInput, { recursive: true })
    writeJson(path.join(inputDir, "auth", "en.json"), { a: 1 })
    writeJson(path.join(secondInput, "billing", "en.json"), { b: 2 })

    mergeJsonTree({
      groupNames: ["en"],
      inputPaths: [inputDir, secondInput],
      outputDir,
    })

    const en = readJson(path.join(outputDir, "en.json"))
    assert.deepEqual(en, { auth: { a: 1 }, billing: { b: 2 } })
  })
})
