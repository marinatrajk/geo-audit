import type { Provider } from "../types.js";

const base = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Gemini provider in GROUNDED mode.
 *
 * Enables the google_search tool so Gemini retrieves live results before
 * answering, the same grounding the Gemini app uses. This is what makes the
 * tool reflect what a real person sees in chat, not stale training data.
 */
export const gemini: Provider = {
  name: "gemini",
  defaultModel: "gemini-3.5-flash",
  available() {
    return Boolean(process.env.GEMINI_API_KEY);
  },
  async ask(prompt: string, model = gemini.defaultModel): Promise<string> {
    const url = `${base}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    });
    if (!res.ok) {
      throw new Error(`gemini ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    return (
      data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n") ?? ""
    );
  },
};
