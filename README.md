# json-tree-merge

[![npm version](https://img.shields.io/npm/v/json-tree-merge.svg)](https://www.npmjs.com/package/json-tree-merge)
[![license](https://img.shields.io/npm/l/json-tree-merge.svg)](LICENSE)
[![node](https://img.shields.io/node/v/json-tree-merge.svg)](https://nodejs.org)

> Scan a directory tree for `<group>.json` files and fold them into a single
> nested-object JSON per `<group>`. Framework- and domain-agnostic — great for
> [next-intl](https://next-intl.dev) locale merging, but the engine knows
> nothing about locales or messages.

- **Zero runtime dependencies** — only `node:fs` and `node:path`.
- **Atomic writes** — uses the `tmp + rename` pattern so a crash never leaves
  half-written files.
- **Works via CLI and as a library** — same engine either way.
- **Runs through `npx`** — no global install needed.
- **TypeScript types included.**

---

## Quick start

### Via `npx` (no install)

```bash
npx json-tree-merge \
  --input ./packages \
  --output ./messages \
  --groups en,ru \
  --exclude messages,src
```

### Install locally

```bash
npm install --save-dev json-tree-merge
# or: pnpm add -D json-tree-merge / yarn add -D json-tree-merge
```

Then in `package.json`:

```jsonc
{
  "scripts": {
    "merge:i18n": "json-tree-merge --input ./packages --output ./messages --groups en,ru"
  }
}
```

---

## What it does

For each input directory, the engine recursively finds files whose basename
matches one of the supplied `groupNames` (`en.json`, `ru.json`, …), reads
them, and merges the contents into a single output JSON per group. Each
directory segment between an input path and the file becomes a nested key,
minus anything in `excludePathSegments`.

### Example

Given this tree:

```
packages/
├── auth/
│   └── messages/
│       ├── en.json   {"login": "Log in"}
│       └── ru.json   {"login": "Войти"}
└── billing/
    └── messages/
        └── en.json   {"checkout": "Checkout"}
```

Running:

```bash
npx json-tree-merge \
  --input ./packages \
  --output ./messages \
  --groups en,ru \
  --exclude messages
```

Produces:

```jsonc
// messages/en.json
{
  "auth": { "login": "Log in" },
  "billing": { "checkout": "Checkout" }
}

// messages/ru.json
{
  "auth": { "login": "Войти" }
}
```

The `messages` segment is stripped because it was passed to `--exclude`.

---

## CLI

```
json-tree-merge [options]
```

| Flag                  | Alias | Description                                                              |
| --------------------- | ----- | ------------------------------------------------------------------------ |
| `--input <dir>`       | `-i`  | Directory to scan recursively. Repeatable, or comma-separated.           |
| `--output <dir>`      | `-o`  | Directory where merged `<group>.json` files are written.                 |
| `--groups <names>`    | `-g`  | Comma-separated allowed basenames (e.g. `en,ru`).                        |
| `--exclude <names>`   | `-e`  | Comma-separated path segments to strip from the nested keys.             |
| `--config <file>`     | `-c`  | Load options from a JSON config file. Flags override file values.        |
| `--debug`             |       | Print verbose progress to stderr.                                        |
| `--help`              | `-h`  | Show help.                                                               |
| `--version`           | `-v`  | Print version.                                                           |

Repeating flags is equivalent to a comma-separated list:

```bash
json-tree-merge -i ./apps -i ./packages -o ./out -g en,ru
# same as
json-tree-merge -i ./apps,./packages -o ./out -g en,ru
```

### Config file

If `--config <file>` is not specified, the CLI looks for
`json-tree-merge.config.json` (then `.json-tree-merge.json`) in the current
working directory. CLI flags always override config values.

```jsonc
// json-tree-merge.config.json
{
  "input": ["./packages", "./apps"],
  "output": "./messages",
  "groups": ["en", "ru"],
  "exclude": ["messages", "src"],
  "debug": false
}
```

Run with just:

```bash
npx json-tree-merge
```

### Exit codes

| Code | Meaning                                                |
| ---- | ------------------------------------------------------ |
| `0`  | Success.                                               |
| `1`  | Runtime error (I/O, invalid JSON, etc).                |
| `2`  | Invalid CLI usage or missing/invalid configuration.    |

---

## Programmatic API

```ts
import { mergeJsonTree, createLogger } from "json-tree-merge"

const { sourceFiles, written } = mergeJsonTree({
  inputPaths: ["/abs/path/to/packages", "/abs/path/to/apps"],
  outputDir: "/abs/path/to/messages",
  groupNames: ["en", "ru"] as const,
  excludePathSegments: ["messages", "src"],
  logger: createLogger(true),     // optional — defaults to no-op
  isShuttingDown: () => false,    // optional — defaults to () => false
})

console.log(`Wrote ${written.length} groups from ${sourceFiles} files`)
```

### `mergeJsonTree(options)`

The primary entry point. Scans, merges, and writes one file per group.

| Option                | Type                | Default       | Description                                                              |
| --------------------- | ------------------- | ------------- | ------------------------------------------------------------------------ |
| `inputPaths`          | `string[]`          | —             | Absolute directories to scan recursively.                                |
| `outputDir`           | `string`            | —             | Absolute directory where merged `<group>.json` files are written.        |
| `groupNames`          | `readonly string[]` | —             | Allowed file basenames. `de.json` is ignored unless `"de"` is listed.    |
| `excludePathSegments` | `string[]`          | `[]`          | Path segments stripped when computing the nested key path.               |
| `logger`              | `Logger`            | no-op         | `(...args) => void`. Use `createLogger(true)` for verbose output.        |
| `isShuttingDown`      | `() => boolean`     | `() => false` | Hook to abort writes during graceful shutdown (e.g. SIGTERM handlers).   |
| `relevantChanges`     | `string[]`          | `[]`          | Files that triggered this merge (used only for log output).              |

Returns:

```ts
{ sourceFiles: number; written: string[] }
```

### Primitives

For advanced consumers that want to compose differently:

| Export                  | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `scanDirectory`         | Recursive scanner.                                   |
| `mergeFilesIntoTree`    | Pure transform (no I/O).                             |
| `writeTree`             | Atomic write of the merged tree.                     |
| `findGroupFiles`        | Scan wrapper across multiple input paths.            |
| `isGroupJsonFile`       | Basename predicate.                                  |
| `isGroupFileInScope`    | Full predicate (in input, not in output, allowed).   |
| `createLogger(debug)`   | Debug-gated logger factory.                          |

---

## Behavior details

### Atomic writes

Files are written via the `tmp + rename` pattern, so a SIGTERM during the
write cannot leave the destination truncated. `rename` is atomic on POSIX
within the same filesystem.

### Shutdown gating

Pass `isShuttingDown` so the engine can skip writes once your host process
starts shutting down. The library itself doesn't install signal handlers —
that's the integration's responsibility.

### Logging

The library emits unprefixed messages via the injected `logger`. Integrations
typically wrap `createLogger` with their own prefix:

```ts
const baseLogger = createLogger(debug)
const logger: Logger = (...args) => baseLogger("[MyPlugin]", ...args)
```

### Skipped directories

The recursive scan skips `node_modules`, `.next`, `.turbo`, `.git`, and `dist`
by default. The output directory is also skipped automatically, so re-running
the CLI never re-ingests its own output.

---

## Requirements

- Node.js **18** or newer.

---

## License

[MIT](LICENSE)
