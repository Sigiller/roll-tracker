#!/usr/bin/env bash
# Sanity checks for the module (no build step): manifest/lang JSON parses, every file the
# manifest references exists, and the ES modules are syntactically valid.
set -euo pipefail

cd "$(dirname "$0")/.."

for f in module.json languages/*.json; do
  jq empty "$f" || { echo "::error file=$f::Invalid JSON"; exit 1; }
done

missing=0
while read -r path; do
  if [[ ! -f "$path" ]]; then
    echo "::error file=module.json::Referenced file not found: $path"
    missing=1
  fi
done < <(jq -r '(.esmodules // []) + (.scripts // []) + (.styles // []) + [(.languages // [])[].path] | .[]' module.json)
[[ "$missing" -eq 0 ]] || exit 1

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
while read -r path; do
  cp "$path" "$tmp/check.mjs"
  node --check "$tmp/check.mjs" || { echo "::error file=$path::Syntax error"; exit 1; }
done < <(jq -r '(.esmodules // [])[]' module.json)

echo "validate: OK"
