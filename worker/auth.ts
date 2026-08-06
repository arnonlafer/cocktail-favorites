import type { Env } from './syncStorage'

const PASSWORD_HASH = 'add3730a79bcae13e3978f7764ce1ad0f763497b61b025429917eb025fe48c8e'
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000
const AUTH_HEADER = 'Authorization'

function json(data: unknown, status = 200) {
  return Response.json(data, { status })
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function sessionSecret(env: Env): string {
  return env.AUTH_SECRET ?? 'cocktail-favorites-session-v1'
}

function encodeUsername(username: string): string {
  const bytes = new TextEncoder().encode(username)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeUsername(encoded: string): string | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
    return new TextDecoder().decode(bytes).trim() || null
  } catch {
    return null
  }
}

async function signSession(expiresAt: number, encodedUsername: string, env: Env): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(sessionSecret(env)),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const payload = `${expiresAt}.${encodedUsername}`
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const sigHex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${payload}.${sigHex}`
}

export async function verifyPassword(password: string, env: Env): Promise<boolean> {
  if (env.AUTH_PASSWORD) {
    return timingSafeEqual(password, env.AUTH_PASSWORD)
  }
  const hash = await sha256(password)
  return timingSafeEqual(hash, PASSWORD_HASH)
}

export async function createSessionToken(username: string, env: Env): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS
  return signSession(expiresAt, encodeUsername(username), env)
}

export async function verifySessionToken(token: string, env: Env): Promise<string | null> {
  const [expStr, encodedUsername, sig] = token.split('.')
  if (!expStr || !encodedUsername || !sig) return null

  const expiresAt = Number(expStr)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null

  const expected = await signSession(expiresAt, encodedUsername, env)
  const expectedSig = expected.split('.')[2]
  if (!expectedSig || !timingSafeEqual(sig, expectedSig)) return null

  return decodeUsername(encodedUsername)
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get(AUTH_HEADER)
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

export async function requireAuth(request: Request, env: Env): Promise<Response | null> {
  const token = bearerToken(request)
  if (!token || !(await verifySessionToken(token, env))) {
    return json({ error: 'Unauthorized' }, 401)
  }
  return null
}

export async function handleAuthRequest(request: Request, env: Env, pathname: string): Promise<Response | null> {
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    let body: { username?: string; password?: string }
    try {
      body = (await request.json()) as { username?: string; password?: string }
    } catch {
      return json({ error: 'Invalid request body.' }, 400)
    }

    const username = body.username?.trim()
    if (!username || !body.password) {
      return json({ error: 'Username and password are required.' }, 400)
    }

    if (!(await verifyPassword(body.password, env))) {
      return json({ error: 'Invalid credentials.' }, 401)
    }

    const token = await createSessionToken(username, env)
    return json({ token })
  }

  if (pathname === '/api/auth/session' && request.method === 'GET') {
    const token = bearerToken(request)
    const username = token ? await verifySessionToken(token, env) : null
    if (!username) {
      return json({ ok: false }, 401)
    }
    return json({ ok: true, username })
  }

  return null
}
