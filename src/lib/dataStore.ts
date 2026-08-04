import type { AiChat, Cocktail, IngredientNutrition, SyncPayload, UserProfile } from '../types'

function emptyState(): Omit<SyncPayload, 'syncCode'> {
  return {
    updatedAt: 0,
    edits: {},
    custom: [],
    deletedIds: [],
    nutritionOverrides: [],
    userProfiles: {},
    aiChats: [],
  }
}

let state = emptyState()

export function getDataState(): Omit<SyncPayload, 'syncCode'> {
  return state
}

export function replaceDataFromServer(payload: Omit<SyncPayload, 'syncCode'> | SyncPayload) {
  state = {
    updatedAt: payload.updatedAt ?? 0,
    edits: payload.edits ?? {},
    custom: payload.custom ?? [],
    deletedIds: payload.deletedIds ?? [],
    nutritionOverrides: payload.nutritionOverrides ?? [],
    userProfiles: payload.userProfiles ?? {},
    aiChats: payload.aiChats ?? [],
  }
}

export function loadEdits(): Record<string, Cocktail> {
  return state.edits
}

export function saveEdits(edits: Record<string, Cocktail>) {
  state.edits = edits
}

export function loadCustomCocktails(): Cocktail[] {
  return state.custom
}

export function saveCustomCocktails(cocktails: Cocktail[]) {
  state.custom = cocktails
}

export function loadDeletedIds(): string[] {
  return state.deletedIds
}

export function saveDeletedIds(ids: string[]) {
  state.deletedIds = ids
}

export function loadNutritionOverrides(): IngredientNutrition[] {
  return state.nutritionOverrides ?? []
}

export function saveNutritionOverrides(entries: IngredientNutrition[]) {
  state.nutritionOverrides = entries
}

export function loadUserProfiles(): Record<string, UserProfile> {
  return state.userProfiles
}

export function saveUserProfiles(profiles: Record<string, UserProfile>) {
  state.userProfiles = profiles
}

export function loadAiChatsFromStore(): AiChat[] {
  return state.aiChats ?? []
}

export function saveAiChatsToStore(chats: AiChat[]) {
  state.aiChats = chats
}

export function touchDataUpdatedAt() {
  state.updatedAt = Date.now()
}
