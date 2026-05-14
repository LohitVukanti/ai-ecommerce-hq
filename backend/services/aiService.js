// ============================================================
// services/aiService.js — AI Research & Listing Generator
// ============================================================
// - If OPENAI_API_KEY is set in backend/.env → calls OpenAI (JSON mode)
// - If the key is missing OR the API call fails → mock data (app keeps working)
// ============================================================

const OpenAI = require("openai");

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

/** @returns {OpenAI|null} */
const getClient = () => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !String(key).trim()) return null;
  return new OpenAI({ apiKey: key.trim() });
};

/**
 * Generate all AI content for a product idea.
 * @param {string} title
 * @param {string} description
 * @returns {Promise<object>}
 */
const generateProductContent = async (title, description) => {
  if (getClient()) {
    return await generateWithOpenAI(title, description);
  }
  console.log("ℹ️  No OpenAI key found — using mock data. See README for OPENAI_API_KEY.");
  return generateMockData(title, description);
};

// ============================================================
// OpenAI — structured JSON (must match frontend expectations)
// ============================================================

const SYSTEM_PROMPT = `You are an expert Etsy seller and e-commerce researcher.
You MUST respond with a single valid JSON object only (no markdown fences, no commentary).
All string fields must be non-empty strings suitable for a real listing.
Scores must be integers from 1 through 10 inclusive.
etsyTags must be an array of exactly 13 strings (Etsy allows up to 13 tags). Each tag: lowercase, 1-20 characters, letters/numbers/spaces only where natural — prefer short keyword-style tags.
suggestedPrice must be a positive number in USD (can use decimals).`;

const buildUserPrompt = (title, description) => {
  const t = String(title || "").trim();
  const d = String(description || "").trim();
  return `Analyze this product idea and return ONE JSON object with EXACTLY these keys:

{
  "buyerPersona": string,
  "demandScore": number (1-10),
  "competitionScore": number (1-10, 10 = most competitive),
  "originalityScore": number (1-10),
  "copyrightRiskScore": number (1-10, 10 = highest risk),
  "suggestedPrice": number (USD),
  "etsyTitle": string (SEO Etsy title, max 140 characters),
  "etsyTags": string[] (exactly 13 tags),
  "etsyDescription": string (full Etsy listing body, can use line breaks),
  "designPrompt": string (detailed prompt for AI image generation),
  "canvaInstructions": string (step-by-step Canva mockup instructions)
}

Product title: ${JSON.stringify(t)}
Additional details: ${JSON.stringify(d || "None provided.")}`;
};

/**
 * Strip optional ```json fences from model output.
 * @param {string} raw
 */
const extractJsonText = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  let s = raw.trim();
  const m = s.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (m) s = m[1].trim();
  return s;
};

const clampScore = (value) => {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return 5;
  return Math.min(10, Math.max(1, n));
};

const ETSY_TAG_MAX_LEN = 20;

/**
 * Ensure exactly 13 non-empty tags, each truncated for Etsy limits.
 * @param {unknown} tags
 * @param {string} titleSeed
 */
