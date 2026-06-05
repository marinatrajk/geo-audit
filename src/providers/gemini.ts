import type { Provider } from "../types.js";

const base = "https://generativelanguage.googleapis.com/v1beta/models";

export const gemini: Provider = {
  name: "gemini",
  defaultModel: "gemini-2.0-flash",
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
