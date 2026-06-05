import type { Provider } from "../types.js";

const ENDPOINT = "https://api.anthropic.com/v1/messages";

export const anthropic: Provider = {
  name: "anthropic",
  defaultModel: "claude-3-5-sonnet-latest",
  available() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },
  async ask(prompt: string, model = anthropic.defaultModel): Promise<string> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`anthropic ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { content: { text: string }[] };
    return data.content.map((c) => c.text).join("\n");
  },
};
