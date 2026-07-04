import { loadPrefs } from './storage'
import { pullFromServer, pushToServer, type SyncStatus } from './sync'

export async function saveToServer(): Promise<SyncStatus> {
  const code = loadPrefs().syncCode?.trim()
  if (!code) return 'not-configured'
  return pushToServer(code)
}

export async function loadFromServer(): Promise<SyncStatus> {
  const code = loadPrefs().syncCode?.trim()
  if (!code) return 'not-configured'
  return pullFromServer(code)
}

export function describeSaveStatus(status: SyncStatus): { ok: boolean; message: string } {
  switch (status) {
    case 'synced':
      return { ok: true, message: 'Saved to server.' }
    case 'not-configured':
      return {
        ok: false,
        message: 'Cloud sync is not set up. Add a sync code in Settings, or check the server connection.',
      }
    case 'error':
      return {
        ok: false,
        message: 'Could not save to the server. Check your connection, sign in again, and retry.',
      }
    default:
      return { ok: false, message: 'Save failed. Please try again.' }
  }
}