const normalizeEtsyTags = (tags, titleSeed) => {
  const padPool = [
    "personalized gift",
    "custom design",
    "unique gift",
    "handmade",
    "gift idea",
    "made to order",
    "small business",
    "etsy finds",
    "home decor",
    "special occasion",
    "creative gift",
    "custom order",
    "artisan"
  ];

  const seedWords = String(titleSeed || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 12);

  const sanitize = (t) =>
    String(t || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .slice(0, ETSY_TAG_MAX_LEN);

  const out = [];
  const seen = new Set();

  if (Array.isArray(tags)) {
    for (const t of tags) {
      const c = sanitize(t);
      if (c && !seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
      if (out.length >= 13) return out.slice(0, 13);
    }
  }

  const fillers = [...seedWords, ...padPool];
  let fi = 0;
  while (out.length < 13) {
    const base = fillers[fi % fillers.length] || `gift ${out.length + 1}`;
    fi += 1;
    let c = sanitize(base);
    if (!c) c = `tag${out.length + 1}`.slice(0, ETSY_TAG_MAX_LEN);
    let bump = 0;
    while (seen.has(c) && bump < 50) {
      bump += 1;
      c = sanitize(`${base} ${bump}`);
      if (!c || c.length < 2) c = `item${out.length}${bump}`.slice(0, ETSY_TAG_MAX_LEN);
    }
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    } else {
      let uniq = `g${out.length}${fi}${String(Date.now()).slice(-6)}`.slice(0, ETSY_TAG_MAX_LEN);
      let guard = 0;
      while (seen.has(uniq) && guard < 20) {
        guard += 1;
        uniq = `tag${out.length}${guard}${fi}`.slice(0, ETSY_TAG_MAX_LEN);
      }
      seen.add(uniq);
      out.push(uniq);
    }
  }

  return out.slice(0, 13);
};

/**
 * Coerce API JSON into the exact shape the frontend expects.
 * @param {object} raw
 * @param {string} title
 * @param {string} description
 */
const validateAndNormalizeAIResult = (raw, title, description) => {
  const cleanTitle = String(title || "").trim();

  const buyerPersona =
    typeof raw.buyerPersona === "string" && raw.buyerPersona.trim()
      ? raw.buyerPersona.trim()
      : `The ideal buyer for "${cleanTitle}" values quality and personalization.`;

  const demandScore = clampScore(raw.demandScore);
  const competitionScore = clampScore(raw.competitionScore);
  const originalityScore = clampScore(raw.originalityScore);
  const copyrightRiskScore = clampScore(raw.copyrightRiskScore);

  let suggestedPrice = Number(raw.suggestedPrice);
  if (Number.isNaN(suggestedPrice) || suggestedPrice <= 0) {
    suggestedPrice = parseFloat((Math.random() * 30 + 15).toFixed(2));
  } else {
    suggestedPrice = Math.round(suggestedPrice * 100) / 100;
  }

  let etsyTitle =
    typeof raw.etsyTitle === "string" && raw.etsyTitle.trim()
      ? raw.etsyTitle.trim()
      : `${cleanTitle} | Personalized Gift | Handmade`;
  if (etsyTitle.length > 140) etsyTitle = etsyTitle.slice(0, 137) + "...";

  const etsyTags = normalizeEtsyTags(raw.etsyTags, cleanTitle);

  const etsyDescription =
    typeof raw.etsyDescription === "string" && raw.etsyDescription.trim()
      ? raw.etsyDescription.trim()
      : `Discover ${cleanTitle} — a thoughtful, unique find on Etsy.\n\n${String(description || "").trim()}`;

  const designPrompt =
    typeof raw.designPrompt === "string" && raw.designPrompt.trim()
      ? raw.designPrompt.trim()
      : `High-quality product mockup for "${cleanTitle}", soft natural light, neutral background, 4K, photorealistic.`;

  const canvaInstructions =
    typeof raw.canvaInstructions === "string" && raw.canvaInstructions.trim()
      ? raw.canvaInstructions.trim()
      : `CANVA: Create a 2000×2000 px design for "${cleanTitle}", center product, subtle shadow, export PNG.`;

  return {
    buyerPersona,
    demandScore,
    competitionScore,
    originalityScore,
    copyrightRiskScore,
    suggestedPrice,
    etsyTitle,
    etsyTags,
    etsyDescription,
    designPrompt,
    canvaInstructions
  };
};

const generateWithOpenAI = async (title, description) => {
  const client = getClient();
  if (!client) {
    return generateMockData(title, description);
  }

  try {
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(title, description) }
      ]
    });

    const content = response.choices?.[0]?.message?.content;
    const jsonText = extractJsonText(content || "");
    if (!jsonText) {
      throw new Error("OpenAI returned empty content");
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      throw new Error(`OpenAI JSON parse failed: ${e.message}`);
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("OpenAI returned non-object JSON");
    }

    const normalized = validateAndNormalizeAIResult(parsed, title, description);

    if (normalized.etsyTags.length !== 13) {
      throw new Error(`Expected 13 Etsy tags after normalization, got ${normalized.etsyTags.length}`);
    }

    ["demandScore", "competitionScore", "originalityScore", "copyrightRiskScore"].forEach((k) => {
      const v = normalized[k];
      if (typeof v !== "number" || v < 1 || v > 10) {
        throw new Error(`Invalid score ${k}: ${v}`);
      }
    });

    console.log(`✅ OpenAI generation OK (model ${OPENAI_MODEL}) for: "${String(title).slice(0, 60)}..."`);
    return normalized;
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("❌ OpenAI generation failed — falling back to mock data:", msg);
    if (err?.status) console.error("   HTTP status:", err.status);
    return generateMockData(title, description);
  }
};

