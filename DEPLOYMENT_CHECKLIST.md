# Production deployment & testing checklists

Use this document when deploying AI E-Commerce HQ to **Render (backend)** and **Vercel (frontend)** for a stable private MVP launch.

---

## Production readiness audit summary

### Already in good shape
- Full product workflow (Trends → Ideas → Products → POD → Listing → Prep → Design → Printify preview → Artwork → Etsy)
- SQLite persistence with idempotent migrations
- Mock/preview fallbacks for all external integrations
- Optional OpenAI text augmentation with template fallback
- Private frontend password gate (`VITE_APP_PASSWORD`)
- Integration status page (no secrets exposed)
- Artwork upload with MIME/size validation

### Gaps addressed in this pass
- Hardened API client: timeouts, safe JSON parsing, GET retry, normalized errors
- React `ErrorBoundary` to prevent white-screen crashes
- Shared `ErrorBanner` with retry on all list pages
- Etsy OAuth callback routes to Integrations page automatically
- Product delete without full page reload
- Debounced filter fetches (Ideas / Trends) with race guards
- Vite dev proxy for `/artwork`
- Backend: deep health check, global 404/error handlers, graceful shutdown
- Backend: optional `API_SECRET` gate, rate limiting, production CORS fail-closed
- JSON body size limit (2 MB)

### Still recommended before a public multi-user launch
| Item | Priority | Notes |
|------|----------|-------|
| Persistent Postgres (Supabase/Neon) | High | Render ephemeral disk loses SQLite + uploads on redeploy |
| Object storage (S3/R2) for artwork/CSV | High | Same reason |
| Etsy OAuth state in DB (not memory) | Medium | OAuth breaks after backend restart until re-auth |
| Encrypt `etsy_tokens.json` at rest | Medium | Tokens are plaintext on disk today |
| Full backend auth (not just optional API_SECRET) | High if API URL is public | Combine with frontend password gate |
| Automated tests (Vitest + smoke e2e) | Medium | Manual checklist below covers MVP |
| Monitoring / alerting (Render health, Sentry) | Medium | Use `/api/health` checks |

---

## Pre-deploy checklist (local)

### Repository
- [ ] All changes committed; no `.env` files in git
- [ ] `backend/.env.example` and `frontend/.env.example` reviewed
- [ ] `npm run build` passes in `frontend/`
- [ ] Backend starts: `cd backend && npm start`
- [ ] Health check OK: `curl http://localhost:3001/api/health` → `"status":"ok"`, `"checks":{"database":"ok","writableDirs":"ok"}`

### Local smoke (no API keys)
- [ ] Dashboard loads products
- [ ] Create product → Generate concepts → full workflow to artwork upload
- [ ] Integrations page shows 4 providers in mock/preview mode
- [ ] Ideas + Trend Scanner CRUD works
- [ ] Disconnect backend → error banner appears with **Try again** → reconnect → retry succeeds

---

## Render deployment checklist (backend)

### Service setup
- [ ] New **Web Service** connected to GitHub repo
- [ ] **Root directory:** `backend`
- [ ] **Build command:** `npm install`
- [ ] **Start command:** `npm start`
- [ ] **Health check path:** `/api/health` (Render dashboard → Settings → Health Check)

### Required environment variables
| Variable | Example | Required |
|----------|---------|----------|
| `NODE_ENV` | `production` | Recommended |
| `PORT` | *(Render sets automatically)* | Auto |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` | **Yes** |
| `API_SECRET` | long random string | Recommended |
| `OPENAI_API_KEY` | `sk-...` | Optional |
| `OPENAI_MODEL` | `gpt-4o-mini` | Optional |
| `ENABLE_REAL_IMAGE_GENERATION` | `false` | Optional |
| `ENABLE_REAL_PRINTIFY` | `false` | Optional |
| `ENABLE_REAL_ETSY` | `false` | Optional |
| Integration keys | See `backend/.env.example` | As needed |

### Render post-deploy verification
- [ ] `curl https://YOUR-API.onrender.com/api/health` returns 200 with database + writableDirs ok
- [ ] `curl https://YOUR-API.onrender.com/api/integrations/status` returns provider list (no secret values)
- [ ] CORS: request from Vercel origin succeeds (browser Network tab, no CORS errors)
- [ ] If `API_SECRET` set: unauthenticated `curl /api/products` returns 401; with `-H "X-Api-Key: ..."` returns 200

### Render operational notes
- [ ] Understand **ephemeral disk**: SQLite DB and uploaded artwork/CSV reset on redeploy unless you add a persistent disk volume
- [ ] Free tier spins down after inactivity — first request may take 30–60s (cold start)
- [ ] Set Render **auto-deploy** from main branch if desired

---

## Vercel deployment checklist (frontend)

