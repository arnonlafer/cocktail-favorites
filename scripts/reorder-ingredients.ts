import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sortCocktailIngredients } from '../src/lib/ingredientOrder.ts'
import type { Cocktail } from '../src/types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cocktailsPath = join(__dirname, '../src/data/cocktails.json')

const cocktails = JSON.parse(readFileSync(cocktailsPath, 'utf8')) as Cocktail[]
const reordered = cocktails.map(sortCocktailIngredients)

let changed = 0
for (let i = 0; i < cocktails.length; i++) {
  if (JSON.stringify(cocktails[i].ingredients) !== JSON.stringify(reordered[i].ingredients)) {
    changed++
  }
}

writeFileSync(cocktailsPath, `${JSON.stringify(reordered, null, 2)}\n`)
console.log(`Reordered ingredients in ${changed}/${cocktails.length} cocktails.`)
