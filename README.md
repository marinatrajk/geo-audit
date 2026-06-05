# geo-audit

Audit how AI models answer category questions and whether your brand shows up.

SEO got you to the top of Google. GEO (Generative Engine Optimization) is the next version of that fight: when a buyer asks ChatGPT, Claude, Perplexity, or Gemini "what are the best tools in my category," are you in the answer, or is your competitor?

`geo-audit` runs that exact question across multiple AI models, parses every answer, and scores your visibility. One command, one report.

## Quick start

```bash
bun install
cp .env.example .env   # add at least OPENAI_API_KEY
```

People don't type categories into a chat, they type questions. Audit the
real phrases your buyers use:

```bash
bun src/cli.ts \
  --brand "Vellum" \
  --prompt "can you recommend any personal AI assistants similar to OpenClaw or Hermes" \
  --prompt "what's a good AI tool that can read my files and help me work on my mac" \
  --competitors "OpenClaw,Hermes,Sai,MemGPT" \
  --md report.md
```

Or keep your prompts in a file (one per line, `#` for comments) and reuse it:

```bash
bun src/cli.ts --brand "Vellum" --prompts-file prompts.example.txt --md report.md
```

Don't have a prompt list yet? `--category` synthesizes a spread of buyer
queries for you, but real prompts always beat synthesized ones:

```bash
bun src/cli.ts --brand "Vellum" --category "open source AI assistant" --md report.md
```

Using Node instead of Bun:

```bash
npm install
npm run build
node dist/cli.js --brand "Vellum" --category "AI agent frameworks for developers"
```

## What you get

```
  GEO Audit: Vellum
  Category: AI assistant platforms

  Visibility score   42/100
  Presence rate      50% of queries
  Avg rank when seen 3.5
  Share of voice     18%

  Who's getting named instead:
    OpenClaw                 6x
    Hermes Agent             4x
    MemGPT                   3x

  Per-query breakdown:
    [openai] #2  What are the best AI assistant platforms in 2026?
    [perplexity] absent  What's the most popular AI assistant platform right now?
    ...
```

## How it works

1. **Prompt spread.** One category becomes a set of realistic buyer queries (best-of, alternatives-to, use-case, direct comparison). A brand can rank #1 on one phrasing and vanish on another, so the spread is the signal.
2. **Multi-model fan-out.** Each prompt runs against every provider whose API key is present. Adapters are pluggable: adding a model is about 20 lines.
3. **LLM-as-parser.** Each raw answer is read by a cheap model that returns structured JSON (mentioned, rank, sentiment, competitors). This beats regex: it handles "Vellum" vs "vellum.ai" vs "Vellum's assistant" without brittle string matching.
4. **Scoring.** Presence rate is the backbone, rank quality is the multiplier, and share of voice tells you how loud your competitors are by comparison.

## Options

| Flag | Description |
| --- | --- |
| `-b, --brand` | Your brand name (required) |
| `-q, --prompt` | A real phrase someone types into a chat (repeatable) |
| `-f, --prompts-file` | File of real prompts, one per line (`#` comments ok) |
| `-c, --category` | Synthesize buyer queries from a category (used only if no real prompts given) |
| `-k, --competitors` | Comma-separated competitor names to track |
| `-p, --prompts` | Max synthesized queries to run, 1-50 (default 6) |
| `--providers` | Restrict to a subset, e.g. `openai,perplexity` |
| `--parser-model` | Model used to parse answers (default `gpt-4o-mini`) |
| `--json <path>` | Write machine-readable JSON report |
| `--md <path>` | Write a shareable markdown report |

## Providers

### Built in

Four providers ship in the box. Each queries the model in its grounded /
web-search mode, so results reflect what a real person sees in the chat app,
not stale training data.

| Provider | Env var | Model used | Notes |
| --- | --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-search-preview` | Required (also runs the answer parser) |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-3-5-sonnet-latest` | Optional |
| Perplexity | `PERPLEXITY_API_KEY` | `sonar` | Optional, closest to live AI search |
| Gemini | `GEMINI_API_KEY` | `gemini-3.5-flash` (+ Google Search) | Optional |

`OPENAI_API_KEY` is always required because the answer parser runs through
`gpt-4o-mini`, regardless of which models you query. Every other key is
optional. Missing keys are skipped, so you can run with just one provider.

Pick a subset with `--providers`:

```bash
# only the engines you care about
bun src/cli.ts --brand "Vellum" --prompts-file prompts.txt --providers openai,perplexity
```

### Adding your own

Any OpenAI-compatible API (Grok, DeepSeek, Groq, Together, OpenRouter, a local
model, etc.) is about 30 lines. Three steps:

**1. Create `src/providers/<name>.ts`** implementing the `Provider` interface:

```typescript
import type { Provider } from "../types.js";

const ENDPOINT = "https://api.x.ai/v1/chat/completions";

export const grok: Provider = {
  name: "grok",
  defaultModel: "grok-2-latest",
  available() {
    return Boolean(process.env.XAI_API_KEY);
  },
  async ask(prompt: string, model = grok.defaultModel): Promise<string> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`grok ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content ?? "";
  },
};
```

**2. Register it** in `src/providers/index.ts`:

```typescript
import { grok } from "./grok.js";
export const allProviders: Provider[] = [openai, anthropic, perplexity, gemini, grok];
```

**3. Add the key** to your `.env` (and `.env.example` so others know it exists).

The whole contract is four members: `name`, `defaultModel`, `available()`,
and `ask()`. If the API speaks the OpenAI chat-completions format, it's a
copy of `src/providers/openai.ts` with a different URL and env var.

## CI / cron

The `--json` output is stable and machine-readable. Run it weekly and track your visibility score over time, or fail a CI job if it drops below a threshold.

## License

MIT
