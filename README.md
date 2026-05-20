# 🏪 AI E-Commerce HQ

A full-stack dashboard for turning product ideas into AI-researched, Etsy-ready listings.

---

## What This App Does

1. **Add** a product idea (e.g. "Personalized Star Map Print")
2. **Click "Generate AI Content"** → get buyer persona, market scores, Etsy title/tags/description, and design prompts
3. **Review** the AI-generated content
4. **Approve** the listing when it looks good
5. **Create an Etsy Draft** (simulated for now — easy to connect to real Etsy later)

### Trend Scanner (new)

Use **Trend Scanner** in the top bar to capture structured trend signals from any platform (TikTok, Etsy, Reddit, Pinterest, etc.). This is **manual / assisted intake only** — no scraping or paid APIs in this build. Each scan captures keyword, source, niche, product angle, observed engagement, trend strength, and competition signal. **Convert to idea** turns a scan into a row in the existing **Ideas & Research** system so the rest of the pipeline (scoring → product → POD → listing → POD prep → design package) stays unchanged. Replace `routes/trends.js` consumers later with real provider integrations without changing the SQLite shape.

### Ideas / research intake (new)

Use **Ideas & Research** in the top bar to capture raw opportunities (source, niche, costs, evidence) and run a **rule-based opportunity score** (0–100) with a clear recommendation band. When you are ready, **convert** an idea into a normal **product** row so the existing AI, digital product CSV, and Etsy draft flows work unchanged.

### POD concept studio (new)

From any **product detail** modal, open **Product Concept Studio** to generate **3–5 template-based POD apparel concepts** (aesthetics, slogans, placements, mockup prompts, margin hints). **Select** a direction, optionally **reject** others, then **Generate listing** to store **Etsy-style title, tags, description, SEO keywords, and pricing notes** on the product (`listingData`) — separate from the classic **Generate AI Content** path so you can iterate on POD without breaking the original workflow. Swap `podConceptService.js` for OpenAI later using the same route shapes.

### Printify / POD prep mode (new)

After you **select a concept**, use **Generate POD Prep** to save a **Printify-oriented prep packet** on the product (`podPrep`): recommended catalog shape (tee, crew, hoodie, poster, tote, sticker), colors, print placement/area, **estimated production cost, retail, profit, and margin %**, plus fulfillment, mockup, file, and risk notes. This is **prep only** — no Printify API keys or storefront sync yet. A future integration can replace the template block with live catalog IDs and pricing while keeping the same persisted fields.

### Design package studio (new)

Once **listing** and **POD prep** exist for the **selected concept**, **Generate Design Package** saves `designPackage` on the product: a **master design prompt**, alternates, **mockup prompts**, **social post concepts**, typography/color/visual direction, print/export guidance, and an **`imageGenerationProviderReady`** flag indicating the payload is shaped for a future image API adapter (DALL·E, SDXL, Ideogram, etc.) — **no image keys or generation calls** in this build. Replace `designPackageService.js` internals when you add real providers; keep the route and SQLite field.

### Printify draft preview (preview mode) (new)

Once a product has a **selected concept + listing + POD prep**, click **Generate Printify Preview** inside the Concept Studio to save a `printifyPreview` object on the product. It builds a Printify-shaped draft *without any network calls or API keys* — useful for sanity-checking what a real publish payload will look like before you wire the integration. The saved preview includes:

- `provider`, `productType`, `recommendedBlueprint` (id + name), `recommendedPrintProvider` (id + name)
- `suggestedColors`, `suggestedSizes`, `printPlacement`
- `retailPrice`, `productionCost`, `estimatedProfit`, `estimatedMarginPercent`
- `designFileRequirements`, `mockupInstructions`
- `publishReadinessChecklist` (concept selected, listing generated, POD prep, design package, print file ready, mockups uploaded, Printify connected)
- `apiPayloadPreview` — a real Printify-shaped body (`blueprint_id`, `print_provider_id`, `variants[]`, `print_areas[]`, `metadata`) that mirrors `POST /v1/shops/{shop_id}/products.json`. Placeholder image / variant IDs are clearly marked so a future integration can swap them for real catalog IDs without changing call sites.

