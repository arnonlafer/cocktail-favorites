import { useState } from 'react'
import { login } from '../lib/auth'
import { saveLoginProfile } from '../lib/storage'
import { IconEye, IconEyeOff } from './icons'

interface Props {
  onSuccess: () => void
}

export function LoginPage({ onSuccess }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const token = await login(username, password)
    setLoading(false)

    if (!token) {
      setError('Invalid password. Please try again.')
      return
    }

    saveLoginProfile(username)
    onSuccess()
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold text-foreground">Cocktail Favorites</h1>
        <p className="mt-2 text-sm text-muted">Sign in to view your recipes</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-2xl border border-app bg-bar-900/60 p-5">
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Your Name</span>
          <input
            type="text"
            autoComplete="name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-foreground outline-none focus:border-amber-accent/60"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Password</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-app bg-bar-800 py-2.5 pr-11 pl-3 text-foreground outline-none focus:border-amber-accent/60"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:text-foreground"
            >
              {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password || !username.trim()}
          className="w-full rounded-2xl bg-amber-accent py-3.5 text-base font-semibold text-bar-950 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
