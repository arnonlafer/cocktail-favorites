import { handleAuthRequest, requireAuth } from './auth'
import {
  copyBetweenBackends,
  readActivePayload,
  readFromD1,
  readFromKv,
  resolveSyncBackend,
  storageConfigured,
  writeActivePayload,
  type CopyDirection,
  type Env,
} from './syncStorage'

export type { Env }

const SYNC_HEADER = 'X-Sync-Code'

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function requireSyncCode(request: Request): string | Response {
  const code = request.headers.get(SYNC_HEADER)?.trim()
  if (!code || code.length < 4) {
    return json({ error: 'A sync code of at least 4 characters is required.' }, 401)
  }
  return code
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    const authResponse = await handleAuthRequest(request, env, url.pathname)
    if (authResponse) return authResponse

    if (url.pathname === '/api/sync/storage') {
      const unauthorized = await requireAuth(request, env)
      if (unauthorized) return unauthorized

      if (request.method === 'GET') {
        const configured = storageConfigured(env)
        const codeHeader = request.headers.get(SYNC_HEADER)?.trim()
        let kvHasData: boolean | null = null
        let d1HasData: boolean | null = null
        if (codeHeader && codeHeader.length >= 4) {
          if (configured.kv) {
            kvHasData = (await readFromKv(env, codeHeader)) != null
          }
          if (configured.d1) {
            d1HasData = (await readFromD1(env, codeHeader)) != null
          }
        }
        return json({
          backend: configured.active,
          kvConfigured: configured.kv,
          d1Configured: configured.d1,
          kvHasData,
          d1HasData,
        })
      }

      if (request.method === 'POST') {
        const codeOrError = requireSyncCode(request)
        if (codeOrError instanceof Response) return codeOrError
        const syncCode = codeOrError

        let body: { direction?: string } = {}
        try {
          body = (await request.json()) as { direction?: string }
        } catch {
          return json({ error: 'Expected JSON body with direction.' }, 400)
        }

        const direction = body.direction as CopyDirection | undefined
        if (direction !== 'kv-to-d1' && direction !== 'd1-to-kv') {
          return json({ error: 'direction must be "kv-to-d1" or "d1-to-kv".' }, 400)
        }

        try {
          const result = await copyBetweenBackends(env, syncCode, direction)
          return json({ ok: true, ...result })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Copy failed.'
          return json({ error: message }, 400)
        }
      }

      return new Response('Method not allowed', { status: 405 })
    }

    if (url.pathname === '/api/sync') {
      const unauthorized = await requireAuth(request, env)
      if (unauthorized) return unauthorized

      const configured = storageConfigured(env)
      const active = resolveSyncBackend(env)
      if (active === 'kv' && !configured.kv) {
        return json({ error: 'Cloud sync is not configured on the server (Workers KV).' }, 503)
      }
      if (active === 'd1' && !configured.d1) {
        return json({ error: 'Cloud sync is not configured on the server (D1).' }, 503)
      }

      const codeOrError = requireSyncCode(request)
      if (codeOrError instanceof Response) return codeOrError
      const syncCode = codeOrError

      if (request.method === 'GET') {
        const raw = await readActivePayload(env, syncCode)
        return json({ data: raw ? JSON.parse(raw) : null, backend: active })
      }

      if (request.method === 'PUT') {
        const body = await request.text()
        if (!body) return json({ error: 'Empty payload.' }, 400)
        try {
          JSON.parse(body)
        } catch {
          return json({ error: 'Payload must be valid JSON.' }, 400)
        }
        await writeActivePayload(env, syncCode, body)
        return json({ ok: true, backend: active })
      }

      return new Response('Method not allowed', { status: 405 })
    }

    return env.ASSETS.fetch(request)
  },
}
