import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = 'https://www.thecocktaildb.com/api/json/v1/1/search.php';

/** Map obscure/custom names to TheCocktailDB searchable names */
const ALIASES = {
  'last-flight': 'last word',
  'monter-cassino': 'last word',
  '9th-wonder': 'margarita',
  'midnight-flight-new-year-s-eve': 'aperol spritz',
  'banana-carajillo': 'carajillo',
  'key-lime-pie': 'key lime pie',
  'royal-sovereign': 'whiskey sour',
  'baby-turtle': 'margarita',
  'ruby-cocktail': 'ruby cocktail',
  'juliet-romeo': 'gin fizz',
  'french-blonde': 'french blonde',
  'lion-s-tail': 'lion\'s tail',
  'paper-plane': 'paper plane',
  'arnon-s-ultima-palabra': 'last word',
  'old-fashioned': 'old fashioned',
  'my-boy-blue': 'margarita',
  'blackberry-mint-julep': 'mint julep',
  'enzoni': 'negroni',
  'whiskey-sour': 'whiskey sour',
  'espresso-martini': 'espresso martini',
  'penicillin': 'penicillin',
  'oaxaca-old-fashioned': 'oaxaca old fashioned',
  'beericano': 'americano',
  'upgraded-bourbon-carajillo': 'carajillo',
  'mexican-carajillo': 'carajillo',
  'paloma-v2': 'paloma',
  'arnon-s-sunset-passion': 'passion fruit martini',
  'the-pisco-sour': 'pisco sour',
  'maximillian-affair': 'margarita',
  'elske-shaken': 'margarita',
  'firecracker': 'margarita',
  'tomatini': 'martini',
  'left-hand': 'boulevardier',
  'gin-basil-smash': 'gin basil smash',
  'the-ninth-ward': 'whiskey sour',
  'international-incident': 'white russian',
  'brown-derby': 'brown derby',
  'palo-santo-old-fashioned': 'old fashioned',
  'yesterday-today-and-amaro': 'manhattan',
  'giny-germain': 'gin fizz',
  'the-bamboozled-angel': 'whiskey sour',
  'daily-rituals': 'espresso martini',
  'debbie-don-t': 'margarita',
  'kentucky-maid': 'mint julep',
  'brandy-alexander': 'brandy alexander',
  'white-negroni': 'negroni',
  'johann-goes-to-mexico': 'margarita',
  'pink-squirrel': 'pink squirrel',
  'nutella-fitzgerald': 'whiskey sour',
  'ultima-palabra': 'last word',
  'paloma-margarita': 'paloma',
  'bourbon-renewal': 'whiskey sour',
  'napoleon': 'sidecar',
  'whiskey-smash': 'whiskey smash',
  'vodka-apricot-cacao': 'white russian',
  'classic-margarita': 'margarita',
  'devil-s-margarita': 'margarita',
  'bourbon-carajillo': 'carajillo',
  'negroni': 'negroni',
  'carajillo': 'carajillo',
  'watermelon-margarita': 'margarita',
  'smoke-on-the-water': 'margarita',
  'chi-chi': 'pina colada',
  'lemon-elderflower-sour-with-vodka': 'whiskey sour',
  'pornstar-martini': 'pornstar martini',
  'blacker-the-berry-the-sweeter-the-juice': 'margarita',
  'mr-bullock-avec': 'manhattan',
  'mezcal-espresso-martini': 'espresso martini',
  'green-negroni': 'negroni',
  'tiger-dwl-valle-cocktail': 'margarita',
  'mexican-firing-squad': 'margarita',
  'paris-is-burning': 'margarita',
  'blackberry-sage-margarite': 'margarita',
  'arnon-s-siesta': 'margarita',
  'silk-stocking': 'margarita',
  'white-toreador': 'margarita',
  'division-bell': 'margarita',
  'ward-eight': 'ward 8',
  'dirty-shirley': 'shirley temple',
  'white-russian-w-baileys': 'white russian',
  'last-word': 'last word',
  'creamy-espresso-martini': 'espresso martini',
  'hemingway-daiquiri-papa-doble': 'daiquiri',
  'the-henderson-old-fashioned': 'old fashioned',
  'army-navy': 'army navy',
  'gold-rush': 'gold rush',
  'aviation-cocktail': 'aviation',
  'churchill': 'manhattan',
  'perfect-manhattan': 'manhattan',
  'naked-famous': 'paper plane',
  'rosemary-gin-fizz': 'gin fizz',
  'boulevardier': 'boulevardier',
  'corpse-reviver-no-2': 'corpse reviver',
  'milk-punch': 'milk punch',
  'classic-daiquiri': 'daiquiri',
  'scofflaw': 'scofflaw',
  'french-blonde': 'french 75',
  'lion-s-tail': 'lion tail',
  'paper-plane': 'paper plane',
  'oaxaca-old-fashioned': 'old fashioned',
  'brown-derby': 'brown derby',
  'pink-squirrel': 'pink lady',
  'whiskey-smash': 'whiskey smash',
  'carajillo': 'espresso martini',
  'banana-carajillo': 'espresso martini',
  'upgraded-bourbon-carajillo': 'espresso martini',
  'mexican-carajillo': 'espresso martini',
  'ward-eight': 'ward 8',
  'dirty-shirley': 'shirley temple',
  'army-navy': 'army and navy',
  'gold-rush': 'gold rush',
  'naked-famous': 'paper plane',
  'ruby-cocktail': 'cosmopolitan',
  'espresso-martini': 'espresso martini',
  'bourbon-renewal': 'whiskey sour',
  'key-lime-pie': 'grasshopper',
};

function cleanSearchName(name) {
  return name
    .replace(/^arnon'?s\s+/i, '')
    .replace(/^the\s+/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchCocktail(query) {
  const url = `${API}?s=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const drinks = data.drinks;
  if (!drinks?.length) return null;
  return drinks[0].strDrinkThumb || null;
}

async function findImage(cocktail) {
  const queries = [
    ALIASES[cocktail.id],
    cleanSearchName(cocktail.name),
    cocktail.name.split(/\s+/).slice(0, 2).join(' '),
  ].filter(Boolean);

  for (const q of queries) {
    const img = await searchCocktail(q);
    if (img) return { url: img, query: q };
    await sleep(120);
  }
  return null;
}

const cocktails = JSON.parse(readFileSync(join(__dirname, '../src/data/cocktails.json'), 'utf8'));
const toFetch = cocktails.filter((c) => !c.imageUrl);
let found = 0;
let missed = 0;

console.log(`Fetching images for ${toFetch.length} cocktails without images…\n`);

for (let i = 0; i < toFetch.length; i++) {
  const c = toFetch[i];
  process.stdout.write(`[${i + 1}/${toFetch.length}] ${c.name}… `);
  const result = await findImage(c);
  if (result) {
    c.imageUrl = result.url;
    found++;
    console.log(`✓ (${result.query})`);
  } else {
    missed++;
    console.log('—');
  }
  await sleep(120);
}

writeFileSync(join(__dirname, '../src/data/cocktails.json'), JSON.stringify(cocktails, null, 2));
console.log(`\nDone: ${found} images found, ${missed} without match.`);