### Project setup
- [ ] Import GitHub repo; **Root directory:** `frontend`
- [ ] **Framework preset:** Vite
- [ ] **Build command:** `npm run build`
- [ ] **Output directory:** `dist`

### Required environment variables
| Variable | Example | Required |
|----------|---------|----------|
| `VITE_API_BASE_URL` | `https://YOUR-API.onrender.com/api` | **Yes** |
| `VITE_APP_PASSWORD` | your private gate password | Recommended |
| `VITE_API_SECRET` | same as Render `API_SECRET` | If backend uses API_SECRET |

### Vercel post-deploy verification
- [ ] App loads; password gate works if configured
- [ ] Dashboard fetches products from Render (not localhost)
- [ ] Artwork thumbnails load (cross-origin `/artwork/` URLs)
- [ ] CSV download links work (`/downloads/` via `resolveDownloadUrl`)
- [ ] Integrations page loads status from production API

---

## Integration go-live checklist (optional)

Enable one integration at a time. After each, verify on Integrations page mode = **live** and run the matching product action.

### OpenAI text
- [ ] Set `OPENAI_API_KEY` + `OPENAI_MODEL` on Render
- [ ] Generate POD concepts → console log shows OpenAI usage
- [ ] Disable key → template fallback still works

### Image generation
- [ ] Set `OPENAI_API_KEY`, `ENABLE_REAL_IMAGE_GENERATION=true`, optional `OPENAI_IMAGE_MODEL`
- [ ] Prepare artwork → Generate artwork image → PNG saved to artwork assets
- [ ] With flag off → mock SVG placeholder still appears

### Printify
- [ ] Set `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`, `ENABLE_REAL_PRINTIFY=true`
- [ ] Full workflow through Printify preview + approved primary artwork
- [ ] Create Printify product → draft created (never published)

### Etsy
- [ ] Set `ETSY_CLIENT_ID`, `ETSY_CLIENT_SECRET`, `ETSY_REDIRECT_URI` (must match Etsy app callback exactly)
- [ ] Set `ENABLE_REAL_ETSY=true`
- [ ] Visit Integrations → Connect Etsy → OAuth completes → lands on Integrations with success banner
- [ ] Create Etsy Draft (Live or Mock) → draft listing (never auto-published)
- [ ] Re-auth after backend redeploy if OAuth state was lost (known MVP limitation)

---

## Production testing checklist

Run after every deploy or significant change.

### Health & connectivity
- [ ] `GET /api/health` → 200, `checks.database=ok`, `checks.writableDirs=ok`
- [ ] `GET /api/integrations/status` → 200, no secret values in JSON
- [ ] Frontend loads without console errors
- [ ] Simulate API down → error banner + retry works

### Core workflows (preserve regression)
- [ ] **Trend Scanner:** create scan → convert to idea
- [ ] **Ideas:** create → score → convert to product
- [ ] **Product:** generate AI → approve → Etsy draft (simulated)
- [ ] **POD studio:** concepts → select → listing → POD prep → design package → Printify preview
- [ ] **Artwork:** prepare → upload → approve → set primary
- [ ] **Digital product:** generate CSV → download link works
- [ ] **Delete product:** removes from dashboard without page reload; artwork files cleaned up

### Error & edge cases
- [ ] Generate artwork image **without** prepare-artwork → clear 400 error
- [ ] Create Printify product **without** preview → clear 400 error
- [ ] Upload unsupported file type → clear error message
- [ ] Upload > 20 MB → 413 error
- [ ] Rapid filter changes on Ideas page → no stale data flash (debounce)
- [ ] UI ErrorBoundary: (optional) force render error in dev → recovery screen appears

### Security smoke
- [ ] No `OPENAI_API_KEY`, `PRINTIFY_API_TOKEN`, or Etsy secrets in frontend bundle or network responses
- [ ] `CLIENT_ORIGIN` blocks unknown browser origins in production
- [ ] `API_SECRET` blocks unauthenticated API access when enabled
- [ ] `.env` files not committed to git

### Performance / limits
- [ ] Cold start acceptable on Render free tier
- [ ] Long AI generation completes within 90s timeout or shows timeout error with retry hint
- [ ] Rate limit: burst of requests returns 429 with friendly message (if testing abuse path)

---

## Rollback plan

1. Revert Git commit on Render/Vercel or redeploy previous deployment from dashboard
2. If DB corrupted: restore from backup or accept data loss on ephemeral disk
3. Disable live integrations: set all `ENABLE_REAL_*=false` and redeploy backend

---

## Quick reference URLs

| Environment | Frontend | Backend health |
|-------------|----------|----------------|
| Local | `http://localhost:5173` | `http://localhost:3001/api/health` |
| Production | `https://YOUR-APP.vercel.app` | `https://YOUR-API.onrender.com/api/health` |
