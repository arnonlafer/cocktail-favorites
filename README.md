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
- Favorites, edits, custom cocktails, and preferences are stored in your browser (localStorage)
### Sync across devices (what you do on each phone)

1. Open the app → **Settings**
2. Enter the **same sync code** on every device (e.g. `my-bar`)
3. Tap **Save code**, then **Sync now**
4. After editing a recipe or adding a new one on one device, tap **Sync now** there, then **Sync now** on the other device (or reopen the app)

---

## One-time setup: enable cloud sync (required)

**Why:** Without this, edits and new recipes stay on one device only. The app stores them in the browser until cloud storage is turned on.

Do these steps **once**, on your computer.

### Step 1 — Log in to Cloudflare

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Log in and pick your account if asked

### Step 2 — Create a KV storage namespace

**Try the search bar first (easiest):**

1. At the top of the dashboard, click the **search** box
2. Type **Workers KV** and open **Workers KV** from the results
3. Click **Create instance** (or **Create a namespace**)
4. Name: `COCKTAIL_SYNC`
5. Click **Create**

**If search doesn’t work**, look in the **left sidebar** for **Storage & Databases** → **Workers KV**, then do steps 3–5 above.

**Copy the namespace ID** (you need it in Step 4):

- Click the `COCKTAIL_SYNC` namespace you just created
- Find **Namespace ID** (a long hex string like `a1b2c3d4e5f6...`)
- Copy it

### Step 3 — Attach storage to your app (worker binding)

1. In the left sidebar, open **Workers & Pages**
2. Click **cocktail-favorites**
3. Open the **Settings** tab (or **Bindings** tab, depending on your dashboard)
4. Scroll to **Bindings** → click **Add binding** (or **Add**)
5. Choose **KV namespace**
6. Fill in:
   - **Variable name:** `SYNC_KV` (must be exactly this)
   - **KV namespace:** select `COCKTAIL_SYNC`
7. Click **Save** or **Deploy**

### Step 4 — Add the namespace ID to the project

On your computer, open `wrangler.jsonc` in this repo and add the `kv_namespaces` block (use the ID from Step 2):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "cocktail-favorites",
  "main": "./worker/index.ts",
  "kv_namespaces": [
    { "binding": "SYNC_KV", "id": "PASTE_YOUR_NAMESPACE_ID_HERE" }
  ],
  ...
}
```

Commit and push to GitHub (or run `npm run deploy` from the project folder).

### Step 5 — Wait for deploy to finish

If you use GitHub → Cloudflare, wait until the latest build shows **Success** in Cloudflare.

### Step 6 — Confirm sync works

1. Open [https://cocktail-favorites.arnonlafer.workers.dev/settings](https://cocktail-favorites.arnonlafer.workers.dev/settings)
2. Enter a sync code → **Save code** → **Sync now**
3. You should **not** see “Cloud storage is not set up on the server yet”

---

### Alternative: do Steps 2 and 4 from the terminal

If the dashboard is still confusing, run this in the project folder:

```bash
cd ~/Dev/cocktail-favorites
npx wrangler login
npx wrangler kv namespace create COCKTAIL_SYNC
```

Wrangler prints a line like:

```text
{ "binding": "COCKTAIL_SYNC", "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

Copy that `id` into `wrangler.jsonc` as in Step 4, then still do **Step 3** in the dashboard (bind `SYNC_KV` to the namespace), commit, push, and redeploy.

---

Until Steps 1–6 are done, sync cannot work — data stays on each device only.