> **Preview mode only — not connected to Printify API yet.**
> No `PRINTIFY_API_KEY` is required. Backend route: `POST /api/products/:id/generate-printify-preview`. Persisted in SQLite as `products.printifyPreview` (new column; auto-migrated by `db.js`). Whenever upstream data changes (concept selection, listing, POD prep, design package), the preview is invalidated automatically to stay consistent.

### Artwork generation prep (preparation mode) (new)

Once a product has a **selected concept + POD prep** (listing / design package / Printify preview enrich the brief when present), click **Prepare Artwork** in the Concept Studio to save `artworkAssets` + flip `artworkStatus` to `"prepped"` on the product. It's a **pure template generator** — no image-generation API is called, no keys are needed. Persisted fields on `products.artworkAssets`:

- `artworkPrompt` — full brief composed from concept (aesthetic, slogan, palette, placement) + POD prep (color, print area) + optional design-package master prompt + Printify blueprint hint. Paste-ready for DALL·E, SDXL, Ideogram, etc.
- `negativePrompt` — curated IP-safe block (no third-party logos, no trademarks, no celebrity likenesses, no garbled text, no halftone moiré, etc.)
- `styleNotes` — short tags-line for aesthetic / palette / placement / trend alignment / IP posture
- `recommendedCanvasSize` — shape-aware (e.g. `4500 × 5400 px @ 300 DPI, sRGB (front print)` for a T-shirt; `5400 × 7200 px (18×24 in with 0.125" full-bleed)` for a poster)
- `transparentBackgroundRequired` — `true` for apparel + sticker + tote, `false` for poster
- `printFileRequirements` — best of (Printify preview file reqs → design-package print-file guidelines → POD prep print-file requirements → shape default), so this field is never thin
- `status` — currently `"prepped"`. `"image_generated"` and `"uploaded"` are reserved for a future image-API / manual-upload pass.
- `generatedImages: []` / `manualUploads: []` — placeholder arrays the UI renders as empty slots, ready to be wired to a real image-generation provider or upload flow later
- `source` — provenance: which `conceptId` / `podPrepId` / `listingFromConceptId` / `designPackageId` / `printifyPreviewId` produced this brief
- `createdAt`

The UI shows the brief + negative prompt as **copy-ready blocks** (with copy buttons), plus a third "Copy combined prompt + negatives" button and a 4-slot empty placeholder grid for future generated / uploaded artwork.

> **Preparation mode only — no image APIs are called yet.**
> Backend route: `POST /api/products/:id/prepare-artwork`. Requires a selected concept + POD prep; listing / design package / Printify preview are optional enrichers. Persisted in SQLite as `products.artworkStatus` + `products.artworkAssets` (new columns; auto-migrated by `db.js`). Whenever upstream data changes (concept selection, listing, POD prep, design package, Printify preview), the **prep brief** is cleared automatically — but **uploaded artwork files are preserved** (see below).

### Artwork asset management (local storage) (new)

The `artworkAssets` blob can now hold a list of real **uploaded / generated / mockup** files alongside the optional prep brief. This is the surface that a future image-generation API or Printify upload integration plugs into — no schema rewrites required when those land.

Shape (additive to the prep fields):
```jsonc
{
  // ...optional prep fields (artworkPrompt, negativePrompt, ...)
  "items": [
    {
      "id": "uuid",
      "type": "uploaded" | "manual" | "generated" | "mockup",
      "fileName": "<productId>_<assetId>_<sanitized-original>.png",
      "originalFileName": "logo.png",
      "fileUrl": "/artwork/<fileName>",
      "previewUrl": "/artwork/<fileName>",
      "width": 4500, "height": 5400,
      "transparentBackground": true,
      "status": "draft" | "approved" | "rejected",
      "isPrimary": true,
      "sourceConceptId": "uuid|null",
      "mimeType": "image/png", "sizeBytes": 1234567,
      "createdAt": "ISO", "updatedAt": "ISO"
    }
  ]
}
```

