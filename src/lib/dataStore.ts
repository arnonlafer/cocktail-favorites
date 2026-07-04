import type { Cocktail, IngredientNutrition, SyncPayload, UserProfile } from '../types'

function emptyState(): Omit<SyncPayload, 'syncCode'> {
  return {
    updatedAt: 0,
    edits: {},
    custom: [],
    deletedIds: [],
    nutritionOverrides: [],
    userProfiles: {},
  }
}

let state = emptyState()
let dirty = false
const dirtyListeners = new Set<() => void>()

function notifyDirtyListeners() {
  dirtyListeners.forEach((listener) => listener())
}

export function subscribeDataDirty(listener: () => void) {
  dirtyListeners.add(listener)
  return () => {
    dirtyListeners.delete(listener)
  }
}

export function isDataDirty(): boolean {
  return dirty
}

export function markDataDirty() {
  if (dirty) return
  dirty = true
  notifyDirtyListeners()
}

export function clearDataDirty() {
  if (!dirty) return
  dirty = false
  notifyDirtyListeners()
}

export function getDataState(): Omit<SyncPayload, 'syncCode'> {
  return state
}

export function replaceDataFromServer(payload: SyncPayload) {
  state = {
    updatedAt: payload.updatedAt ?? 0,
    edits: payload.edits ?? {},
    custom: payload.custom ?? [],
    deletedIds: payload.deletedIds ?? [],
    nutritionOverrides: payload.nutritionOverrides ?? [],
    userProfiles: payload.userProfiles ?? {},
  }
  dirty = false
}

export function loadEdits(): Record<string, Cocktail> {
  return state.edits
}

export function saveEdits(edits: Record<string, Cocktail>, markDirty = true) {
  state.edits = edits
  if (markDirty) markDataDirty()
}

export function loadCustomCocktails(): Cocktail[] {
  return state.custom
}

export function saveCustomCocktails(cocktails: Cocktail[], markDirty = true) {
  state.custom = cocktails
  if (markDirty) markDataDirty()
}

export function loadDeletedIds(): string[] {
  return state.deletedIds
}

export function saveDeletedIds(ids: string[], markDirty = true) {
  state.deletedIds = ids
  if (markDirty) markDataDirty()
}

export function loadNutritionOverrides(): IngredientNutrition[] {
  return state.nutritionOverrides ?? []
}

export function saveNutritionOverrides(entries: IngredientNutrition[], markDirty = true) {
  state.nutritionOverrides = entries
  if (markDirty) markDataDirty()
}

export function loadUserProfiles(): Record<string, UserProfile> {
  return state.userProfiles
}

export function saveUserProfiles(profiles: Record<string, UserProfile>, markDirty = true) {
  state.userProfiles = profiles
  if (markDirty) markDataDirty()
}

export function touchDataUpdatedAt() {
  state.updatedAt = Date.now()
}
