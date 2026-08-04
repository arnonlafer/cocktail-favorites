import type { AiChat, AiMessage, AiSettings, AiVendor } from '../types'
import { defaultModelForVendor, resolveModelForVendor } from './aiModels'
import {
  loadAiChatsFromStore,
  saveAiChatsToStore,
  touchDataUpdatedAt,
} from './dataStore'

const AI_SETTINGS_KEY = 'cocktail-favorites:ai-settings'
const LEGACY_AI_CHATS_KEY = 'cocktail-favorites:ai-chats'

const defaultSettings: AiSettings = {
  vendor: 'openai',
  apiKey: '',
  model: defaultModelForVendor('openai'),
}

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY)
    if (!raw) return { ...defaultSettings }
    const parsed = JSON.parse(raw) as Partial<AiSettings>
    const vendor = parsed.vendor ?? defaultSettings.vendor
    const model = resolveModelForVendor(vendor, parsed.model)
    const settings = {
      vendor,
      apiKey: parsed.apiKey ?? '',
      model,
    }
    if (parsed.model && parsed.model !== model) {
      saveAiSettings(settings)
    }
    return settings
  } catch {
    return { ...defaultSettings }
  }
}

export function saveAiSettings(settings: AiSettings) {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings))
}

function readLegacyAiChats(): AiChat[] {
  try {
    const raw = localStorage.getItem(LEGACY_AI_CHATS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AiChat[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadAiChats(): AiChat[] {
  const fromStore = loadAiChatsFromStore()
  if (fromStore.length > 0) {
    return [...fromStore].sort((a, b) => b.updatedAt - a.updatedAt)
  }
  const legacy = readLegacyAiChats()
  if (legacy.length > 0) {
    saveAiChats(legacy)
    localStorage.removeItem(LEGACY_AI_CHATS_KEY)
    return [...legacy].sort((a, b) => b.updatedAt - a.updatedAt)
  }
  return []
}

export function saveAiChats(chats: AiChat[]) {
  saveAiChatsToStore([...chats].sort((a, b) => b.updatedAt - a.updatedAt))
  touchDataUpdatedAt()
}

export function getAiChat(id: string): AiChat | undefined {
  return loadAiChats().find((chat) => chat.id === id)
}

export function upsertAiChat(chat: AiChat) {
  const chats = loadAiChats()
  const idx = chats.findIndex((item) => item.id === chat.id)
  if (idx >= 0) chats[idx] = chat
  else chats.unshift(chat)
  saveAiChats(chats)
}

export function deleteAiChat(id: string) {
  saveAiChats(loadAiChats().filter((chat) => chat.id !== id))
}

export function createAiChat(): AiChat {
  const now = Date.now()
  return {
    id: `ai-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'New chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createAiMessage(role: AiMessage['role'], content: string): AiMessage {
  return {
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    createdAt: Date.now(),
  }
}

export function chatTitleFromMessage(content: string): string {
  const line = content.trim().split('\n')[0]?.trim() || 'New chat'
  return line.length > 48 ? `${line.slice(0, 45)}…` : line
}

export function normalizeAiSettings(partial: Partial<AiSettings>): AiSettings {
  const current = loadAiSettings()
  const vendor = partial.vendor ?? current.vendor
  const model = partial.model
    ? resolveModelForVendor(vendor, partial.model)
    : partial.vendor && partial.vendor !== current.vendor
      ? defaultModelForVendor(partial.vendor)
      : resolveModelForVendor(vendor, current.model)
  return {
    vendor,
    apiKey: partial.apiKey ?? current.apiKey,
    model,
  }
}

export type { AiVendor }
