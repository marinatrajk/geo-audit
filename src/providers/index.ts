import type { Provider } from "../types.js";
import { openai } from "./openai.js";
import { anthropic } from "./anthropic.js";
import { perplexity } from "./perplexity.js";
import { gemini } from "./gemini.js";

export const allProviders: Provider[] = [
  openai,
  anthropic,
  perplexity,
  gemini,
];

/**
 * Resolve which providers to actually run.
 * Skips any whose key is missing so the tool runs with just one configured.
 * If `only` is given, restricts to that named subset.
 */
export function resolveProviders(only?: string[]): Provider[] {
  let providers = allProviders.filter((p) => p.available());
  if (only && only.length > 0) {
    const set = new Set(only.map((s) => s.toLowerCase()));
    providers = providers.filter((p) => set.has(p.name));
  }
  return providers;
}

export { openai, anthropic, perplexity, gemini };
