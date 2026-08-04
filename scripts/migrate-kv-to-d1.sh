#!/usr/bin/env bash
# Copy the active sync payload from Workers KV into D1 (CLI backup / first migrate).
# Requires: wrangler login, D1 configured in wrangler.jsonc, migrations applied.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SYNC_CODE="${1:-arnon}"
DB_NAME="cocktail-favorites-sync"
NS_ID="daf602548f9f469380438d97ee0545e7"
TMP="$(mktemp)"
SQL="$(mktemp)"
trap 'rm -f "$TMP" "$SQL"' EXIT

echo "Reading KV key sync:${SYNC_CODE}…"
npx wrangler kv key get "sync:${SYNC_CODE}" --namespace-id="$NS_ID" >"$TMP"

if [[ ! -s "$TMP" ]]; then
  echo "KV key is empty or missing."
  exit 1
fi

python3 - "$TMP" "$SYNC_CODE" "$SQL" <<'PY'
import json, pathlib, sys, time
tmp, sync_code, sql_path = sys.argv[1], sys.argv[2], sys.argv[3]
raw = pathlib.Path(tmp).read_text()
data = json.loads(raw)
updated_at = int(data.get("updatedAt") or time.time() * 1000)
escaped = raw.replace("'", "''")
pathlib.Path(sql_path).write_text(
    f"""CREATE TABLE IF NOT EXISTS sync_payloads (
  sync_code TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
INSERT INTO sync_payloads (sync_code, payload, updated_at)
VALUES ('{sync_code}', '{escaped}', {updated_at})
ON CONFLICT(sync_code) DO UPDATE SET
  payload = excluded.payload,
  updated_at = excluded.updated_at;
"""
)
print(f"Payload OK ({len(raw)} bytes)")
PY

echo "Writing into D1 database ${DB_NAME} (remote)…"
npx wrangler d1 execute "$DB_NAME" --remote --file="$SQL"

echo "Migrated sync:${SYNC_CODE} from KV → D1."
