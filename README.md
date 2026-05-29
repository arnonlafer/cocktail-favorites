# Cocktail Favorites

A mobile-first PWA for browsing, searching, and favoriting your cocktail recipes.

## Features

- 95+ recipes imported from your Google Doc
- Grouped by main spirit (cocktails with multiple spirits appear in each group)
- Search by name or ingredient
- Favorites and recently-opened sorting
- oz ↔ ml conversion with batch multiplier (×0.5–×4)
- Quick add form for new cocktails
- Installable on Android via "Add to Home screen"

## Development

```bash
npm install
npm run dev
```

Re-parse recipes after editing `scripts/raw-cocktails.txt`:

```bash
node scripts/parse-cocktails.mjs
```

## Deploy (Cloudflare Workers)

Live at: https://cocktail-favorites.arnonlafer.workers.dev/

Build settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler versions upload` |
| Output directory | `dist` |
| `NODE_VERSION` | **`22`** (required — Wrangler needs Node 22+) |

The repo includes `.node-version` set to `22`. If you previously set `NODE_VERSION=20` in the dashboard, **change it to `22`** or remove it so `.node-version` is used.

## Deploy (alternatives)

1. Push to GitHub
2. Import at [vercel.com](https://vercel.com) — it auto-detects Vite
3. Deploy

### Netlify

Same as above at [netlify.com](https://netlify.com) with build `npm run build` and publish `dist`.

All three are free, work great on Android, and support PWAs. Cloudflare Pages has unlimited bandwidth on the free tier.

## Data notes

- Built-in recipes live in `src/data/cocktails.json`
- Favorites, recently viewed, unit prefs, and custom cocktails are stored in your browser (localStorage)
- To sync across devices later, you could add Supabase (also has a generous free tier)