// ============================================================
// MOCK Data Generator (no API key or OpenAI failure fallback)
// ============================================================
const generateMockData = (title, description) => {
  const cleanTitle = title.trim();

  return {
    buyerPersona:
      `The ideal buyer for "${cleanTitle}" is a creative, gift-focused shopper aged 25–45 who ` +
      `values personalization and uniqueness. They often shop for meaningful gifts for milestones ` +
      `like birthdays, anniversaries, or housewarmings. They browse Etsy on mobile, save items ` +
      `to favorites, and are willing to pay a premium for handmade or custom items. They respond ` +
      `well to lifestyle photography and clear customization options.`,

    demandScore: Math.floor(Math.random() * 3) + 7,
    competitionScore: Math.floor(Math.random() * 4) + 4,
    originalityScore: Math.floor(Math.random() * 3) + 6,
    copyrightRiskScore: Math.floor(Math.random() * 3) + 1,

    suggestedPrice: parseFloat((Math.random() * 30 + 15).toFixed(2)),

    etsyTitle: `${cleanTitle} | Personalized Gift | Custom Design | Unique Handmade Art | Perfect for Any Occasion`,

    etsyTags: [
      "personalized gift",
      "custom design",
      "unique gift idea",
      "handmade art print",
      "home decor",
      "wall art",
      "gift for her",
      "gift for him",
      "anniversary gift",
      "birthday present",
      "custom print",
      "digital download",
      "etsy bestseller"
    ],

    etsyDescription:
      `✨ ${cleanTitle} — The Perfect Personalized Gift!\n\n` +
      `Looking for something truly unique? Our ${cleanTitle} is thoughtfully crafted to delight ` +
      `anyone on your list. Whether it's a birthday, anniversary, holiday, or just because — ` +
      `this piece brings joy every time.\n\n` +
      `🎁 WHY YOU'LL LOVE IT:\n` +
      `• 100% customizable to your preferences\n` +
      `• High-quality design crafted with care\n` +
      `• Makes a memorable, one-of-a-kind gift\n` +
      `• Ships quickly — order with confidence!\n\n` +
      `📦 WHAT'S INCLUDED:\n` +
      `• Your custom design delivered digitally or physically\n` +
      `• Print-ready file at full resolution\n` +
      `• Friendly customer support throughout\n\n` +
      `💬 HOW TO ORDER:\n` +
      `1. Add to cart\n` +
      `2. Leave your customization details in the notes\n` +
      `3. We'll create your design and send a preview\n` +
      `4. Approve and we ship or deliver!\n\n` +
      `Questions? Message us anytime — we love helping customers find the perfect gift. ❤️`,

    designPrompt:
      `Create a high-quality product mockup for "${cleanTitle}". Style: clean, modern, ` +
      `lifestyle photography aesthetic. Background: soft neutral tones (warm white or light grey). ` +
      `Lighting: soft natural light from the left. Composition: product centered with slight ` +
      `shadow. Include subtle lifestyle props that suggest gifting (ribbon, flowers, or wooden ` +
      `surface). Resolution: 4K, sharp details. Color palette: warm, inviting, premium feel. ` +
      `No text overlays. Photorealistic style.`,

    canvaInstructions:
      `CANVA MOCKUP INSTRUCTIONS FOR: ${cleanTitle}\n\n` +
      `1. Open Canva.com and click "Create a design"\n` +
      `2. Choose "Custom size" → set 2000 x 2000 px (square for Etsy)\n` +
      `3. Set background color to #F5F0EB (warm off-white)\n` +
      `4. Add your product image: Upload → drag to center\n` +
      `5. Resize product to fill ~70% of canvas\n` +
      `6. Add subtle drop shadow: Effects → Shadow → set opacity to 20%\n` +
      `7. Add a text overlay with your shop name (top-left corner, small, grey)\n` +
      `8. Optional: Add a thin border frame for a polished look\n` +
      `9. Download as PNG (for Etsy listings) or PDF (for print)\n` +
      `10. Create 5 variations: plain white bg, lifestyle bg, zoom detail, size chart, back view`
  };
};

module.exports = { generateProductContent };
