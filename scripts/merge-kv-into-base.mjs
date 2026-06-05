/**
 * Merge a Cloudflare KV sync export into src/data/cocktails.json.
 * Usage: node scripts/merge-kv-into-base.mjs /path/to/sync.json
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const kvPath = process.argv[2]
if (!kvPath) {
  console.error('Usage: node scripts/merge-kv-into-base.mjs <sync.json>')
  process.exit(1)
}

const kv = JSON.parse(readFileSync(kvPath, 'utf8'))
const basePath = join(__dirname, '../src/data/cocktails.json')
const base = JSON.parse(readFileSync(basePath, 'utf8'))

const edits = kv.edits ?? {}
const deleted = new Set(kv.deletedIds ?? [])
const custom = kv.custom ?? []

function stripSyncFields(cocktail) {
  const { custom, ...rest } = cocktail
  return rest
}

const customById = new Map(custom.map((c) => [c.id, stripSyncFields(c)]))
const merged = []

for (const cocktail of base) {
  if (deleted.has(cocktail.id)) continue
  if (customById.has(cocktail.id)) {
    merged.push(customById.get(cocktail.id))
    customById.delete(cocktail.id)
    continue
  }
  merged.push(stripSyncFields(edits[cocktail.id] ?? cocktail))
}

for (const cocktail of customById.values()) {
  merged.push({ ...cocktail, custom: true })
}

writeFileSync(basePath, JSON.stringify(merged, null, 2) + '\n')

console.log(`Merged ${Object.keys(edits).length} edits, ${custom.length} custom, ${deleted.size} deleted`)
console.log(`Wrote ${merged.length} cocktails to ${basePath}`)
if (deleted.size > 0) {
  console.log(`Remove deleted ids from cocktail-origins.json if present: ${[...deleted].join(', ')}`)
}
