import { authHeaders } from './auth'
import { loadBarcodeSettings } from './barcodeSettings'

export interface BarcodeProduct {
  barcode: string
  name: string
  brand?: string
  description?: string
  imageUrl?: string
  source: string
}

export interface BarcodeSource {
  id: string
  label: string
}

const USER_AGENT = 'CocktailFavorites/1.0 (https://github.com/arnonlafer/cocktail-favorites)'

/**
 * Databases are queried in this order, one at a time, so the scanner can offer
 * "look at the next database" when a hit looks wrong.
 */
export const BARCODE_SOURCES: BarcodeSource[] = [
  { id: 'openfoodfacts', label: 'Open Food Facts' },
  { id: 'openproductsfacts', label: 'Open Products Facts' },
  { id: 'openbeautyfacts', label: 'Open Beauty Facts' },
  { id: 'cola', label: 'COLA Cloud' },
  { id: 'upcitemdb', label: 'UPCitemdb' },
  { id: 'upcdatabase', label: 'UPC Database' },
  { id: 'upcdev', label: 'upc.dev' },
]

const OPEN_FACTS_HOSTS: Record<string, string> = {
  openfoodfacts: 'world.openfoodfacts.org',
  openproductsfacts: 'world.openproductsfacts.org',
  openbeautyfacts: 'world.openbeautyfacts.org',
}

interface OffProduct {
  product_name?: string
  product_name_en?: string
  generic_name?: string
  brands?: string
  categories?: string
  image_url?: string
}

/** Ignore case, punctuation, and spacing so "Coca-Cola" matches "Coca Cola Zero". */
function comparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function buildName(product: OffProduct): string | null {
  const productName =
    product.product_name?.trim() || product.product_name_en?.trim() || product.generic_name?.trim()
  const brand = product.brands?.split(',')[0]?.trim()
  if (!productName && !brand) return null
  if (productName && brand) {
    if (comparable(productName).includes(comparable(brand))) return productName
    return `${brand} ${productName}`
  }
  return productName || brand || null
}

async function lookupOpenFacts(
  host: string,
  barcode: string,
  label: string,
): Promise<BarcodeProduct[]> {
  const fields = 'product_name,product_name_en,generic_name,brands,categories,image_url,code'
  const url = `https://${host}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (!res.ok) return []

  const data = (await res.json()) as { status?: number; product?: OffProduct; code?: string }
  if (data.status !== 1 || !data.product) return []
  const name = buildName(data.product)
  if (!name) return []
  const description = [data.product.generic_name, data.product.categories]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => comparable(value) !== comparable(name))
    .join(' · ')

  return [
    {
      barcode: data.code || barcode,
      name,
      brand: data.product.brands?.split(',')[0]?.trim() || undefined,
      description: description || undefined,
      imageUrl: data.product.image_url?.trim() || undefined,
      source: label,
    },
  ]
}

async function lookupViaWorker(
  sourceId: string,
  barcode: string,
  label: string,
): Promise<BarcodeProduct[]> {
  const settings = loadBarcodeSettings()
  const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders() }
  if (settings.colaApiKey.trim()) headers['X-Cola-Api-Key'] = settings.colaApiKey.trim()
  if (settings.upcApiKey.trim()) headers['X-Upc-Api-Key'] = settings.upcApiKey.trim()
  if (settings.upcDatabaseApiKey.trim()) {
    headers['X-Upc-Database-Api-Key'] = settings.upcDatabaseApiKey.trim()
  }

  const path = `/api/barcode/${encodeURIComponent(barcode)}?source=${encodeURIComponent(sourceId)}`
  const res = await fetch(path, { headers })
  if (!res.ok) return []

  const body = (await res.json()) as { products?: BarcodeProduct[] }
  return (body.products ?? [])
    .filter((product) => product?.name?.trim())
    .map((product) => ({
      barcode: product.barcode || barcode,
      name: product.name.trim(),
      brand: product.brand?.trim() || undefined,
      description: product.description?.trim() || undefined,
      imageUrl: product.imageUrl?.trim() || undefined,
      source: product.source || label,
    }))
}

/** Query one database. Returns an empty list for misses so callers can move to the next source. */
export async function lookupBarcodeInSource(
  source: BarcodeSource,
  barcode: string,
): Promise<BarcodeProduct[]> {
  const openFactsHost = OPEN_FACTS_HOSTS[source.id]
  if (openFactsHost) return lookupOpenFacts(openFactsHost, barcode, source.label)
  return lookupViaWorker(source.id, barcode, source.label)
}

export interface BarcodeLookupHit {
  source: BarcodeSource
  products: BarcodeProduct[]
  /** Databases queried (and missed) before this hit, newest search only. */
  searched: BarcodeSource[]
  hasMoreSources: boolean
}

export interface BarcodeLookupSession {
  barcode: string
  hasMoreSources: () => boolean
  /**
   * Walk the remaining databases until one returns products. Resolves to null when
   * every remaining database came up empty.
   */
  next: () => Promise<BarcodeLookupHit | null>
}

export function createBarcodeLookupSession(barcode: string): BarcodeLookupSession {
  let index = 0

  return {
    barcode,
    hasMoreSources: () => index < BARCODE_SOURCES.length,
    async next() {
      const searched: BarcodeSource[] = []
      while (index < BARCODE_SOURCES.length) {
        const source = BARCODE_SOURCES[index]
        index += 1
        searched.push(source)
        let products: BarcodeProduct[]
        try {
          products = await lookupBarcodeInSource(source, barcode)
        } catch {
          continue
        }
        if (products.length > 0) {
          return { source, products, searched, hasMoreSources: index < BARCODE_SOURCES.length }
        }
      }
      return null
    },
  }
}

export function isValidBarcode(barcode: string): boolean {
  return /^\d{8,14}$/.test(barcode.trim())
}
