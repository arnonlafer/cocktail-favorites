export type SyncBackend = 'kv' | 'd1'

export interface Env {
  ASSETS: Fetcher
  SYNC_KV?: KVNamespace
  SYNC_DB?: D1Database
  /** Feature flag: which backend /api/sync reads and writes. Default kv. */
  SYNC_BACKEND?: string
  AUTH_PASSWORD?: string
  AUTH_SECRET?: string
  /** Optional server-side keys for barcode fallbacks (client keys also accepted). */
  COLA_CLOUD_API_KEY?: string
  UPC_DEV_API_KEY?: string
}

export function resolveSyncBackend(env: Env): SyncBackend {
  const raw = (env.SYNC_BACKEND ?? 'kv').trim().toLowerCase()
  return raw === 'd1' ? 'd1' : 'kv'
}

function kvKey(syncCode: string): string {
  return `sync:${syncCode}`
}

export async function ensureD1Schema(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS sync_payloads (
        sync_code TEXT PRIMARY KEY NOT NULL,
        payload TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
    )
    .run()
}

export async function readFromKv(env: Env, syncCode: string): Promise<string | null> {
  if (!env.SYNC_KV) return null
  return env.SYNC_KV.get(kvKey(syncCode))
}

export async function writeToKv(env: Env, syncCode: string, body: string): Promise<void> {
  if (!env.SYNC_KV) throw new Error('Workers KV is not configured.')
  await env.SYNC_KV.put(kvKey(syncCode), body)
}

export async function readFromD1(env: Env, syncCode: string): Promise<string | null> {
  if (!env.SYNC_DB) return null
  await ensureD1Schema(env.SYNC_DB)
  const row = await env.SYNC_DB.prepare(
    'SELECT payload FROM sync_payloads WHERE sync_code = ?',
  )
    .bind(syncCode)
    .first<{ payload: string }>()
  return row?.payload ?? null
}

export async function writeToD1(env: Env, syncCode: string, body: string): Promise<void> {
  if (!env.SYNC_DB) throw new Error('D1 is not configured.')
  await ensureD1Schema(env.SYNC_DB)
  const updatedAt = Date.now()
  await env.SYNC_DB.prepare(
    `INSERT INTO sync_payloads (sync_code, payload, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(sync_code) DO UPDATE SET
       payload = excluded.payload,
       updated_at = excluded.updated_at`,
  )
    .bind(syncCode, body, updatedAt)
    .run()
}

export async function readActivePayload(env: Env, syncCode: string): Promise<string | null> {
  const backend = resolveSyncBackend(env)
  if (backend === 'd1') return readFromD1(env, syncCode)
  return readFromKv(env, syncCode)
}

export async function writeActivePayload(env: Env, syncCode: string, body: string): Promise<void> {
  const backend = resolveSyncBackend(env)
  if (backend === 'd1') {
    await writeToD1(env, syncCode, body)
    return
  }
  await writeToKv(env, syncCode, body)
}

export function storageConfigured(env: Env): { kv: boolean; d1: boolean; active: SyncBackend } {
  return {
    kv: Boolean(env.SYNC_KV),
    d1: Boolean(env.SYNC_DB),
    active: resolveSyncBackend(env),
  }
}

export type CopyDirection = 'kv-to-d1' | 'd1-to-kv'

export async function copyBetweenBackends(
  env: Env,
  syncCode: string,
  direction: CopyDirection,
): Promise<{ bytes: number; from: SyncBackend; to: SyncBackend }> {
  if (direction === 'kv-to-d1') {
    if (!env.SYNC_KV) throw new Error('Workers KV is not configured.')
    if (!env.SYNC_DB) throw new Error('D1 is not configured.')
    const raw = await readFromKv(env, syncCode)
    if (raw == null) throw new Error('No data found in Workers KV for this sync code.')
    await writeToD1(env, syncCode, raw)
    return { bytes: raw.length, from: 'kv', to: 'd1' }
  }

  if (!env.SYNC_DB) throw new Error('D1 is not configured.')
  if (!env.SYNC_KV) throw new Error('Workers KV is not configured.')
  const raw = await readFromD1(env, syncCode)
  if (raw == null) throw new Error('No data found in D1 for this sync code.')
  await writeToKv(env, syncCode, raw)
  return { bytes: raw.length, from: 'd1', to: 'kv' }
}
