import { useEffect, useState } from 'react'
import {
  loadBarcodeSettings,
  normalizeBarcodeSettings,
  saveBarcodeSettings,
  type BarcodeSettings,
} from '../lib/barcodeSettings'

const fieldClass =
  'w-full rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-sm text-foreground placeholder:text-subtle'

export function BarcodeSettingsSection() {
  const [settings, setSettings] = useState<BarcodeSettings>(() => loadBarcodeSettings())
  const [draftCola, setDraftCola] = useState(settings.colaApiKey)
  const [draftUpc, setDraftUpc] = useState(settings.upcApiKey)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraftCola(settings.colaApiKey)
    setDraftUpc(settings.upcApiKey)
  }, [settings.colaApiKey, settings.upcApiKey])

  function persist(next: Partial<BarcodeSettings>) {
    const merged = normalizeBarcodeSettings(next)
    setSettings(merged)
    saveBarcodeSettings(merged)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  function saveKeys() {
    persist({ colaApiKey: draftCola.trim(), upcApiKey: draftUpc.trim() })
  }

  return (
    <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
      <h2 className="mb-1 text-base font-semibold text-foreground">Barcode lookup</h2>
      <p className="mb-4 text-sm text-muted">
        After Open Facts, scans try COLA Cloud (US alcohol labels), then upc.dev. Keys stay on this device
        only. upc.dev works without a key on the free tier.
      </p>

      <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="cola-api-key">
        COLA Cloud API key
      </label>
      <input
        id="cola-api-key"
        type="password"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={draftCola}
        onChange={(e) => setDraftCola(e.target.value)}
        placeholder="Required for US liquor / COLA matches"
        className={`${fieldClass} mb-3`}
      />
      <p className="mb-4 text-xs text-subtle">
        Get a key at{' '}
        <a
          href="https://colacloud.us/api"
          target="_blank"
          rel="noreferrer"
          className="text-amber-accent underline"
        >
          colacloud.us
        </a>
        .
      </p>

      <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="upc-api-key">
        upc.dev API key <span className="font-normal text-subtle">(optional)</span>
      </label>
      <input
        id="upc-api-key"
        type="password"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={draftUpc}
        onChange={(e) => setDraftUpc(e.target.value)}
        placeholder="Optional — free lookups work without one"
        className={`${fieldClass} mb-3`}
      />
      <p className="mb-4 text-xs text-subtle">
        Get a key at{' '}
        <a href="https://upc.dev/" target="_blank" rel="noreferrer" className="text-amber-accent underline">
          upc.dev
        </a>
        .
      </p>

      <button
        type="button"
        onClick={saveKeys}
        className="w-full rounded-xl bg-amber-accent py-2.5 text-sm font-semibold text-bar-950"
      >
        Save barcode keys
      </button>
      {saved && <p className="mt-2 text-center text-xs text-amber-accent">Saved</p>}
    </section>
  )
}
