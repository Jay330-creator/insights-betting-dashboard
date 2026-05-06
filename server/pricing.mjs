// dashboard/server/pricing.mjs
//
// Pricing source (GPT-5.2): https://platform.openai.com/docs/models/gpt-5.2
// Date verified: 2026-05-01
//
// NOTE: Prices can change.
// When updating pricing, bump PRICING_VERSION to a new date string.
// Do NOT overwrite historical rates tied to an older PRICING_VERSION if you want past pick_costs
// to remain accurate (store the PRICING_VERSION alongside each cost row).

export const PRICING_VERSION = 'openai_2026-05-01';

export const PRICING = {
  // USD per 1,000,000 tokens (input/output/cached_input)
  'openai/gpt-5.2': {
    input_per_million: 1.75,
    cached_input_per_million: 0.175,
    output_per_million: 14.0,
  },

  // Sometimes you may see raw model ids:
  'gpt-5.2': {
    input_per_million: 1.75,
    cached_input_per_million: 0.175,
    output_per_million: 14.0,
  },
};

export function calculateCost(model, promptTokens, completionTokens, cachedTokens = 0) {
  const key = String(model || '').trim();
  const rate = PRICING[key];

  // Fallback behavior: warn + return 0 so cost logging doesn't break the pipeline.
  if (!rate) {
    console.warn(`[pricing] Unknown model "${key}" (pricing_version=${PRICING_VERSION}); returning $0.00`);
    return 0;
  }

  const prompt = Number(promptTokens || 0);
  const completion = Number(completionTokens || 0);
  const cached = Math.max(0, Math.min(Number(cachedTokens || 0), prompt)); // clamp: 0..prompt

  const uncached = prompt - cached;

  const uncachedInputCost = (uncached / 1_000_000) * rate.input_per_million;
  const cachedInputCost = (cached / 1_000_000) * rate.cached_input_per_million;
  const outputCost = (completion / 1_000_000) * rate.output_per_million;

  return uncachedInputCost + cachedInputCost + outputCost;
}
