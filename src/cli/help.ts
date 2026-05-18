export const HELP_TEXT = `json-tree-merge — fold per-group JSON files in a directory tree into one file per group.

Usage:
  json-tree-merge --input <dir> [--input <dir> ...] --output <dir> --groups <names> [options]
  json-tree-merge --config <file>
  json-tree-merge                  # uses ./json-tree-merge.config.json if present

Options:
  -i, --input <dir>        Directory to scan recursively. Repeatable, or comma-separated.
  -o, --output <dir>       Directory where merged <group>.json files are written.
  -g, --groups <names>     Comma-separated allowed basenames (e.g. "en,ru").
  -e, --exclude <names>    Comma-separated path segments to strip from nested keys.
  -c, --config <file>      Load options from a JSON file. Flags override file values.
      --debug              Print verbose progress to stderr.
  -h, --help               Show this help.
  -v, --version            Print package version.

Config file format (JSON):
  {
    "input": ["./packages", "./apps"],
    "output": "./messages",
    "groups": ["en", "ru"],
    "exclude": ["messages", "src"],
    "debug": false
  }

Examples:
  json-tree-merge --input ./packages --output ./messages --groups en,ru
  json-tree-merge -i ./apps -i ./packages -o ./out -g en,ru -e messages,src
  json-tree-merge --config ./i18n.config.json
`