**Top-level `products.artworkStatus` is now derived** from the union of prep + items: `not_prepared → prepped → uploaded → approved`. The first uploaded item is auto-promoted to **primary**; uploading another with `isPrimary=true` demotes it; removing the primary auto-promotes the first remaining item.

**Routes** (all `:id` is the product id):
| Verb | Path | Notes |
|---|---|---|
| `POST` | `/api/products/:id/upload-artwork` | `multipart/form-data` — fields: `file` (PNG / JPEG / WEBP / GIF / SVG, ≤ 20 MB), optional `type`, optional `isPrimary=true` |
| `POST` | `/api/products/:id/artwork/:assetId/approve` | flips item `status` to `approved` |
| `POST` | `/api/products/:id/artwork/:assetId/reject` | flips item `status` to `rejected` |
| `POST` | `/api/products/:id/artwork/:assetId/set-primary` | promotes one item to primary, demotes the rest |
| `DELETE` | `/api/products/:id/artwork/:assetId` | removes the DB record AND the file on disk |

**Local storage.** Uploaded files are written to `backend/generated-artwork/` and served inline at `GET /artwork/<filename>` (parallel to how CSVs are served at `/downloads/`). Filenames are namespaced as `<productId>_<assetId>_<sanitized-original>` so they're collision-proof and easy to clean up. The folder itself is committed (with `.gitkeep`) so the path exists after `git clone`; the upload files themselves are gitignored.

**Width / height** are read with the `image-size` library (no native deps) for raster formats. **Transparent background** is set by file format: PNG / WEBP / GIF / SVG → `true`; JPEG → `false`. No actual pixel inspection is done — JPEG simply can't carry alpha.

**Upstream invalidation behavior.** When you re-generate concepts / re-select a concept / re-generate listing / POD prep / design package / Printify preview, the **prep brief is cleared** so the prompts stay consistent with upstream inputs. **Uploaded asset records and their files on disk are NOT destroyed** — they're treated as user-owned work product. Re-running `prepare-artwork` merges the new brief on top of the existing items.

**Cascade cleanup.** `DELETE /api/products/:id` walks `artworkAssets.items` and removes each underlying file before deleting the product row, so deleting a product no longer leaves orphan files on disk.

> **Preparation mode only — no image-generation API and no Printify upload yet.**
> The frontend "Upload artwork" button in the Concept Studio → Artwork section accepts any of the supported formats and renders the resulting items as preview cards with **Approve / Reject / Primary / Delete** controls. When a future image-generation provider (DALL·E / SDXL / Ideogram) is wired in, it can write its result through the **same** `addItem` helper with `type: "generated"` — the UI, route surface, and persisted shape stay identical.

### Launch checklist & recommended next action (new)

Every product detail modal now shows a **Product Launch Checklist** at the top: trend/idea source, idea scored, product created, design concepts generated, concept selected, listing generated, POD prep, design package, AI listing content (optional), digital product CSV (optional), approved, Etsy draft (simulated), and a placeholder **Published** step (future Printify/Etsy publish). Each step is marked **done / pending / blocked / optional / future** with a short hint and live progress bar.

A single **Recommended Next Action** card sits above the checklist and tells you the one most useful next step (e.g. *"Select one concept before generating a listing."*, *"Generate POD Prep before Design Package."*, *"Ready for Etsy draft simulation."*). Each **product card** on the dashboard also shows a compact `Next · …` line so you can scan progress at a glance. All progress is **derived from existing fields** — no schema changes, no extra API calls.

### Optional OpenAI text generation (backend-only) (new)

