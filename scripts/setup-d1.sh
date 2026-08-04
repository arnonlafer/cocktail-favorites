#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WRANGLER_FILE="wrangler.jsonc"
DB_NAME="cocktail-favorites-sync"

echo "Creating Cloudflare D1 database: $DB_NAME"
echo

if ! command -v npx >/dev/null; then
  echo "npx is required."
  exit 1
fi

OUTPUT="$(npx wrangler d1 create "$DB_NAME" 2>&1)" || {
  echo "$OUTPUT"
  echo
  echo "If the database already exists, list it with:"
  echo "  npx wrangler d1 list"
  echo "Then paste its database_id into wrangler.jsonc under d1_databases."
  exit 1
}

echo "$OUTPUT"
echo

DB_ID="$(printf '%s\n' "$OUTPUT" | sed -nE 's/.*"database_id"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' | head -1)"
if [[ -z "${DB_ID}" ]]; then
  DB_ID="$(printf '%s\n' "$OUTPUT" | sed -nE 's/.*database_id[=:][[:space:]]*([0-9a-f-]{36}).*/\1/p' | head -1)"
fi

if [[ -z "${DB_ID}" ]]; then
  echo "Could not parse database_id from wrangler output."
  echo "Copy it into wrangler.jsonc → d1_databases[0].database_id, then run:"
  echo "  npx wrangler d1 migrations apply $DB_NAME --remote"
  exit 1
fi

python3 - <<PY
from pathlib import Path
path = Path("$WRANGLER_FILE")
text = path.read_text()
old = '"database_id": "REPLACE_WITH_D1_DATABASE_ID"'
new = f'"database_id": "$DB_ID"'
if old not in text and '"database_id": "$DB_ID"' not in text:
    # replace whatever database_id is present in the SYNC_DB block
    import re
    text2, n = re.subn(
        r'("binding": "SYNC_DB"[\s\S]*?"database_id": ")[^"]+(")',
        r'\1$DB_ID\2',
        text,
        count=1,
    )
    if n == 0:
        raise SystemExit("Could not update database_id in wrangler.jsonc")
    text = text2
else:
    text = text.replace(old, new)
path.write_text(text)
print(f"Updated {path} with database_id=$DB_ID")
PY

echo
echo "Applying migrations (remote)…"
npx wrangler d1 migrations apply "$DB_NAME" --remote

echo
echo "Done. Default SYNC_BACKEND is still \"kv\"."
echo "After deploy, use Settings → Cloud storage to copy KV → D1, then set"
echo "  vars.SYNC_BACKEND = \"d1\""
echo "in wrangler.jsonc (or Cloudflare dashboard) and redeploy to switch."
