import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/** Curated images for cocktails not in TheCocktailDB (Unsplash, free to use) */
const MANUAL_IMAGES = {
  cynarita: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80',
  'lion-s-tail': 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&q=80',
  'paper-plane': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d86?w=600&q=80',
  'brown-derby': 'https://images.unsplash.com/photo-1567222379150-75dd856ac297?w=600&q=80',
  'whiskey-smash': 'https://images.unsplash.com/photo-1527281400683-1aae7261d147?w=600&q=80',
  'ward-eight': 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&q=80',
  'dirty-shirley': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80',
  'army-navy': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80',
  'gold-rush': 'https://images.unsplash.com/photo-1567222379150-75dd856ac297?w=600&q=80',
  'naked-famous': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d86?w=600&q=80',
  scofflaw: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&q=80',
  'rosemary-gin-fizz': 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&q=80',
  'bourbon-carajillo': 'https://www.thecocktaildb.com/images/media/drink/n0sx531504372951.jpg',
  'agave-option': null,
  'bourbon-option': null,
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, '../src/data/cocktails.json');
const cocktails = JSON.parse(readFileSync(path, 'utf8'));

let patched = 0;
let removed = 0;
const filtered = cocktails.filter((c) => {
  if (['agave-option', 'bourbon-option', 'rosemary-sprig'].includes(c.id)) {
    removed++;
    return false;
  }
  return true;
});

for (const c of filtered) {
  if (!c.imageUrl && MANUAL_IMAGES[c.id]) {
    c.imageUrl = MANUAL_IMAGES[c.id];
    patched++;
  }
}

writeFileSync(path, JSON.stringify(filtered, null, 2));
console.log(`Applied ${patched} manual image fallbacks. Removed ${removed} false entries.`);
