# json-tree-merge

[![CI](https://github.com/sedlukha/json-tree-merge/actions/workflows/ci.yml/badge.svg)](https://github.com/sedlukha/json-tree-merge/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/json-tree-merge.svg)](https://www.npmjs.com/package/json-tree-merge)
[![npm downloads](https://img.shields.io/npm/dm/json-tree-merge.svg)](https://www.npmjs.com/package/json-tree-merge)
[![license](https://img.shields.io/npm/l/json-tree-merge.svg)](LICENSE)

Scan a directory tree for `<group>.json` files and fold them into **one nested-object JSON per group**. Framework- and domain-agnostic — great for [next-intl](https://next-intl.dev) locale merging, but the engine knows nothing about locales or messages. Zero runtime dependencies, atomic writes, CLI and library in one package.

## Why?

You have JSON shards scattered across a monorepo (`packages/auth/messages/en.json`, `packages/billing/messages/en.json`, …) and need one merged `en.json` where each package becomes a top-level key. Doing this by hand is tedious; doing it with `lodash.merge` re-invents the wheel and rarely handles atomic writes or graceful shutdown.

This package does the boring work: recursive scan, key-path computation from directory segments, atomic `tmp + rename` write, no runtime deps beyond `node:fs` / `node:path`.

## Installation

Run via `npx` (no install needed):

```bash
npx json-tree-merge \
  --input ./packages \
  --output ./messages \
  --groups en,ru \
  --exclude messages,src
```

Or install locally:

```bash
npm install -D json-tree-merge
```

Then in `package.json`:

```jsonc
{
  "scripts": {
    "merge:i18n": "json-tree-merge --input ./packages --output ./messages --groups en,ru"
  }
}
```

Requires Node.js ≥ 18.

## Usage

For each input directory, the engine recursively finds files whose basename matches one of `groupNames` (`en.json`, `ru.json`, …), reads them, and merges the contents into a single output JSON per group. Each directory segment between an input path and the file becomes a nested key, minus anything in `excludePathSegments`.

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

## CLI

```
json-tree-merge [options]
```

| Flag                | Alias | Required | Default | Description                                                       |
| ------------------- | ----- | -------- | ------- | ----------------------------------------------------------------- |
| `--input <dir>`     | `-i`  | **yes**  | —       | Directory to scan recursively. Repeatable, or comma-separated.    |
| `--output <dir>`    | `-o`  | **yes**  | —       | Directory where merged `<group>.json` files are written.          |
| `--groups <names>`  | `-g`  | **yes**  | —       | Comma-separated allowed basenames (e.g. `en,ru`).                 |
| `--exclude <names>` | `-e`  | no       | —       | Comma-separated path segments to strip from the nested keys.      |
| `--config <file>`   | `-c`  | no       | —       | Load options from a JSON config file. Flags override file values. |
| `--debug`           |       | no       | `false` | Print verbose progress to stderr.                                 |
| `--help`            | `-h`  | no       | —       | Show help.                                                        |
| `--version`         | `-v`  | no       | —       | Print version.                                                    |

Repeating flags is equivalent to a comma-separated list:

```bash
json-tree-merge -i ./apps -i ./packages -o ./out -g en,ru
# same as
json-tree-merge -i ./apps,./packages -o ./out -g en,ru
```

### Config file

If `--config <file>` is not specified, the CLI looks for `json-tree-merge.config.json` (then `.json-tree-merge.json`) in the current working directory. CLI flags always override config values.

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

| Code | Meaning                                             |
| ---- | --------------------------------------------------- |
| `0`  | Success.                                            |
| `1`  | Runtime error (I/O, invalid JSON, etc).             |
| `2`  | Invalid CLI usage or missing/invalid configuration. |

## API

### `mergeJsonTree(options)`

The primary entry point. Scans, merges, and writes one file per group.

```ts
import { mergeJsonTree, createLogger } from "json-tree-merge"

const { sourceFiles, written } = mergeJsonTree({
  inputPaths: ["/abs/path/to/packages", "/abs/path/to/apps"],
  outputDir: "/abs/path/to/messages",
  groupNames: ["en", "ru"] as const,
  excludePathSegments: ["messages", "src"],
  logger: createLogger(true),  // optional — defaults to no-op
  isShuttingDown: () => false, // optional — defaults to () => false
})

console.log(`Wrote ${written.length} groups from ${sourceFiles} files`)
```

| Option                | Type                | Required | Default       | Description                                                          |
| --------------------- | ------------------- | -------- | ------------- | -------------------------------------------------------------------- |
| `inputPaths`          | `string[]`          | **yes**  | —             | Absolute directories to scan recursively.                            |
| `outputDir`           | `string`            | **yes**  | —             | Absolute directory where merged `<group>.json` files are written.    |
| `groupNames`          | `readonly string[]` | **yes**  | —             | Allowed file basenames. `de.json` is ignored unless `"de"` is listed.|
| `excludePathSegments` | `string[]`          | no       | `[]`          | Path segments stripped when computing the nested key path.           |
| `logger`              | `Logger`            | no       | no-op         | `(...args) => void`. Use `createLogger(true)` for verbose output.    |
| `isShuttingDown`      | `() => boolean`     | no       | `() => false` | Hook to abort writes during graceful shutdown (e.g. SIGTERM).        |
| `relevantChanges`     | `string[]`          | no       | `[]`          | Files that triggered this merge (used only for log output).          |

Returns:

```ts
{ sourceFiles: number; written: string[] }
```

### Primitives

For advanced consumers that want to compose differently:

| Export                | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `scanDirectory`       | Recursive scanner.                                 |
| `mergeFilesIntoTree`  | Pure transform (no I/O).                           |
| `writeTree`           | Atomic write of the merged tree.                   |
| `findGroupFiles`      | Scan wrapper across multiple input paths.          |
| `isGroupJsonFile`     | Basename predicate.                                |
| `isGroupFileInScope`  | Full predicate (in input, not in output, allowed). |
| `createLogger(debug)` | Debug-gated logger factory.                        |

## Atomic writes

Files are written via the `tmp + rename` pattern, so a SIGTERM during the write cannot leave the destination truncated. `rename` is atomic on POSIX within the same filesystem.

## Shutdown gating

Pass `isShuttingDown` so the engine can skip writes once your host process starts shutting down. The library itself doesn't install signal handlers — that's the integration's responsibility.

## Logging

The library emits unprefixed messages via the injected `logger`. Integrations typically wrap `createLogger` with their own prefix:

```ts
const baseLogger = createLogger(debug)
const logger: Logger = (...args) => baseLogger("[MyPlugin]", ...args)
```

## Skipped directories

The recursive scan skips `node_modules`, `.next`, `.turbo`, `.git`, and `dist` by default. The output directory is also skipped automatically, so re-running the CLI never re-ingests its own output.

## See also

- [`next-intl-merge`](https://www.npmjs.com/package/next-intl-merge) — Next.js integration on top of this engine

## License

MIT
