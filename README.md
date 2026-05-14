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

### OpenAI (for real AI content instead of mock data)

1. Get a key at https://platform.openai.com/api-keys
2. Copy `.env.example` to `.env` in the backend folder:
   ```bash
   cd backend
   cp .env.example .env
   ```
3. Open `.env` and uncomment the OpenAI line:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```
4. In `services/aiService.js`, follow the TODO comments to wire up the real OpenAI call
5. Restart the backend — it will automatically use real AI

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

- [ ] Real OpenAI API integration (see `services/aiService.js`)
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
| AI       | OpenAI GPT-4o (mock)|
| Etsy     | Etsy API v3 (mock)  |
