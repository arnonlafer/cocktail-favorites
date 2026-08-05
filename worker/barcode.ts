export interface BarcodeProductResult {
  barcode: string
  name: string
  brand?: string
  description?: string
  imageUrl?: string
  source: string
}

/** Barcode databases that must be queried server-side (API keys or missing CORS headers). */
export type WorkerBarcodeSourceId = 'cola' | 'upcitemdb' | 'upcdatabase' | 'upcdev'

export interface BarcodeApiKeys {
  colaApiKey?: string
  upcApiKey?: string
  upcDatabaseApiKey?: string
}

const USER_AGENT = 'CocktailFavorites/1.0 (https://github.com/arnonlafer/cocktail-favorites)'

interface ColaSummary {
  brand_name?: string
  product_name?: string
}

interface ColaBarcodeResponse {
  data?: {
    barcode_value?: string
    colas?: ColaSummary[]
    total_colas?: number
  }
}

interface UpcDevResponse {
  ok?: boolean
  data?: {
    upc?: string
    name?: string
    brand?: string
  }
  error?: string
}

interface UpcItemDbItem {
  ean?: string
  upc?: string
  title?: string
  description?: string
  brand?: string
  images?: string[]
}

interface UpcItemDbResponse {
  code?: string
  total?: number
  items?: UpcItemDbItem[]
}

interface UpcDatabaseResponse {
  success?: boolean
  barcode?: string
  title?: string
  alias?: string
  description?: string
  brand?: string
  error?: { code?: number; message?: string }
}

/** Ignore case, punctuation, and spacing so "Coca-Cola" matches "Coca Cola Zero". */
function comparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function combineBrandName(brand: string | undefined, productName: string | undefined): string | null {
  const brandTrim = brand?.trim()
  const nameTrim = productName?.trim()
  if (!brandTrim && !nameTrim) return null
  if (nameTrim && brandTrim) {
    if (comparable(nameTrim).includes(comparable(brandTrim))) return nameTrim
    return `${brandTrim} ${nameTrim}`
  }
  return nameTrim || brandTrim || null
}

/** upcdatabase.org and some COLA rows report a comma-separated brand list. Keep the first. */
function firstBrand(brand: string | undefined): string | undefined {
  return brand?.split(',')[0]?.trim() || undefined
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT, ...headers },
  })
  if (!res.ok) return null
  return (await res.json()) as T
}

export async function lookupColaCloud(
  barcode: string,
  apiKey: string | undefined,
): Promise<BarcodeProductResult[]> {
  const key = apiKey?.trim()
  if (!key) return []

  const body = await fetchJson<ColaBarcodeResponse>(
    `https://app.colacloud.us/api/v1/barcode/${encodeURIComponent(barcode)}`,
    { 'X-API-Key': key },
  )

  const results: BarcodeProductResult[] = []
  for (const cola of body?.data?.colas ?? []) {
    const name = combineBrandName(cola.brand_name, cola.product_name)
    if (!name) continue
    results.push({
      barcode: body?.data?.barcode_value || barcode,
      name,
      brand: firstBrand(cola.brand_name),
      source: 'COLA Cloud',
    })
  }
  return results
}

export async function lookupUpcDev(
  barcode: string,
  apiKey: string | undefined,
): Promise<BarcodeProductResult[]> {
  const key = apiKey?.trim()
  const body = await fetchJson<UpcDevResponse>(
    `https://upc.dev/v1/product/${encodeURIComponent(barcode)}`,
    key ? { 'X-API-Key': key } : {},
  )
  if (!body?.ok || !body.data) return []

  const name = combineBrandName(body.data.brand, body.data.name)
  if (!name) return []

  return [
    {
      barcode: body.data.upc || barcode,
      name,
      brand: firstBrand(body.data.brand),
      source: 'upc.dev',
    },
  ]
}

/**
 * upcitemdb trial endpoint. Free without a key but heavily rate limited, and it can
 * answer with loosely related products, so every hit is shown to the user for review.
 */
export async function lookupUpcItemDb(barcode: string): Promise<BarcodeProductResult[]> {
  const body = await fetchJson<UpcItemDbResponse>(
    `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`,
  )
  if (body?.code !== 'OK') return []

  const results: BarcodeProductResult[] = []
  for (const item of body.items ?? []) {
    const name = combineBrandName(item.brand === 'N/A' ? undefined : item.brand, item.title)
    if (!name) continue
    results.push({
      barcode: item.upc || item.ean || barcode,
      name,
      brand: item.brand === 'N/A' ? undefined : firstBrand(item.brand),
      description: item.description?.trim() || undefined,
      imageUrl: item.images?.find((image) => image.trim()),
      source: 'UPCitemdb',
    })
  }
  return results
}

/** upcdatabase.org answers 200 with success:false when a code is unknown. */
export async function lookupUpcDatabase(
  barcode: string,
  apiKey: string | undefined,
): Promise<BarcodeProductResult[]> {
  const key = apiKey?.trim()
  if (!key) return []

  const body = await fetchJson<UpcDatabaseResponse>(
    `https://api.upcdatabase.org/product/${encodeURIComponent(barcode)}?apikey=${encodeURIComponent(key)}`,
  )
  if (!body?.success) return []

  const title = body.title?.trim() || body.alias?.trim()
  const name = combineBrandName(firstBrand(body.brand), title)
  if (!name) return []

  return [
    {
      barcode: body.barcode?.trim() || barcode,
      name,
      brand: firstBrand(body.brand),
      description: body.description?.trim() || undefined,
      source: 'UPC Database',
    },
  ]
}

export function isWorkerBarcodeSource(value: string): value is WorkerBarcodeSourceId {
  return value === 'cola' || value === 'upcitemdb' || value === 'upcdatabase' || value === 'upcdev'
}

export function lookupBarcodeSource(
  source: WorkerBarcodeSourceId,
  barcode: string,
  keys: BarcodeApiKeys,
): Promise<BarcodeProductResult[]> {
  switch (source) {
    case 'cola':
      return lookupColaCloud(barcode, keys.colaApiKey)
    case 'upcitemdb':
      return lookupUpcItemDb(barcode)
    case 'upcdatabase':
      return lookupUpcDatabase(barcode, keys.upcDatabaseApiKey)
    case 'upcdev':
      return lookupUpcDev(barcode, keys.upcApiKey)
  }
}
