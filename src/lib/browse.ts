const BROWSE_IDS_KEY = 'cocktail-favorites:browse-ids'

export function saveBrowseIds(ids: string[]) {
  sessionStorage.setItem(BROWSE_IDS_KEY, JSON.stringify(ids))
}

export function loadBrowseIds(): string[] {
  try {
    const raw = sessionStorage.getItem(BROWSE_IDS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

export function resolveBrowseIds(stateIds: string[] | undefined, cocktailId: string, allIds: string[]): string[] {
  if (stateIds?.length) {
    saveBrowseIds(stateIds)
    return stateIds
  }

  const stored = loadBrowseIds()
  if (stored.length) return stored

  if (allIds.includes(cocktailId)) return allIds
  return allIds.length ? allIds : [cocktailId]
}

export function browseNeighbors(browseIds: string[], currentId: string) {
  const index = browseIds.indexOf(currentId)
  if (index < 0) {
    return { index: -1, prevId: null, nextId: null, total: browseIds.length }
  }
  return {
    index,
    prevId: index > 0 ? browseIds[index - 1]! : null,
    nextId: index < browseIds.length - 1 ? browseIds[index + 1]! : null,
    total: browseIds.length,
  }
}
