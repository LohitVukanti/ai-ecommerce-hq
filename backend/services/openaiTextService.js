// ============================================================
// services/openaiTextService.js — Central OpenAI JSON helper
// ============================================================
// Backend-only. Reads OPENAI_API_KEY / OPENAI_MODEL from env.
// Never throws — always returns:
//   { ok: true,  data, model }
//   { ok: false, reason: "NO_KEY" | "FAILED", error? }
//
// Callers are expected to merge `data` into a fully populated
// template result so the persisted shape is never broken.
// ============================================================

const OpenAI = require("openai");

const DEFAULT_MODEL = "gpt-4o-mini";

let cachedClient = null;
let cachedKey = null;

/** Returns an OpenAI client if a key is configured; null otherwise. */
function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !String(key).trim()) {
    cachedClient = null;
    cachedKey = null;
    return null;
  }
  if (!cachedClient || cachedKey !== key) {
    cachedClient = new OpenAI({ apiKey: String(key).trim() });
    cachedKey = key;
  }
  return cachedClient;
}

/** True iff a backend OpenAI key is configured. */
function isOpenAIEnabled() {
  return getClient() !== null;
}

/** Strip optional ```json fences from a model response. */
function extractJsonText(raw) {
  if (!raw || typeof raw !== "string") return "";
  let s = raw.trim();
  const m = s.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (m) s = m[1].trim();
  return s;
}

// Throttle the "no key" log to once per (process, traceLabel) so the console
// stays readable when many requests arrive without a key.
const noKeyLogged = new Set();

/**
 * Call OpenAI for a JSON-mode response. Always non-throwing.
 *
 * @param {object}  args
 * @param {string}  args.system        System prompt.
 * @param {string}  args.user          User prompt.
 * @param {string}  args.traceLabel    Short label used in logs (e.g. "POD concepts").
 * @param {string} [args.model]        Override model. Defaults to OPENAI_MODEL or gpt-4o-mini.
 * @param {number} [args.temperature]  Defaults to 0.6.
 * @param {number} [args.maxTokens]    Optional cap.
 * @returns {Promise<{ok:true,data:object,model:string}|{ok:false,reason:string,error?:string}>}
 */
async function generateJsonWithOpenAI({
  system,
  user,
  traceLabel,
  model,
  temperature = 0.6,
  maxTokens
}) {
  const client = getClient();
  const label = traceLabel || "openai";

  if (!client) {
    if (!noKeyLogged.has(label)) {
      noKeyLogged.add(label);
      console.log(`ℹ️  OPENAI_API_KEY missing, using template generator (${label}).`);
    }
    return { ok: false, reason: "NO_KEY" };
  }

  const useModel = model || process.env.OPENAI_MODEL || DEFAULT_MODEL;

  try {
    console.log(`🤖 Using OpenAI for ${label} (model ${useModel})`);
    const response = await client.chat.completions.create({
      model: useModel,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: String(system || "") },
        { role: "user", content: String(user || "") }
      ]
    });

    const content = response.choices?.[0]?.message?.content;
    const jsonText = extractJsonText(content || "");
    if (!jsonText) throw new Error("OpenAI returned empty content");

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      throw new Error(`JSON parse failed: ${e.message}`);
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("OpenAI response was not a JSON object");
    }

    return { ok: true, data: parsed, model: useModel };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error(`❌ OpenAI failed, using template fallback (${label}): ${msg}`);
    if (err?.status) console.error(`   HTTP status: ${err.status}`);
    return { ok: false, reason: "FAILED", error: msg };
  }
}

module.exports = {
  generateJsonWithOpenAI,
  isOpenAIEnabled,
  extractJsonText
};
