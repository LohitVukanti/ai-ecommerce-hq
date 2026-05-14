// ============================================================
// services/etsyService.js — Etsy Integration Service
// ============================================================
// This service handles creating listings on Etsy.
//
// CURRENT STATE: Mock/simulation only
//   - Returns a fake "draft created" response
//   - No real API calls are made
//
// TODO (when ready for real Etsy):
//   1. Register your app at https://www.etsy.com/developers
//   2. Get your API Key and Shared Secret
//   3. Implement OAuth 2.0 flow (see TODO comments below)
//   4. Add keys to your .env file
//   5. Replace the mock functions with real API calls
//
// Etsy API Docs: https://developers.etsy.com/documentation/
// ============================================================

/**
 * Simulate creating a draft listing on Etsy.
 * In a real implementation, this would call the Etsy API.
 *
 * @param {object} product - The product object from our database
 * @param {object} aiData - The AI-generated listing data
 * @returns {object} - Simulated Etsy draft response
 */
const createEtsyDraftListing = async (product, aiData) => {
  // Check if real Etsy credentials exist
  if (process.env.ETSY_API_KEY && process.env.ETSY_SHOP_ID) {
    return await createRealEtsyDraft(product, aiData);
  } else {
    console.log("ℹ️  No Etsy credentials found — simulating draft creation.");
    return simulateEtsyDraft(product, aiData);
  }
};

// ============================================================
// REAL Etsy API Integration (activated when credentials exist)
// ============================================================
const createRealEtsyDraft = async (product, aiData) => {
  // TODO: Implement real Etsy OAuth 2.0 flow
  // Step 1: Direct user to Etsy OAuth URL to grant permissions
  // Step 2: Exchange auth code for access token
  // Step 3: Use access token for API calls
  //
  // Example API call structure (using fetch or axios):
  //
  // const response = await fetch(
  //   `https://openapi.etsy.com/v3/application/shops/${process.env.ETSY_SHOP_ID}/listings`,
  //   {
  //     method: "POST",
  //     headers: {
  //       "x-api-key": process.env.ETSY_API_KEY,
  //       "Authorization": `Bearer ${accessToken}`, // From OAuth flow
  //       "Content-Type": "application/json"
  //     },
  //     body: JSON.stringify({
  //       title: aiData.etsyTitle,
  //       description: aiData.etsyDescription,
  //       price: { amount: Math.round(aiData.suggestedPrice * 100), divisor: 100, currency_code: "USD" },
  //       quantity: 999,
  //       who_made: "i_did",
  //       when_made: "made_to_order",
  //       taxonomy_id: 1,  // TODO: Map to correct Etsy taxonomy
  //       tags: aiData.etsyTags,
  //       state: "draft"  // Creates as draft, not live
  //     })
  //   }
  // );
  //
  // const data = await response.json();
  // return { listingId: data.listing_id, url: `https://www.etsy.com/listing/${data.listing_id}` };

  console.warn("⚠️  Etsy credentials found but OAuth flow not yet implemented. Using mock.");
  return simulateEtsyDraft(product, aiData);
};

// ============================================================
// MOCK Etsy Draft Simulator
// ============================================================
const simulateEtsyDraft = (product, aiData) => {
  // Generate a fake Etsy listing ID (real ones are 12-digit numbers)
  const fakeListingId = Math.floor(Math.random() * 9000000000) + 1000000000;
  const fakeShopId = 12345678;

  // Simulate a small delay to feel realistic (like a real API call)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        // Simulated response mimicking real Etsy API response shape
        listing_id: fakeListingId,
        shop_id: fakeShopId,
        state: "draft",
        title: aiData.etsyTitle,
        description: aiData.etsyDescription,
        price: {
          amount: Math.round(aiData.suggestedPrice * 100),
          divisor: 100,
          currency_code: "USD"
        },
        tags: aiData.etsyTags,
        quantity: 999,

        // Simulated URLs (these won't actually work — they're fake)
        url: `https://www.etsy.com/listing/${fakeListingId}`,
        editUrl: `https://www.etsy.com/your/shops/me/tools/listings/edit/${fakeListingId}`,

        // Metadata
        createdTimestamp: Math.floor(Date.now() / 1000),
        isMock: true, // So we know this is simulated
        mockNote: "This is a simulated Etsy draft. Add real Etsy credentials to create actual listings."
      });
    }, 800); // 800ms fake delay
  });
};

module.exports = { createEtsyDraftListing };
