// ============================================================
// services/aiService.js — AI Research & Listing Generator
// ============================================================
// This service handles all AI-powered content generation.
//
// HOW IT WORKS:
//   - If OPENAI_API_KEY is set in your .env file → calls real OpenAI API
//   - If no API key → returns realistic mock data so the app still works
//
// TODO (when ready for real AI):
//   1. Copy .env.example to .env
//   2. Add your OpenAI key: OPENAI_API_KEY=sk-...
//   3. The app will automatically switch to real AI
// ============================================================

// TODO: Uncomment this when you add your OpenAI key
// const OpenAI = require("openai");

/**
 * Generate all AI content for a product idea.
 * @param {string} title - The product title/idea
 * @param {string} description - Optional extra details about the product
 * @returns {object} - Full AI-generated research and listing data
 */
const generateProductContent = async (title, description) => {
  // Check if a real OpenAI API key exists
  if (process.env.OPENAI_API_KEY) {
    return await generateWithOpenAI(title, description);
  } else {
    console.log("ℹ️  No OpenAI key found — using mock data. See .env.example to add your key.");
    return generateMockData(title, description);
  }
};

// ============================================================
// REAL OpenAI Integration (activated when API key is present)
// ============================================================
const generateWithOpenAI = async (title, description) => {
  // TODO: Install openai package: npm install openai
  // TODO: Uncomment the OpenAI setup at the top of this file
  //
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  //
  // const prompt = `
  //   You are an expert Etsy seller and e-commerce researcher.
  //   Analyze this product idea and return a JSON object with these exact fields:
  //
  //   Product: "${title}"
  //   Details: "${description}"
  //
  //   Return ONLY valid JSON with these fields:
  //   {
  //     "buyerPersona": "detailed description of ideal buyer",
  //     "demandScore": number 1-10,
  //     "competitionScore": number 1-10 (10 = most competitive),
  //     "originalityScore": number 1-10,
  //     "copyrightRiskScore": number 1-10 (10 = highest risk),
  //     "suggestedPrice": number in USD,
  //     "etsyTitle": "SEO-optimized Etsy listing title under 140 chars",
  //     "etsyTags": ["tag1", "tag2", ... 13 tags total],
  //     "etsyDescription": "full Etsy listing description",
  //     "designPrompt": "detailed prompt for AI image generation",
  //     "canvaInstructions": "step-by-step Canva mockup instructions"
  //   }
  // `;
  //
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4o",
  //   messages: [{ role: "user", content: prompt }],
  //   response_format: { type: "json_object" }
  // });
  //
  // return JSON.parse(response.choices[0].message.content);

  // Fallback until fully implemented
  console.warn("⚠️  OpenAI key found but integration not yet wired up. Using mock data.");
  return generateMockData(title, description);
};

// ============================================================
// MOCK Data Generator (used when no OpenAI key is present)
// ============================================================
const generateMockData = (title, description) => {
  // These are realistic-looking results so you can test the full UI flow
  const cleanTitle = title.trim();

  return {
    // Who would buy this product?
    buyerPersona:
      `The ideal buyer for "${cleanTitle}" is a creative, gift-focused shopper aged 25–45 who ` +
      `values personalization and uniqueness. They often shop for meaningful gifts for milestones ` +
      `like birthdays, anniversaries, or housewarmings. They browse Etsy on mobile, save items ` +
      `to favorites, and are willing to pay a premium for handmade or custom items. They respond ` +
      `well to lifestyle photography and clear customization options.`,

    // Scores out of 10
    demandScore: Math.floor(Math.random() * 3) + 7,         // 7–9 (good demand)
    competitionScore: Math.floor(Math.random() * 4) + 4,    // 4–7 (moderate competition)
    originalityScore: Math.floor(Math.random() * 3) + 6,    // 6–8 (fairly original)
    copyrightRiskScore: Math.floor(Math.random() * 3) + 1,  // 1–3 (low risk)

    // Pricing suggestion in USD
    suggestedPrice: parseFloat((Math.random() * 30 + 15).toFixed(2)), // $15–$45

    // Etsy listing title (max 140 characters, SEO-focused)
    etsyTitle: `${cleanTitle} | Personalized Gift | Custom Design | Unique Handmade Art | Perfect for Any Occasion`,

    // Exactly 13 Etsy tags (Etsy's maximum)
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

    // Full Etsy listing description
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

    // Prompt for AI image generation tools (Midjourney, DALL-E, Stable Diffusion)
    designPrompt:
      `Create a high-quality product mockup for "${cleanTitle}". Style: clean, modern, ` +
      `lifestyle photography aesthetic. Background: soft neutral tones (warm white or light grey). ` +
      `Lighting: soft natural light from the left. Composition: product centered with slight ` +
      `shadow. Include subtle lifestyle props that suggest gifting (ribbon, flowers, or wooden ` +
      `surface). Resolution: 4K, sharp details. Color palette: warm, inviting, premium feel. ` +
      `No text overlays. Photorealistic style.`,

    // Step-by-step Canva instructions
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
