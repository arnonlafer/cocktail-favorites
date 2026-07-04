#!/usr/bin/env node
/**
 * Convert an app export JSON file into a Cloudflare KV sync payload.
 *
 * Usage:
 *   node scripts/generate-kv-seed.mjs path/to/export.json [sync-code]
 *
 * Writes scripts/kv-seed-sync-<code>.json (compact JSON value for KV).
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const inputPath = process.argv[2]
const syncCode = (process.argv[3] || 'arnon').trim()

if (!inputPath) {
  console.error('Usage: node scripts/generate-kv-seed.mjs <export.json> [sync-code]')
  process.exit(1)
}

const raw = JSON.parse(readFileSync(inputPath, 'utf8'))
delete raw.exportVersion
delete raw.exportedAt
delete raw.userName

if (!raw.syncCode) raw.syncCode = syncCode

const outputName = `kv-seed-sync-${syncCode}.json`
const outputPath = join('scripts', outputName)
const value = JSON.stringify(raw)

writeFileSync(outputPath, value)

console.log(`KV key: sync:${syncCode}`)
console.log(`KV value written to: ${outputPath}`)
console.log(`Value size: ${(value.length / 1024).toFixed(1)} KB`)
console.log(`Source: ${basename(inputPath)}`)
