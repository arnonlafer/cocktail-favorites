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
