const AUTH_KEY = 'cocktail-favorites:auth-token'

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_KEY)
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_KEY)
}

export function logout() {
  clearAuthToken()
}

export function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function login(username: string, password: string): Promise<string | null> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) return null

  const { token } = (await res.json()) as { token?: string }
  if (!token) return null

  localStorage.setItem(AUTH_KEY, token)
  return token
}

export async function validateSession(): Promise<string | null> {
  const token = getAuthToken()
  if (!token) return null

  try {
    const res = await fetch('/api/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      clearAuthToken()
      return null
    }
    const body = (await res.json()) as { username?: string }
    const username = body.username?.trim()
    if (!username) {
      clearAuthToken()
      return null
    }
    return username
  } catch {
    return null
  }
}
