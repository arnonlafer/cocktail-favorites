import { useEffect, useState } from 'react'
import type { AiSettings, AiVendor } from '../types'
import { AI_MODELS, AI_VENDOR_LABELS, AI_VENDOR_ORDER, defaultModelForVendor, isModelValidForVendor } from '../lib/aiModels'
import { loadAiSettings, normalizeAiSettings, saveAiSettings } from '../lib/aiStorage'

const fieldClass =
  'w-full rounded-xl border border-app bg-bar-800 px-3 py-2.5 text-sm text-foreground placeholder:text-subtle'

export function AiSettingsSection() {
  const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings())
  const [draftApiKey, setDraftApiKey] = useState(settings.apiKey)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraftApiKey(settings.apiKey)
  }, [settings.apiKey])

  function persist(next: Partial<AiSettings>) {
    const merged = normalizeAiSettings(next)
    if (!isModelValidForVendor(merged.vendor, merged.model)) {
      merged.model = defaultModelForVendor(merged.vendor)
    }
    setSettings(merged)
    saveAiSettings(merged)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1500)
  }

  function saveApiKey() {
    persist({ apiKey: draftApiKey.trim() })
  }

  const models = AI_MODELS[settings.vendor]
  const hasApiKey = draftApiKey.trim().length > 0

  return (
    <section className="rounded-2xl border border-app bg-bar-900/60 p-4">
      <h2 className="mb-1 text-base font-semibold text-foreground">AI chat</h2>
      <p className="mb-4 text-sm text-muted">
        Configure a provider for the AI tab. Your API key and chats stay on this device only and are never synced.
      </p>

      <p className="mb-2 text-sm font-medium text-foreground">Provider</p>
      <div className="mb-4 inline-flex w-full rounded-xl border border-app bg-bar-800 p-1">
        {AI_VENDOR_ORDER.map((vendor) => (
          <button
            key={vendor}
            type="button"
            onClick={() => persist({ vendor: vendor as AiVendor })}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition sm:text-sm ${
              settings.vendor === vendor ? 'bg-amber-accent text-bar-950' : 'text-muted'
            }`}
          >
            {AI_VENDOR_LABELS[vendor]}
          </button>
        ))}
      </div>

      <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="ai-api-key">
        API key
      </label>
      <input
        id="ai-api-key"
        type="password"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={draftApiKey}
        onChange={(e) => setDraftApiKey(e.target.value)}
        placeholder={`${AI_VENDOR_LABELS[settings.vendor]} API key`}
        className={`${fieldClass} mb-3`}
      />
      <button
        type="button"
        onClick={saveApiKey}
        className="mb-4 w-full rounded-xl bg-amber-accent py-2.5 text-sm font-semibold text-bar-950"
      >
        Save key
      </button>

      {hasApiKey && (
        <>
          <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="ai-model">
            Model
          </label>
          <select
            id="ai-model"
            value={settings.model}
            onChange={(e) => persist({ model: e.target.value })}
            className={`${fieldClass} mb-2`}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </>
      )}

      {saved && <p className="text-xs text-emerald-300">Saved locally on this device.</p>}
    </section>
  )
}
