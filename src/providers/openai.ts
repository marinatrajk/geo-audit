import type { Provider } from "../types.js";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

/**
 * OpenAI provider in GROUNDED mode.
 *
 * Uses gpt-4o-search-preview, which performs live web search before
 * answering. This mirrors what a real person sees in ChatGPT with search
 * on, rather than the frozen training-data answer a plain gpt-4o call
 * returns. GEO is about what AI says *now*, so grounding is the point.
 */
export const openai: Provider = {
  name: "openai",
  defaultModel: "gpt-4o-search-preview",
  available() {
    return Boolean(process.env.OPENAI_API_KEY);
  },
  async ask(prompt: string, model = openai.defaultModel): Promise<string> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        // search-preview models do their own retrieval; temperature is unsupported
        web_search_options: {},
      }),
    });
    if (!res.ok) {
      throw new Error(`openai ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content ?? "";
  },
};

/**
 * Structured parser. Runs through a cheap non-search model (gpt-4o-mini)
 * in JSON mode. It reads a raw answer and returns whether the brand appeared,
 * where, and who else got named. LLM-as-parser beats regex: it handles
 * "Vellum" vs "vellum.ai" vs "Vellum AI" without brittle string matching.
 */
export async function parseWithOpenAI(
  rawResponse: string,
  brand: string,
  parserModel: string,
): Promise<string> {
  const system = `You analyze AI search answers for brand visibility. Return ONLY valid JSON, no prose.`;
  const user = `Brand to look for: "${brand}".

Answer to analyze:
"""
${rawResponse}
"""

Return JSON with exactly these keys:
{
  "mentioned": boolean,
  "rank": number | null,        // 1-based position the brand appears at in the list/answer, null if absent
  "sentiment": "positive" | "neutral" | "negative" | "absent",
  "context": string,            // short paraphrase of how the brand was framed, "" if absent
  "competitorsListed": string[] // other product/brand names named in the answer
}`;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: parserModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    throw new Error(`openai parser ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content ?? "{}";
}
