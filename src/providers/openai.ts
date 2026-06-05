import type { Provider } from "../types.js";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

export const openai: Provider = {
  name: "openai",
  defaultModel: "gpt-4o",
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
        temperature: 0.7,
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
 * The structured parser runs through OpenAI too. It reads a raw answer and
 * returns JSON describing whether the brand appeared, where, and who else
 * got named. LLM-as-parser beats regex: it handles "Vellum" vs "vellum.ai"
 * vs "Vellum's assistant" without brittle string matching.
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
