export interface BarcodeSettings {
  colaApiKey: string
  upcApiKey: string
  upcDatabaseApiKey: string
}

const BARCODE_SETTINGS_KEY = 'cocktail-favorites:barcode-settings'

const defaultSettings: BarcodeSettings = {
  colaApiKey: '',
  upcApiKey: '',
  upcDatabaseApiKey: '',
}

export function loadBarcodeSettings(): BarcodeSettings {
  try {
    const raw = localStorage.getItem(BARCODE_SETTINGS_KEY)
    if (!raw) return { ...defaultSettings }
    const parsed = JSON.parse(raw) as Partial<BarcodeSettings>
    return {
      colaApiKey: parsed.colaApiKey ?? '',
      upcApiKey: parsed.upcApiKey ?? '',
      upcDatabaseApiKey: parsed.upcDatabaseApiKey ?? '',
    }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveBarcodeSettings(settings: BarcodeSettings) {
  localStorage.setItem(BARCODE_SETTINGS_KEY, JSON.stringify(settings))
}

export function normalizeBarcodeSettings(partial: Partial<BarcodeSettings>): BarcodeSettings {
  const current = loadBarcodeSettings()
  return {
    colaApiKey: partial.colaApiKey ?? current.colaApiKey,
    upcApiKey: partial.upcApiKey ?? current.upcApiKey,
    upcDatabaseApiKey: partial.upcDatabaseApiKey ?? current.upcDatabaseApiKey,
  }
}