The app **runs perfectly without any AI API key** — every generator (POD concepts, listing copy, design package, opportunity scoring, AI listing content) has a deterministic template fallback that always returns the same JSON shape. When you opt in by setting `OPENAI_API_KEY` on the **backend** environment only, these generators *augment* their output with real model copy:

| Surface | OpenAI augments | Always rule-based / deterministic |
|---|---|---|
| `POST /api/products/:id/generate-concepts` | `conceptName`, `slogan`, `aesthetic`, `colorPalette`, `placement`, `apparelType`, `designStyle`, `designNotes`, `mockupPrompt`, `targetCustomer`, `copyrightRisk`, `trendAlignment`, `recommendedStatus` | UUIDs, prices, margin %, timestamps, IP/trademark sanitization |
| `POST /api/products/:id/generate-listing` | `etsyTitle`, `etsyTags[13]`, `etsyDescription`, `seoKeywords`, `audienceNotes` | Pricing recommendation, `fromConceptId`, timestamps, sanitization |
| `POST /api/products/:id/generate-design-package` | `masterDesignPrompt`, `alternateDesignPrompts[3]`, `mockupPrompts[3]`, `aestheticPack`, `typographySuggestions`, `colorSystem`, `visualDirection`, `printFileGuidelines`, `exportRecommendations`, `adCreativeIdeas[3]`, `socialMediaConcepts[2]` | UUID, `selectedConceptId`, `imageGenerationProviderReady`, timestamps |
| `POST /api/ideas/:id/score` | `scoreBreakdown.summary` (rewritten plain-English) + new optional `scoreBreakdown.narrative` | **All six 0–100 sub-scores + overall + decision band stay 100% rule-based** |
| `POST /api/products/:id/generate-ai` (existing `aiService`) | already supports OpenAI; behavior unchanged | mock fallback unchanged |

**How fallback works.** Every async generator builds its full template result first, then calls the central helper `backend/services/openaiTextService.js`. If `OPENAI_API_KEY` is missing, the helper logs `OPENAI_API_KEY missing, using template generator (...)` and returns immediately so the template result is used. If the OpenAI call fails (network, rate limit, malformed JSON), the helper logs `OpenAI failed, using template fallback (...)` and the template result is used. Any individual missing/invalid field in a successful response is also backfilled from the template. **The persisted JSON shape on the product/idea is therefore always identical.**

**Security model.**
- OpenAI is **backend-only**. The frontend never sees `OPENAI_API_KEY` and there is **no `VITE_OPENAI_*` variable** anywhere.
- `OPENAI_API_KEY` belongs in `backend/.env` (gitignored) for local dev and in Render's environment variables for deploys. **Never paste it into `.env.example`** — that file is checked into git.
- Costs are billed against the **OpenAI API account** that owns the key (separate from any ChatGPT subscription).

**Where to set the key.**
- **Local backend dev:** edit `backend/.env`:
  ```
  OPENAI_API_KEY=sk-...
  OPENAI_MODEL=gpt-4o-mini
  ```
  then `cd backend && npm run dev`.
- **Render (production):** dashboard → your backend service → **Environment** → add `OPENAI_API_KEY` and (optionally) `OPENAI_MODEL`. Hit **Save changes**; Render redeploys automatically. Vercel (frontend) needs **no changes**.
- **Verify it's active:** start the backend and trigger any generation. Console logs will say `🤖 Using OpenAI for POD concepts (model gpt-4o-mini)` when active, or `ℹ️ OPENAI_API_KEY missing, using template generator (...)` when not. The frontend behaves identically either way.

---

## Project Structure

