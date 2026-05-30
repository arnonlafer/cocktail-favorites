import { handleAuthRequest, requireAuth } from './auth'

export interface Env {
  ASSETS: Fetcher
  SYNC_KV?: KVNamespace
  AUTH_PASSWORD?: string
  AUTH_SECRET?: string
}

const SYNC_HEADER = 'X-Sync-Code'

function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    const authResponse = await handleAuthRequest(request, env, url.pathname)
    if (authResponse) return authResponse

    if (url.pathname === '/api/sync') {
      const unauthorized = await requireAuth(request, env)
      if (unauthorized) return unauthorized

      if (!env.SYNC_KV) {
        return json({ error: 'Cloud sync is not configured on the server.' }, 503)
      }

      const code = request.headers.get(SYNC_HEADER)?.trim()
      if (!code || code.length < 4) {
        return json({ error: 'A sync code of at least 4 characters is required.' }, 401)
      }

      const key = `sync:${code}`

      if (request.method === 'GET') {
        const data = await env.SYNC_KV.get(key)
        return json({ data: data ? JSON.parse(data) : null })
      }

      if (request.method === 'PUT') {
        const body = await request.text()
        if (!body) return json({ error: 'Empty payload.' }, 400)
        await env.SYNC_KV.put(key, body)
        return json({ ok: true })
      }

      return new Response('Method not allowed', { status: 405 })
    }

    return env.ASSETS.fetch(request)
  },
}
