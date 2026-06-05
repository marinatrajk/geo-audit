import type { Provider } from "../types.js";

const ENDPOINT = "https://api.perplexity.ai/chat/completions";

/**
 * Perplexity matters most here: it's a live AI search engine, so its answers
 * reflect what real buyers see when they "google" your category through AI.
 */
export const perplexity: Provider = {
  name: "perplexity",
  defaultModel: "sonar",
  available() {
    return Boolean(process.env.PERPLEXITY_API_KEY);
  },
  async ask(prompt: string, model = perplexity.defaultModel): Promise<string> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`perplexity ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content ?? "";
  },
};
