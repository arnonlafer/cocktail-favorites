import { loadPrefs } from './storage'
import { buildSyncPayload } from './sync'
import type { SyncPayload } from '../types'

export interface AppExportPayload extends SyncPayload {
  exportVersion: 1
  exportedAt: string
  userName: string
}

export function exportToSyncPayload(exportData: AppExportPayload | SyncPayload): SyncPayload {
  const { exportVersion: _exportVersion, exportedAt: _exportedAt, userName: _userName, ...payload } =
    exportData as AppExportPayload
  return payload
}

export function buildAppExport(): AppExportPayload {
  const prefs = loadPrefs()
  return {
    ...buildSyncPayload(),
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    userName: prefs.userName,
  }
}

function exportFilename(userName: string): string {
  const date = new Date().toISOString().slice(0, 10)
  const slug =
    userName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '') || 'backup'
  return `cocktail-favorites-${slug}-${date}.json`
}

export function downloadAppExport() {
  const payload = buildAppExport()
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = exportFilename(payload.userName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