```
ai-ecommerce-hq/
├── backend/                   ← Node.js + Express API
│   ├── server.js              ← Entry point — starts the server
│   ├── .env.example           ← Copy to .env for API keys / CORS / PORT
│   ├── package.json
│   ├── routes/
│   │   ├── products.js        ← All /api/products endpoints
│   │   ├── ideas.js           ← Ideas intake + scoring + convert
│   │   └── trends.js          ← Trend Scanner intake + convert-to-idea
│   ├── services/
│   │   ├── openaiTextService.js ← Central JSON-mode helper (no-throw; auto-fallback)
│   │   ├── aiService.js       ← AI content generation (mock or OpenAI)
│   │   ├── etsyService.js     ← Etsy integration (mock or real)
│   │   ├── digitalProductService.js
│   │   ├── opportunityScorer.js ← Rule-based idea scoring + optional OpenAI narrative
│   │   ├── podConceptService.js ← POD concepts + listing (template + optional OpenAI augmentation)
│   │   ├── designPackageService.js ← Design package (template + optional OpenAI augmentation)
│   │   ├── printifyPreviewService.js ← Printify draft preview (pure template; preview mode)
│   │   ├── artworkPrepService.js  ← Artwork generation prep (pure template; preparation mode, no image APIs)
│   │   └── artworkAssetService.js ← Artwork asset list helpers (add / approve / reject / primary / remove / derive status)
│   ├── generated-artwork/     ← Uploaded artwork assets (gitignored; folder kept via .gitkeep)
│   └── data/
│       ├── db.js              ← SQLite (products + ideas + trend_scans)
│       └── products.sqlite    ← Created automatically (gitignored)
│
└── frontend/                  ← React + Vite app
    ├── .env.example           ← VITE_API_BASE_URL, VITE_APP_PASSWORD (optional)
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx            ← Entry point
        ├── App.jsx             ← Root component
        ├── index.css           ← Global styles
        ├── services/
        │   └── api.js          ← All API calls (VITE_API_BASE_URL in production)
        ├── utils/
        │   └── launchProgress.js ← Pure helpers: getLaunchSteps + getNextAction
        ├── pages/
        │   ├── Dashboard.jsx     ← Product pipeline dashboard
        │   ├── IdeasResearch.jsx ← Ideas intake + scoring UI
        │   └── TrendScanner.jsx  ← Manual/assisted trend intake UI
        └── components/
            ├── PrivateAccessGate.jsx ← Optional VITE_APP_PASSWORD gate
            ├── AddProductModal.jsx
            ├── AddIdeaModal.jsx
            ├── AddTrendScanModal.jsx
            ├── IdeaCard.jsx
            ├── TrendScanCard.jsx
            ├── ProductCard.jsx          ← Card shown in the dashboard grid (now shows Next · …)
            ├── ProductDetailModal.jsx   ← Full detail view with all AI data
            ├── LaunchChecklist.jsx      ← Workflow checklist + recommended next action
            ├── PodConceptStudio.jsx     ← POD concepts + listing preview + design package
            ├── StatusBadge.jsx          ← Colored status indicator
            └── ScoreMeter.jsx           ← Visual score bar (1–10)
```

---

## Setup & Installation

You'll need two terminal windows — one for the backend, one for the frontend.

### Prerequisites

- **Node.js v18+** — Download at https://nodejs.org
- A code editor (VS Code recommended)

---

### Step 1 — Install Backend Dependencies

```bash
# Navigate into the backend folder
cd ai-ecommerce-hq/backend

# Install packages
npm install
```

### Step 2 — Install Frontend Dependencies

```bash
# Open a second terminal and navigate into the frontend folder
cd ai-ecommerce-hq/frontend

# Install packages
npm install
```

---

### Step 3 — Start the Backend

```bash
# In the backend folder
cd ai-ecommerce-hq/backend

# Start with auto-restart on file changes (development mode)
npm run dev

# Or without auto-restart:
npm start
```

You should see:
```
🚀 Backend server running at http://localhost:3001
   Health check: http://localhost:3001/api/health
   Products API: http://localhost:3001/api/products
```

Test it's working: open http://localhost:3001/api/health in your browser.

---

### Step 4 — Start the Frontend

```bash
# In the frontend folder (second terminal)
cd ai-ecommerce-hq/frontend

npm run dev
```

