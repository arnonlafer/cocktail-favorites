#!/usr/bin/env node
/**
 * Bake an export JSON into src/data/cocktails.json and write a server seed
 * with empty recipe overlays (recipes now live in the base catalog).
 *
 * Usage:
 *   node scripts/bake-export-into-base.mjs [path-to-export.json]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const exportPath = resolve(
  process.argv[2] ?? `${process.env.HOME}/Downloads/cocktail-favorites-guest-2026-08-01.json`,
)
const basePath = resolve('src/data/cocktails.json')
const seedPath = resolve('src/data/server-seed-from-export.json')

const exp = JSON.parse(readFileSync(exportPath, 'utf8'))
const base = JSON.parse(readFileSync(basePath, 'utf8'))

const byId = new Map(base.map((c) => [c.id, { ...c }]))
const deleted = new Set(exp.deletedIds ?? [])

for (const id of deleted) byId.delete(id)

for (const [id, edit] of Object.entries(exp.edits ?? {})) {
  if (deleted.has(id)) continue
  const existing = byId.get(id)
  const merged = existing ? { ...existing, ...edit, id } : { ...edit, id }
  delete merged.custom
  byId.set(id, merged)
}

for (const custom of exp.custom ?? []) {
  if (deleted.has(custom.id)) continue
  const next = { ...custom }
  delete next.custom
  byId.set(custom.id, next)
}

const cocktails = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
writeFileSync(basePath, `${JSON.stringify(cocktails, null, 2)}\n`)

const seed = {
  exportVersion: 1,
  exportedAt: new Date().toISOString(),
  userName: exp.userName ?? 'Guest',
  updatedAt: Date.now(),
  edits: {},
  custom: [],
  deletedIds: [],
  nutritionOverrides: exp.nutritionOverrides ?? [],
  syncCode: exp.syncCode ?? 'arnon',
  // Keep legacy local fields so first import can migrate recently viewed / view prefs.
  userProfiles: exp.userProfiles ?? {},
  aiChats: [],
}

writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`)

console.log(
  JSON.stringify(
    {
      exportPath,
      cocktails: cocktails.length,
      removed: [...deleted],
      profiles: Object.keys(seed.userProfiles),
      seedPath,
    },
    null,
    2,
  ),
)
