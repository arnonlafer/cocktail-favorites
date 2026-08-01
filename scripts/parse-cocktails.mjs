import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(__dirname, 'raw-cocktails.txt'), 'utf8');
const lines = raw.split('\n').map((l) => l.trim());

const INGREDIENT_RE =
  /\b(\d+\s*\/\s*\d+|\d+\.?\d*|\d+\s+\d+\/\d+)\s*(oz\.?|ounce?s?|ml|fl|dash(?:es)?|pinch|teaspoon|tablespoon|pc|cup|tbsp|tsp)\b|\b(egg white|club soda|sparkling|espresso|coffee|beer|lager|soda|sprite|7up)\b|\bgarnish\b|\bsimple syrup\b|\blemon juice\b|\blime juice\b/i;
const INSTRUCTION_START = /^\d+\.\s/;
const SECTION_SKIP = /^(ingrdients|ingredients|instructions|tools:|garnish:)$/i;
const OPTION_LINE = /^(agave option|bourbon option|shake all and serve)$/i;
const GARNISH_RE = /^(?:for )?garnish[:\s-]*(.*)$/i;

function isTitleLine(line, nextLines) {
  if (!line || line.length < 3 || line.length > 80) return false;
  if (SECTION_SKIP.test(line)) return false;
  if (INSTRUCTION_START.test(line)) return false;

  const isAllCapsTitle = line === line.toUpperCase() && /[A-Z]/.test(line) && /\s/.test(line);

  if (!isAllCapsTitle) {
    if (INGREDIENT_RE.test(line)) return false;
    if (OPTION_LINE.test(line)) return false;
    if (/^(agave|bourbon) option:/i.test(line)) return false;
    if (/:\s*$/.test(line)) return false;
    if (/^for garnish/i.test(line)) return false;
    if (/^costume party by/i.test(line)) return false;
    if (/^pinch of/i.test(line)) return false;
    if (/^[\d.]+\s*(oz|ounce)/i.test(line)) return false;
    if (/^(absinthe, to rinse|lemon twist|lime wedge|orange peel|grapefruit twist|mint sprig|basil sprig|sage leaf|maraschino cherry|nutmeg|rosemary sprig|orange slice)$/i.test(line)) return false;
  }

  const lower = line.toLowerCase();
  if (lower.startsWith('add ') || lower.startsWith('combine ') || lower.startsWith('strain ')) return false;
  if (lower.startsWith('shake ') || lower.startsWith('stir ') || lower.startsWith('place ')) return false;
  if (lower.startsWith('rinse ') || lower.startsWith('build ') || lower.startsWith('float ')) return false;
  if (lower.startsWith('salt ') || lower.startsWith('fill ') || lower.startsWith('top ')) return false;
  if (lower.startsWith('brew ') || lower.startsWith('chill ') || lower.startsWith('muddle ')) return false;
  if (lower.startsWith('in a ') || lower.startsWith('start by')) return false;

  const hasIngredientSoon = nextLines.slice(0, 8).some((l) => INGREDIENT_RE.test(l) || /^\d/.test(l));
  const looksLikeName =
    line === line.toUpperCase() ||
    /^[A-Z(\[]/.test(line) ||
    /^[A-Z][a-z]+(\s+[A-Z&][a-z]*)*/.test(line);

  return looksLikeName && hasIngredientSoon;
}

function parseAmount(text) {
  const match = text.match(
    /^([\d\s\/\.]+)\s*(oz\.?|ounce?s?|ml|fl|dash(?:es)?|pinch|teaspoon|tablespoon|pc|cup|tbsp|tsp)?\s*(.*)$/i,
  );
  if (!match) return { amount: null, unit: null, name: text.trim() };

  const [, amountRaw, unitRaw, rest] = match;
  let amount = null;
  const cleaned = amountRaw.trim().replace(/\s+/g, ' ');
  if (cleaned.includes('/')) {
    const parts = cleaned.split(/\s+/);
    amount = parts.reduce((sum, part) => {
      if (part.includes('/')) {
        const [a, b] = part.split('/').map(Number);
        return sum + a / b;
      }
      return sum + Number(part);
    }, 0);
  } else {
    amount = Number(cleaned);
  }

  const unit = unitRaw?.toLowerCase().replace(/\.$/, '') ?? null;
  const normalizedUnit =
    unit?.startsWith('ounce') || unit === 'oz' ? 'oz' : unit?.startsWith('dash') ? 'dash' : unit;
  return { amount: Number.isFinite(amount) ? amount : null, unit: normalizedUnit, name: rest.trim() || text.trim() };
}

function titleCase(str) {
  return str
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(And|Or|Of|With|In|A|An|The)\b/g, (m) => m.toLowerCase())
    .replace(/^([a-z])/, (m) => m.toUpperCase());
}

function normalizeIngredientName(name) {
  return titleCase(
    name
      .replace(/^garnish[:\s-]*/i, '')
      .replace(/,\s*freshly squeezed$/i, '')
      .replace(/,\s*fresh$/i, '')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function extractGarnish(rawIngredients, rawInstructions) {
  const parts = [];

  for (const line of rawIngredients) {
    if (/^for garnish/i.test(line)) {
      parts.push(line.replace(/^for garnish,?\s*/i, '').trim());
      continue;
    }
    const match = line.match(GARNISH_RE);
    if (match?.[1]) parts.push(match[1].trim());
    else if (/^garnish[:\s-]/i.test(line)) {
      parts.push(line.replace(/^garnish[:\s-]*/i, '').trim());
    }
  }

  for (const step of rawInstructions) {
    const m = step.match(/garnish(?:\s+with|\s+as noted)?[:\s]+(.+?)(?:\.|$)/i);
    if (m?.[1]) parts.push(m[1].replace(/\.$/, '').trim());
  }

  const unique = [...new Set(parts.map((p) => normalizeIngredientName(p)).filter(Boolean))];
  const deduped = unique.join(', ').split(',').map((s) => s.trim()).filter(Boolean);
  const seen = new Set();
  const final = deduped.filter((g) => {
    const key = g.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return final.length ? final.join(', ') : null;
}

function isGarnishLine(line) {
  return /^for garnish/i.test(line) || /^garnish[:\s-]/i.test(line) || GARNISH_RE.test(line);
}

function inferMetadata(instructionsText) {
  const text = instructionsText.toLowerCase();

  let method = 'Shaken';
  if (text.includes('stir') && !text.includes('shake')) method = 'Stirred';
  else if (text.includes('dry-shake') || text.includes('dry shake')) method = 'Shaken';
  else if (text.includes('shake')) method = 'Shaken';
  else if (text.includes('muddle')) method = 'Muddled';
  else if (text.includes('build')) method = 'Built';
  else if (text.includes('blend')) method = 'Blended';

  let glass = 'Coupe';
  if (text.includes('rocks') || text.includes('old fashioned') || text.includes('old-fashioned') || text.includes('lowball')) {
    glass = 'Rocks';
  } else if (text.includes('highball') || text.includes('collins')) glass = 'Highball';
  else if (text.includes('martini') || text.includes('nick & nora') || text.includes('nick and nora')) glass = 'Martini';
  else if (text.includes('coupe')) glass = 'Coupe';
  else if (text.includes('flute')) glass = 'Flute';
  else if (text.includes('goblet') || text.includes('tiki')) glass = 'Tiki';
  else if (text.includes('wine glass')) glass = 'Wine';

  let ice = 'None';
  if (text.includes('crushed ice')) ice = 'Crushed';
  else if (text.includes('pebble')) ice = 'Pebbles';
  else if (text.includes('large ice') || text.includes('large cube') || text.includes('large piece') || text.includes('large chunk')) {
    ice = '1 large cube';
  } else if (
    text.includes('over fresh ice') ||
    text.includes('over ice') ||
    text.includes('filled with ice') ||
    text.includes('ice-filled') ||
    text.includes('with ice.')
  ) {
    ice = 'Cubed';
  } else if (text.includes('without ice') || text.includes('strained into a chilled') || text.includes('up into')) {
    ice = 'None';
  }

  return { method, glass, ice };
}

function simplifyInstructions(method, glass, ice, rawInstructions) {
  const text = rawInstructions.join(' ').toLowerCase();
  const steps = [];
  const hasMuddle = text.includes('muddle');
  const hasDryShake = text.includes('dry-shake') || text.includes('dry shake');
  const hasRinse = text.includes('rinse') && text.includes('absinthe');

  if (hasRinse) steps.push('Rinse a chilled glass with absinthe and discard excess.');
  if (hasMuddle) steps.push('Muddle fresh ingredients in the shaker.');

  if (hasDryShake) {
    steps.push('Combine all ingredients and dry shake without ice.');
    steps.push('Add ice and shake until well chilled.');
  } else if (method === 'Stirred') {
    steps.push('Combine all ingredients in a mixing glass with ice.');
    steps.push('Stir until well chilled and properly diluted.');
  } else if (method === 'Built') {
    steps.push('Add all ingredients directly to the serving glass.');
    steps.push('Fill with ice and stir gently to combine.');
  } else if (method === 'Muddled') {
    if (!hasMuddle) steps.push('Muddle fresh ingredients in the shaker.');
    steps.push('Add remaining ingredients and shake with ice until chilled.');
  } else if (method === 'Blended') {
    steps.push('Combine all ingredients with ice and blend until smooth.');
  } else {
    steps.push('Combine all ingredients in a shaker with ice.');
    steps.push('Shake until well chilled.');
  }

  if (glass === 'Rocks' && ice !== 'None') {
    const iceLabel = ice === '1 large cube' ? 'a large ice cube' : ice.toLowerCase() + ' ice';
    steps.push(`Strain into a rocks glass over ${iceLabel}.`);
  } else if (ice === 'None' || glass === 'Coupe' || glass === 'Martini') {
    steps.push(`Strain into a chilled ${glass.toLowerCase()} glass.`);
  } else {
    steps.push(`Strain into a ${glass.toLowerCase()} glass.`);
  }

  return steps.slice(0, 4);
}

const SPIRIT_RULES = [
  { category: 'Whiskey', re: /\b(bourbon|rye|whiskey|whisky|scotch|blended scotch)\b/i },
  { category: 'Gin', re: /\b(gin|london dry gin|dry gin)\b/i },
  { category: 'Tequila', re: /\b(tequila|mezcal|reposado|blanco tequila)\b/i },
  { category: 'Vodka', re: /\bvodka\b/i },
  { category: 'Rum', re: /\brum\b/i },
  { category: 'Brandy', re: /\b(brandy|cognac)\b/i },
  { category: 'Pisco', re: /\bpisco\b/i },
  { category: 'Wine & Beer', re: /\b(sparkling wine|prosecco|champagne|lager|beer|sparkling water)\b/i },
];

function detectSpirits(ingredientText, title = '') {
  const haystack = `${title}\n${ingredientText}`;
  if (/\b(mocktail|virgin|non[- ]?alcoholic|alcohol[- ]?free|zero[- ]?proof)\b/i.test(haystack)) {
    return ['Mocktails'];
  }
  const found = SPIRIT_RULES.filter(({ re }) => re.test(ingredientText)).map(({ category }) => category);
  return found.length ? found : ['Other'];
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatCocktailName(name) {
  return titleCase(name.replace(/\s+/g, ' ').trim());
}

const blocks = [];
let i = 0;
while (i < lines.length) {
  if (!lines[i]) {
    i++;
    continue;
  }
  if (isTitleLine(lines[i], lines.slice(i + 1))) {
    const title = lines[i];
    i++;
    const blockLines = [];
    while (i < lines.length) {
      if (isTitleLine(lines[i], lines.slice(i + 1))) break;
      // Skip duplicate subtitle line (e.g. "KEY LIME PIE" followed by "Key Lime Pie")
      if (
        blockLines.length === 0 &&
        lines[i] &&
        slugify(formatCocktailName(lines[i])) === slugify(formatCocktailName(title))
      ) {
        i++;
        continue;
      }
      if (lines[i]) blockLines.push(lines[i]);
      i++;
    }
    blocks.push({ title, blockLines });
  } else {
    i++;
  }
}

const cocktails = [];
const seen = new Set();

for (const { title, blockLines } of blocks) {
  const normalizedTitle = formatCocktailName(title);
  const slugBase = slugify(normalizedTitle);
  if (seen.has(slugBase)) continue;
  seen.add(slugBase);

  const rawIngredientLines = [];
  const rawInstructions = [];
  let mode = 'ingredients';

  for (const line of blockLines) {
    if (/^ingrdients$|^ingredients$/i.test(line)) continue;
    if (/^instructions$/i.test(line)) {
      mode = 'instructions';
      continue;
    }
    if (INSTRUCTION_START.test(line) || (mode === 'instructions' && line)) {
      mode = 'instructions';
      rawInstructions.push(line.replace(/^\d+\.\s*/, '').trim());
      continue;
    }
    if (mode === 'ingredients') {
      if (/^tools:/i.test(line)) continue;
      if (/^(agave|bourbon) option:/i.test(line)) continue;
      if (/^shake all/i.test(line)) continue;
      rawIngredientLines.push(line);
    }
  }

  const garnish = extractGarnish(rawIngredientLines, rawInstructions);
  const ingredients = [];

  for (const line of rawIngredientLines) {
    if (isGarnishLine(line)) continue;
    if (INGREDIENT_RE.test(line) || /^\d/.test(line) || /^pinch/i.test(line)) {
      const parsed = parseAmount(line);
      parsed.name = normalizeIngredientName(parsed.name);
      ingredients.push(parsed);
    } else if (line.length > 0 && !SECTION_SKIP.test(line)) {
      ingredients.push({ amount: null, unit: null, name: normalizeIngredientName(line) });
    }
  }

  if (!ingredients.length) continue;

  const ingredientText = ingredients.map((ing) => ing.name).join(' ');
  const instructionsText = rawInstructions.join(' ');
  const meta = inferMetadata(instructionsText + ' ' + ingredientText);
  const spirits = detectSpirits(ingredientText, normalizedTitle);
  const instructions = simplifyInstructions(meta.method, meta.glass, meta.ice, rawInstructions);

  cocktails.push({
    id: slugBase,
    name: normalizedTitle,
    method: meta.method,
    glass: meta.glass,
    ice: meta.ice,
    spirits,
    ingredients,
    garnish,
    instructions,
    imageUrl: null,
  });
}

writeFileSync(join(__dirname, '../src/data/cocktails.json'), JSON.stringify(cocktails, null, 2));
console.log(`Parsed ${cocktails.length} cocktails`);
