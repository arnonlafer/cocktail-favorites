import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { FontSize, Theme } from '../types'
import { FONT_SIZE_LABELS, THEME_LABELS, THEME_ORDER, stepFontSize } from '../lib/theme'
import { DEFAULT_CART_SEARCH_URL } from '../lib/cart'
import { logout } from '../lib/auth'
import { downloadAppExport } from '../lib/export'
import { loadFromServer, saveToServer } from '../lib/serverSave'
import { checkSyncServer, formatSyncTime, type SyncStatus } from '../lib/sync'
import { confirmDiscardChanges } from '../lib/unsavedChanges'
import { PageHeader } from './PageHeader'
import { AiSettingsSection } from './AiSettingsSection'

interface Props {
  theme: Theme
  fontSize: FontSize
  syncCode: string
  lastSyncedAt: number | null
  randomFavoritesOnly: boolean
  cartSearchUrl: string
  onThemeChange: (theme: Theme) => void
  onFontSizeChange: (fontSize: FontSize) => void
  onSyncCodeChange: (syncCode: string) => void
  onRandomFavoritesOnlyChange: (value: boolean) => void
  onCartSearchUrlChange: (url: string) => void
  onReloaded: () => void
  onLogout: () => void
}

export function SettingsPage({
  theme,
  fontSize,
  syncCode,
  lastSyncedAt,
  randomFavoritesOnly,
  cartSearchUrl,
  onThemeChange,
  onFontSizeChange,
  onSyncCodeChange,
  onRandomFavoritesOnlyChange,
  onCartSearchUrlChange,
  onReloaded,
  onLogout,
}: Props) {
  const [draftCode, setDraftCode] = useState(syncCode)
  const [draftCartSearchUrl, setDraftCartSearchUrl] = useState(cartSearchUrl)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [serverReady, setServerReady] = useState<'checking' | 'ready' | 'not-configured' | 'error'>('checking')

  useEffect(() => {
    void checkSyncServer().then(setServerReady)
  }, [])

  useEffect(() => {
    setDraftCode(syncCode)
  }, [syncCode])

  useEffect(() => {
    setDraftCartSearchUrl(cartSearchUrl)
  }, [cartSearchUrl])

  async function handleLoadFromServer() {
    const code = draftCode.trim()
    if (!code) return
    if (
      !confirmDiscardChanges(
        'Load from server? Any unsaved changes on this device will be replaced with the server copy.',
      )
    ) {
      return
    }
    onSyncCodeChange(code)
    setSyncStatus('syncing')
    const status = await loadFromServer()
    setSyncStatus(status)
    if (status === 'synced') {
      setServerReady('ready')
      onReloaded()
    } else if (status === 'not-configured') {
      setServerReady('not-configured')
    }
  }

  async function handleSaveServerSettings() {
    onCartSearchUrlChange(draftCartSearchUrl.trim() || DEFAULT_CART_SEARCH_URL)
    setSyncStatus('syncing')
    const status = await saveToServer()
    setSyncStatus(status)
    if (status === 'synced') onReloaded()
  }

  const showServerWarning = serverReady === 'not-configured' || syncStatus === 'not-configured'

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="space-y-4 px-4 pt-4">
        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Theme</h2>
          <p className="mb-4 text-sm text-muted">Dark, dim, or light appearance.</p>
          <div className="inline-flex w-full rounded-xl border border-app bg-bar-800 p-1">
            {THEME_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onThemeChange(option)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
                  theme === option ? 'bg-amber-accent text-bar-950' : 'text-muted'
                }`}
              >
                {THEME_LABELS[option]}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Font size</h2>
          <p className="mb-4 text-sm text-muted">Adjust text size across the app.</p>
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Decrease font size"
              onClick={() => onFontSizeChange(stepFontSize(fontSize, -1))}
              disabled={fontSize === 'sm'}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-app bg-bar-800 text-xl font-bold text-foreground disabled:opacity-30"
            >
              A−
            </button>
            <span className="min-w-24 text-center text-sm font-medium text-foreground">
              {FONT_SIZE_LABELS[fontSize]}
            </span>
            <button
              type="button"
              aria-label="Increase font size"
              onClick={() => onFontSizeChange(stepFontSize(fontSize, 1))}
              disabled={fontSize === 'xl'}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-app bg-bar-800 text-xl font-bold text-foreground disabled:opacity-30"
            >
              A+
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Lists</h2>
          <p className="mb-3 text-sm text-muted">Create and manage recipe lists.</p>
          <Link
            to="/collections"
            className="inline-flex rounded-xl border border-app bg-bar-800 px-4 py-2 text-sm font-medium text-foreground"
          >
            Manage lists →
          </Link>
        </section>

        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Ingredient nutrition</h2>
          <p className="mb-3 text-sm text-muted">
            Manage calories and carbs per ounce for spirits, juices, and syrups.
          </p>
          <Link
            to="/settings/ingredients"
            className="inline-flex rounded-xl border border-app bg-bar-800 px-4 py-2 text-sm font-medium text-foreground"
          >
            Edit ingredient nutrition →
          </Link>
        </section>

        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Random recipe</h2>
          <p className="mb-3 text-sm text-muted">
            Tap the shuffle icon on the home screen to jump to a random cocktail.
          </p>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={randomFavoritesOnly}
              onChange={(e) => onRandomFavoritesOnlyChange(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-app accent-amber-accent"
            />
            <span className="text-sm text-foreground">Pick from favorites only</span>
          </label>
        </section>

        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Cart</h2>
          <p className="mb-3 text-sm text-muted">
            Choose where cart items open when tapped. Use <code className="text-foreground">{'{query}'}</code> for
            the item name.
          </p>
          <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="cart-search-url">
            Search URL
          </label>
          <input
            id="cart-search-url"
            type="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={draftCartSearchUrl}
            onChange={(e) => setDraftCartSearchUrl(e.target.value)}
            placeholder={DEFAULT_CART_SEARCH_URL}
            className="mb-3 w-full rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-sm text-foreground placeholder:text-subtle"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftCartSearchUrl(DEFAULT_CART_SEARCH_URL)
              }}
              className="w-full rounded-xl border border-app bg-bar-800 py-2.5 text-sm font-medium text-foreground"
            >
              Reset to default
            </button>
          </div>
          <p className="mt-2 text-xs text-subtle">Use “Save settings to server” below to persist this URL.</p>
        </section>

        <AiSettingsSection />

        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Cloud data</h2>
          <p className="mb-3 text-sm text-muted">
            Your recipes, lists, draft, cart, and stock live on the server under your sync code. Save changes with
            the Save button on each page, or use the banner at the top. Refreshing the app loads the latest server
            data when you have nothing unsaved.
          </p>
          {showServerWarning && (
            <p className="mb-4 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              Cloud storage is not connected yet. Bind the SYNC_KV namespace to the cocktail-favorites worker in
              Cloudflare (see README).
            </p>
          )}
          {serverReady === 'ready' && !showServerWarning && (
            <p className="mb-4 rounded-xl border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
              Cloud storage is connected.
            </p>
          )}
          <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="sync-code">
            Sync code
          </label>
          <input
            id="sync-code"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={draftCode}
            onChange={(e) => setDraftCode(e.target.value)}
            onBlur={() => onSyncCodeChange(draftCode.trim())}
            placeholder="e.g. arnon"
            className="mb-3 w-full rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-sm text-foreground placeholder:text-subtle"
          />
          <button
            type="button"
            onClick={() => void handleLoadFromServer()}
            className="w-full rounded-xl bg-amber-accent py-2.5 text-sm font-semibold text-bar-950"
          >
            Load from server
          </button>
          <p className="mt-3 text-xs text-subtle">
            Last loaded: {formatSyncTime(lastSyncedAt)}
            {syncStatus === 'syncing' ? ' · Working…' : ''}
            {syncStatus === 'synced' ? ' · Done' : ''}
            {syncStatus === 'error' ? ' · Failed — check connection and sign-in' : ''}
            {syncStatus === 'not-configured' ? ' · Server storage not set up' : ''}
          </p>
        </section>

        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Server settings</h2>
          <p className="mb-3 text-sm text-muted">Save cart search URL and random-recipe preference to the server.</p>
          <button
            type="button"
            onClick={() => void handleSaveServerSettings()}
            className="w-full rounded-xl border border-app bg-bar-800 py-2.5 text-sm font-medium text-foreground"
          >
            Save settings to server
          </button>
        </section>

        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Export backup</h2>
          <p className="mb-3 text-sm text-muted">
            Download a JSON backup of your recipe edits, custom cocktails, lists, draft, cart, stock, and other
            saved data from this device.
          </p>
          <button
            type="button"
            onClick={() => downloadAppExport()}
            className="w-full rounded-xl border border-app bg-bar-800 py-2.5 text-sm font-medium text-foreground"
          >
            Export JSON
          </button>
        </section>

        <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
          <h2 className="mb-1 text-base font-semibold text-foreground">Account</h2>
          <p className="mb-3 text-sm text-muted">Sign out to switch to a different user on this device.</p>
          <button
            type="button"
            onClick={() => {
              logout()
              onLogout()
            }}
            className="w-full rounded-xl border border-red-900/50 py-2.5 text-sm font-medium text-red-300"
          >
            Log out
          </button>
        </section>

        <Link to="/" className="block text-center text-sm text-amber-accent">
          Back to cocktails
        </Link>
      </div>
    </div>
  )
}