You should see:
```
  VITE v5.x.x  ready in 300 ms
  ➜  Local:   http://localhost:3000/
```

Open http://localhost:3000 in your browser. You should see the dashboard!

---

## Private deployment (Vercel + Render)

This stack is suitable for a **demo or private MVP**: SQLite and generated CSVs live on the **Render** instance’s disk (ephemeral on free tier — acceptable for trials). For multi-instance or durable data, plan **Postgres (e.g. Supabase)** and object storage for files later.

**Important:** Do not enable real **OpenAI**, **Etsy**, or **Printify** keys until you are ready; the app runs in template/mock modes without them.

### Backend (Render)

1. Create a **Web Service** from this repo; root directory `backend`, build `npm install`, start `npm start`.
2. Set environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Render injects this automatically. |
| `CLIENT_ORIGIN` | **Recommended** | Your Vercel URL, e.g. `https://your-project.vercel.app`. Comma-separate multiple origins (e.g. preview + production). |
| `OPENAI_API_KEY` | No | Optional; mock AI if omitted. |
| `OPENAI_MODEL` | No | Optional model override. |

3. Health check path: `GET /api/health` (optional in Render dashboard).
4. **SQLite** file and **`generated-products/`** CSVs are **local to that service** — redeploys or multiple instances can lose or split data; document that for stakeholders.

### Frontend (Vercel)

1. Create a project; root directory `frontend`, framework **Vite**, build `npm run build`, output `dist`.
2. Set environment variables (Vercel → Settings → Environment Variables):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | **Yes (prod)** | Render API base including `/api`, e.g. `https://your-api.onrender.com/api`. Omit locally so `/api` + Vite proxy still work. |
| `VITE_APP_PASSWORD` | No | If set, users see a **shared password screen** once per browser (`localStorage`). Not full auth; password is embedded in the client bundle — fine for casual private demos only. |

3. Redeploy after changing `VITE_*` variables (they are applied at build time).

### Local verification after configuring env

- **API URL:** With no `VITE_API_BASE_URL`, `npm run dev` still uses `/api` via `vite.config.js`.
- **Password gate:** Set `VITE_APP_PASSWORD=test` in `frontend/.env.local`, restart `npm run dev`, confirm the gate appears; submit `test` and confirm `localStorage` unlock persists on refresh. Remove the variable to return to normal.

---

## API Routes Reference

| Method | Path                                   | What it does                        |
|--------|----------------------------------------|-------------------------------------|
| GET    | `/api/products`                        | Get all products                    |
| POST   | `/api/products`                        | Create a new product idea           |
| GET    | `/api/products/:id`                    | Get one product by ID               |
| POST   | `/api/products/:id/generate-ai`        | Run AI generation on a product      |
| POST   | `/api/products/:id/approve`            | Approve a product                   |
| POST   | `/api/products/:id/reject`             | Reject a product                    |
| POST   | `/api/products/:id/create-etsy-draft`  | Create (simulated) Etsy draft       |
| POST   | `/api/products/:id/generate-digital-product` | Generate a downloadable CSV (digital product) |
| DELETE | `/api/products/:id`                    | Delete a product                    |
| GET    | `/api/products/analytics/summary`      | Analytics summary for reporting     |
| POST   | `/api/products/:id/generate-concepts` | Generate 3–5 POD design concepts (saved on product) |
| POST   | `/api/products/:id/select-concept` | Select a concept (`body: { conceptId }`) |
| POST   | `/api/products/:id/reject-concept` | Mark a concept rejected (`body: { conceptId }`) |
| POST   | `/api/products/:id/generate-listing` | Build Etsy-style listing from concept (`body: { conceptId }` optional) |
| POST   | `/api/products/:id/generate-pod-prep` | Printify-oriented POD prep from **selected** concept (template; no live API) |
| POST   | `/api/products/:id/generate-design-package` | Design / mockup / social prompt package (requires listing + POD prep + selection) |

