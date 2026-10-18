#!/usr/bin/env bash
set -euo pipefail
name=netrunner-decklists
lookup() { npx wrangler d1 list --json | node -e 'const l = JSON.parse(require("fs").readFileSync(0, "utf8")); const d = l.find((x) => x.name === process.argv[1]); process.stdout.write(d ? d.uuid : "");' "$name"; }
id=$(lookup)
if [ -z "$id" ] && [ "${1:-}" = "--create" ]; then
  npx wrangler d1 create "$name" > /dev/null
  id=$(lookup)
fi
if [ -z "$id" ]; then
  echo "No D1 database named $name" >&2
  exit 1
fi
sed -i "s/00000000-0000-0000-0000-000000000000/$id/" wrangler.toml
