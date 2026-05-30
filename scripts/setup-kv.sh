#!/usr/bin/env bash
set -euo pipefail

echo "Creating Cloudflare KV namespace for cocktail sync..."
echo

if ! npx wrangler kv namespace create COCKTAIL_SYNC; then
  echo
  echo "If wrangler failed, create the namespace manually:"
  echo "  1. Cloudflare dashboard → Workers & Pages → KV → Create"
  echo "  2. Workers → cocktail-favorites → Settings → Bindings → Add KV"
  echo "     Binding name: SYNC_KV"
  echo "  3. Add the namespace id to wrangler.jsonc under kv_namespaces"
  exit 1
fi

echo
echo "Copy the namespace id above into wrangler.jsonc:"
echo
echo '  "kv_namespaces": ['
echo '    { "binding": "SYNC_KV", "id": "YOUR_NAMESPACE_ID" }'
echo '  ]'
echo
echo "Then redeploy: npm run deploy"