### Ideas (research intake)

| Method | Path | What it does |
|--------|------|--------------|
| GET    | `/api/ideas` | List ideas (optional filters: `sourcePlatform`, `decisionStatus`, `productType`) |
| POST   | `/api/ideas` | Create a new idea row |
| GET    | `/api/ideas/:id` | Fetch one idea |
| PUT    | `/api/ideas/:id` | Update editable fields (converted ideas are locked) |
| DELETE | `/api/ideas/:id` | Delete an idea |
| POST   | `/api/ideas/:id/score` | Run rule-based opportunity scoring (persists scores) |
| POST   | `/api/ideas/:id/convert-to-product` | Create a **product** from this idea |

### Trend Scanner

| Method | Path | What it does |
|--------|------|--------------|
| GET    | `/api/trends` | List trend scans (optional filters: `sourcePlatform`, `productType`) |
| POST   | `/api/trends` | Create a trend scan (`trendKeyword` required) |
| GET    | `/api/trends/:id` | Fetch one trend scan |
| PUT    | `/api/trends/:id` | Update editable fields (converted scans are locked) |
| DELETE | `/api/trends/:id` | Delete a trend scan |
| POST   | `/api/trends/:id/convert-to-idea` | Create a research **idea** from this trend scan |

---

## Adding Your API Keys (When Ready)

### OpenAI (real AI content instead of mock data)

