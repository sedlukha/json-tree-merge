import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { Writable } from "node:stream"
import { afterEach, beforeEach, describe, it } from "node:test"

import { runCli } from "../src/cli/main.js"

const makeTempDir = (): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), "json-tree-merge-cli-test-"))

const writeJson = (filePath: string, data: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
}

const captureStream = (): { stream: Writable; data: () => string } => {
  let buffer = ""
  const stream = new Writable({
    write(chunk, _enc, cb) {
      buffer += chunk.toString()
      cb()
    },
  })
  return { stream, data: () => buffer }
}

describe("runCli", () => {
  let tmpRoot: string

  beforeEach(() => {
    tmpRoot = makeTempDir()
  })

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  })

  it("merges via CLI flags", () => {
    const inputDir = path.join(tmpRoot, "in")
    const outputDir = path.join(tmpRoot, "out")
    fs.mkdirSync(outputDir, { recursive: true })
    writeJson(path.join(inputDir, "auth", "en.json"), { ok: "OK" })

    const stdout = captureStream()
    const stderr = captureStream()

    const code = runCli({
      argv: ["--input", inputDir, "--output", outputDir, "--groups", "en"],
      cwd: tmpRoot,
      stderr: stderr.stream,
      stdout: stdout.stream,
    })

    assert.equal(code, 0, stderr.data())
    assert.match(stdout.data(), /Merged 1 file\(s\)/)
    const en = JSON.parse(
      fs.readFileSync(path.join(outputDir, "en.json"), "utf-8")
    )
    assert.deepEqual(en, { auth: { ok: "OK" } })
  })

  it("loads options from a config file in cwd", () => {
    const inputDir = path.join(tmpRoot, "in")
    const outputDir = path.join(tmpRoot, "out")
    fs.mkdirSync(outputDir, { recursive: true })
    writeJson(path.join(inputDir, "auth", "en.json"), { ok: "OK" })
    fs.writeFileSync(
      path.join(tmpRoot, "json-tree-merge.config.json"),
      JSON.stringify({
        input: ["./in"],
        output: "./out",
        groups: ["en"],
      })
    )

    const stdout = captureStream()
    const stderr = captureStream()

    const code = runCli({
      argv: [],
      cwd: tmpRoot,
      stderr: stderr.stream,
      stdout: stdout.stream,
    })

    assert.equal(code, 0, stderr.data())
    const en = JSON.parse(
      fs.readFileSync(path.join(outputDir, "en.json"), "utf-8")
    )
    assert.deepEqual(en, { auth: { ok: "OK" } })
  })

  it("flags override config file values", () => {
    const inputDir = path.join(tmpRoot, "in")
    const wrongOutput = path.join(tmpRoot, "wrong")
    const rightOutput = path.join(tmpRoot, "right")
    fs.mkdirSync(rightOutput, { recursive: true })
    fs.mkdirSync(wrongOutput, { recursive: true })
    writeJson(path.join(inputDir, "auth", "en.json"), { ok: "OK" })
    fs.writeFileSync(
      path.join(tmpRoot, "json-tree-merge.config.json"),
      JSON.stringify({
        input: ["./in"],
        output: "./wrong",
        groups: ["en"],
      })
    )

    const stdout = captureStream()
    const stderr = captureStream()

    const code = runCli({
      argv: ["--output", rightOutput],
      cwd: tmpRoot,
      stderr: stderr.stream,
      stdout: stdout.stream,
    })

    assert.equal(code, 0, stderr.data())
    assert.ok(fs.existsSync(path.join(rightOutput, "en.json")))
    assert.ok(!fs.existsSync(path.join(wrongOutput, "en.json")))
  })

  it("returns code 2 and prints help when required options are missing", () => {
    const stdout = captureStream()
    const stderr = captureStream()

    const code = runCli({
      argv: ["--input", "./somewhere"],
      cwd: tmpRoot,
      stderr: stderr.stream,
      stdout: stdout.stream,
    })

    assert.equal(code, 2)
    assert.match(stderr.data(), /Missing required option/)
  })

  it("prints help with --help and returns 0", () => {
    const stdout = captureStream()
    const stderr = captureStream()

    const code = runCli({
      argv: ["--help"],
      cwd: tmpRoot,
      stderr: stderr.stream,
      stdout: stdout.stream,
    })

    assert.equal(code, 0)
    assert.match(stdout.data(), /json-tree-merge/)
    assert.match(stdout.data(), /Usage:/)
  })

  it("rejects unknown flags", () => {
    const stdout = captureStream()
    const stderr = captureStream()

    const code = runCli({
      argv: ["--what"],
      cwd: tmpRoot,
      stderr: stderr.stream,
      stdout: stdout.stream,
    })

    assert.equal(code, 2)
    assert.match(stderr.data(), /Unknown flag/)
  })
})
