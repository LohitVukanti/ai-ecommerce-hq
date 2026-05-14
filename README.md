# 🏪 AI E-Commerce HQ

A full-stack dashboard for turning product ideas into AI-researched, Etsy-ready listings.

---

## What This App Does

1. **Add** a product idea (e.g. "Personalized Star Map Print")
2. **Click "Generate AI Content"** → get buyer persona, market scores, Etsy title/tags/description, and design prompts
3. **Review** the AI-generated content
4. **Approve** the listing when it looks good
5. **Create an Etsy Draft** (simulated for now — easy to connect to real Etsy later)

---

## Project Structure

```
ai-ecommerce-hq/
├── backend/                   ← Node.js + Express API
│   ├── server.js              ← Entry point — starts the server
│   ├── .env.example           ← Copy this to .env for API keys
│   ├── package.json
│   ├── routes/
│   │   └── products.js        ← All /api/products endpoints
│   ├── services/
│   │   ├── aiService.js       ← AI content generation (mock or OpenAI)
│   │   └── etsyService.js     ← Etsy integration (mock or real)
│   └── data/
│       └── db.js              ← In-memory "database" (resets on restart)
│
└── frontend/                  ← React + Vite app
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx            ← Entry point
        ├── App.jsx             ← Root component
        ├── index.css           ← Global styles
        ├── services/
        │   └── api.js          ← All API calls to the backend
        ├── pages/
        │   └── Dashboard.jsx   ← Main dashboard page
        └── components/
            ├── AddProductModal.jsx      ← Form to add a new product
            ├── ProductCard.jsx          ← Card shown in the dashboard grid
            ├── ProductDetailModal.jsx   ← Full detail view with all AI data
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