1. Create an API key at [OpenAI Platform — API keys](https://platform.openai.com/api-keys).
2. In the **backend** folder, create a file named `.env` (if you do not already have one).
3. Add your secret key (never commit `.env` to git):
   ```bash
   # backend/.env
   OPENAI_API_KEY=sk-your-key-here
   ```
4. *(Optional)* Override the default chat model (defaults to `gpt-4o`):
   ```bash
   OPENAI_MODEL=gpt-4o-mini
   ```
5. From `backend/`, run `npm install` so the official `openai` package is installed, then start the server:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
6. With `OPENAI_API_KEY` set, **Generate AI Content** uses the OpenAI API and returns structured JSON matching the dashboard. If the key is missing, or the API call fails, the backend **falls back to mock data** so the UI keeps working; check the server logs for error details.

### Etsy (for real listing creation)

1. Register your app at https://www.etsy.com/developers/documentation
2. Get your API Key, Shared Secret, and Shop ID
3. Add them to your `.env` file:
   ```
   ETSY_API_KEY=your-key-here
   ETSY_SHARED_SECRET=your-secret-here
   ETSY_SHOP_ID=your-shop-id-here
   ```
4. In `services/etsyService.js`, follow the TODO comments to implement OAuth 2.0
5. Restart the backend

---

## Product Status Workflow

```
idea
  ↓ (click "Generate AI Content")
listing_generated
  ↓ (click "Approve")
approved
  ↓ (click "Create Etsy Draft")
etsy_draft_created

(at any point) → rejected
```

---

## Common Issues

**"Could not load products" error in the frontend:**
- Make sure the backend is running on port 3001
- Run `cd backend && npm run dev`

**`npm install` fails:**
- Make sure you're using Node.js v18 or newer: `node --version`
- Try deleting `node_modules` and running `npm install` again

**Port already in use:**
- Kill the process using the port, or change the port in `backend/.env` (PORT=3002) and `frontend/vite.config.js`

---

## Future Improvements (TODO)

- [x] Real OpenAI API integration (`services/aiService.js` — set `OPENAI_API_KEY` in `backend/.env`)
- [ ] Real Etsy OAuth 2.0 flow (see `services/etsyService.js`)
- [ ] Persist data to a real database (MongoDB or PostgreSQL)
- [ ] User authentication (login/signup)
- [ ] Image upload and mockup management
- [ ] Bulk AI generation for multiple products
- [ ] Analytics dashboard (total listings, revenue estimates, etc.)
- [ ] Export listings to CSV

---

## Tech Stack

| Layer    | Technology           |
|----------|---------------------|
| Frontend | React 18 + Vite 5   |
| Backend  | Node.js + Express   |
| Database | In-memory (for now) |
| Styling  | Pure CSS + variables|
| Fonts    | Syne + DM Sans      |
| AI       | OpenAI (official SDK; mock if no key or on API error)|
| Etsy     | Etsy API v3 (mock)  |

---

## Digital Product Generator

The Digital Product Generator creates real, downloadable CSV files for each product — **no AI API required**. Generation is entirely template-based and runs locally on the backend.

### How It Works

1. Open any product in the dashboard and click **"Generate Digital Product"** in the action bar.
2. The backend examines the product's title and category for keywords.
3. The best-matching CSV template is selected and rendered to a file.
4. The file is saved permanently to `backend/generated-products/`.
5. File metadata (filename, type, download URL, createdAt) is stored in SQLite inside `product.generatedFiles`.
6. The modal immediately shows a download link — click it to get the CSV.

You can click **"Re-Generate CSV"** as many times as you like. Each run appends a new file entry; previous downloads remain accessible.

### Template Selection (Keyword Matching)

| Template | Matched Keywords |
|---|---|
| Budget Planner | budget, finance, money, expense, spending, savings, financial |
| Study Planner | study, student, academic, school, college, university, exam, homework, course, lecture |
| Workout Tracker | workout, fitness, exercise, gym, training, muscle, cardio, strength, weight loss, health |
| Habit Tracker | habit, routine, daily, tracker, productivity, goal, accountability, mindfulness, wellness |
| Job Application Tracker | internship, job, application, career, resume, interview, hiring, recruitment, employment |
| Generic Planner | *(fallback — used when no keywords match)* |

### Where Files Are Stored

```
backend/
└── generated-products/
    ├── .gitkeep               ← keeps the folder in git
    ├── abc123-1700000-budget-planner.csv
    └── xyz789-1700001-workout-tracker.csv
```

Files are named `{productId}-{timestamp}-{title-slug}.csv` to guarantee uniqueness.  
Generated files **persist across server restarts** — they are real files on disk, not in-memory.

### How Downloads Work

Express serves the `generated-products/` folder as a static directory at `/downloads/*`:

```
GET /downloads/abc123-1700000-budget-planner.csv
```

The `Content-Disposition: attachment` header is set automatically so browsers prompt a file download instead of opening the CSV in the browser tab.

The Vite dev proxy forwards `/downloads/*` requests to `localhost:3001` just like `/api/*` requests — no additional proxy config needed as long as you add this to `vite.config.js`:

```js
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/downloads": "http://localhost:3001"   // ← add this line
    }
  }
});
```

### Verifying SQLite Metadata Persistence

After generating a digital product:

```bash
# In the backend folder
node -e "
const db = require('./data/db');
const products = db.getAllProducts();
products.forEach(p => {
  if (p.generatedFiles && p.generatedFiles.length > 0) {
    console.log(p.title, '->', p.generatedFiles);
  }
});
"
```

Restart the backend, then run the same command — the `generatedFiles` array should still be there.

### API Route Reference (Digital Products)

| Method | Path | What it does |
|---|---|---|
| POST | `/api/products/:id/generate-digital-product` | Generate CSV and save metadata |
| GET | `/downloads/:filename` | Download the generated CSV file |

---

## Updated Project Structure

```
ai-ecommerce-hq/
├── backend/
│   ├── generated-products/        ← Generated CSV files live here (persistent)
│   │   └── .gitkeep
│   ├── services/
│   │   ├── aiService.js           ← Unchanged
│   │   ├── etsyService.js         ← Unchanged
│   │   └── digitalProductService.js  ← NEW: template-based CSV generator
│   └── ...
└── frontend/
    └── src/
        ├── services/
        │   └── api.js             ← Added generateDigitalProduct()
        └── components/
            └── ProductDetailModal.jsx  ← Added button + download links
```
