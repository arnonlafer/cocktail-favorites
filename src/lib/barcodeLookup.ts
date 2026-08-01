export interface BarcodeProduct {
  barcode: string
  name: string
  brand?: string
  source: string
}

const USER_AGENT = 'CocktailFavorites/1.0 (https://github.com/arnonlafer/cocktail-favorites)'

interface OffProduct {
  product_name?: string
  product_name_en?: string
  generic_name?: string
  brands?: string
}

function buildName(product: OffProduct): string | null {
  const productName = product.product_name?.trim() || product.product_name_en?.trim() || product.generic_name?.trim()
  const brand = product.brands?.split(',')[0]?.trim()
  if (!productName && !brand) return null
  if (productName && brand) {
    const lower = productName.toLowerCase()
    if (lower.includes(brand.toLowerCase())) return productName
    return `${brand} ${productName}`
  }
  return productName || brand || null
}

async function lookupOpenFacts(host: string, barcode: string, source: string): Promise<BarcodeProduct | null> {
  const url = `https://${host}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_en,generic_name,brands,code`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { status?: number; product?: OffProduct; code?: string }
  if (data.status !== 1 || !data.product) return null
  const name = buildName(data.product)
  if (!name) return null
  return {
    barcode: data.code || barcode,
    name,
    brand: data.product.brands?.split(',')[0]?.trim(),
    source,
  }
}

/** Resolve a UPC/EAN barcode to a product name via open product databases. */
export async function lookupBarcodeProduct(barcode: string): Promise<BarcodeProduct | null> {
  const code = barcode.trim()
  if (!/^\d{8,14}$/.test(code)) return null

  const sources: Array<{ host: string; label: string }> = [
    { host: 'world.openfoodfacts.org', label: 'Open Food Facts' },
    { host: 'world.openproductsfacts.org', label: 'Open Products Facts' },
    { host: 'world.openbeautyfacts.org', label: 'Open Beauty Facts' },
  ]

  for (const source of sources) {
    try {
      const product = await lookupOpenFacts(source.host, code, source.label)
      if (product) return product
    } catch {
      // try next source
    }
  }
  return null
}
