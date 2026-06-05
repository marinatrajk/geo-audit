import type { Config } from "../types.js";

/**
 * Turn one category into a spread of realistic buyer-style queries.
 *
 * The spread is the whole point: a brand can rank #1 on one phrasing and
 * vanish on another. We mix best-of, alternatives, use-case, and direct
 * comparison framings so the score reflects real query diversity rather
 * than a single lucky prompt.
 */
export function resolvePrompts(config: Config): string[] {
  // Explicit prompts win: these are the real phrases people type, used
  // verbatim and in full. No synthesis, no truncation, because real queries
  // beat tidy category strings and you meant every one you passed.
  if (config.explicitPrompts.length > 0) {
    return config.explicitPrompts.slice(0, 50);
  }
  return generatePrompts(config);
}

export function generatePrompts(config: Config): string[] {
  const { category, brand, competitors } = config;
  const year = new Date().getFullYear();

  const pool: string[] = [
    `What are the best ${category} in ${year}?`,
    `What are the top ${category} I should consider?`,
    `I'm evaluating ${category}. Which ones do you recommend and why?`,
    `What is the most popular option among ${category} right now?`,
    `Which ${category} are best for a small team getting started?`,
    `What are some lesser-known but powerful ${category}?`,
    `Compare the leading ${category} and their tradeoffs.`,
    `If I only had time to try three ${category}, which should they be?`,
  ];

  // Add competitor-anchored "alternatives to X" framings, since buyers
  // often arrive already knowing one name and asking what else is out there.
  for (const competitor of competitors) {
    pool.push(`What are the best alternatives to ${competitor}?`);
  }

  // A direct ask that names the brand, to test recognition specifically.
  pool.push(`How does ${brand} compare to other ${category}?`);

  return pool.slice(0, config.prompts);
}
