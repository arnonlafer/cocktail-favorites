export interface BarcodeProductResult {
  barcode: string
  name: string
  brand?: string
  source: string
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

function combineBrandName(brand: string | undefined, productName: string | undefined): string | null {
  const brandTrim = brand?.trim()
  const nameTrim = productName?.trim()
  if (!brandTrim && !nameTrim) return null
  if (nameTrim && brandTrim) {
    if (nameTrim.toLowerCase().includes(brandTrim.toLowerCase())) return nameTrim
    return `${brandTrim} ${nameTrim}`
  }
  return nameTrim || brandTrim || null
}

export async function lookupColaCloud(
  barcode: string,
  apiKey: string,
): Promise<BarcodeProductResult | null> {
  const key = apiKey.trim()
  if (!key) return null

  const url = `https://app.colacloud.us/api/v1/barcode/${encodeURIComponent(barcode)}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      'X-API-Key': key,
    },
  })
  if (res.status === 404) return null
  if (!res.ok) return null

  const body = (await res.json()) as ColaBarcodeResponse
  const cola = body.data?.colas?.[0]
  if (!cola) return null

  const name = combineBrandName(cola.brand_name, cola.product_name)
  if (!name) return null

  return {
    barcode: body.data?.barcode_value || barcode,
    name,
    brand: cola.brand_name?.trim() || undefined,
    source: 'COLA Cloud',
  }
}

export async function lookupUpcDev(
  barcode: string,
  apiKey?: string,
): Promise<BarcodeProductResult | null> {
  const url = `https://upc.dev/v1/product/${encodeURIComponent(barcode)}`
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
  }
  const key = apiKey?.trim()
  if (key) headers['X-API-Key'] = key

  const res = await fetch(url, { headers })
  if (res.status === 404) return null
  if (!res.ok) return null

  const body = (await res.json()) as UpcDevResponse
  if (!body.ok || !body.data) return null

  const name = combineBrandName(body.data.brand, body.data.name)
  if (!name) return null

  return {
    barcode: body.data.upc || barcode,
    name,
    brand: body.data.brand?.trim() || undefined,
    source: 'upc.dev',
  }
}

/** COLA Cloud first (when keyed), then upc.dev. */
export async function lookupBarcodeFallbacks(
  barcode: string,
  keys: { colaApiKey?: string; upcApiKey?: string },
): Promise<BarcodeProductResult | null> {
  if (keys.colaApiKey?.trim()) {
    try {
      const cola = await lookupColaCloud(barcode, keys.colaApiKey)
      if (cola) return cola
    } catch {
      // try upc.dev
    }
  }

  try {
    return await lookupUpcDev(barcode, keys.upcApiKey)
  } catch {
    return null
  }
}
