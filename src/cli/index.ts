#!/usr/bin/env node

import { runCli } from "./main.js"

const exitCode = runCli({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  stderr: process.stderr,
  stdout: process.stdout,
})

process.exit(exitCode)
