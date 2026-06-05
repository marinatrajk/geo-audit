# geo-audit

Audit how AI models answer category questions and whether your brand shows up.

SEO got you to the top of Google. GEO (Generative Engine Optimization) is the next version of that fight: when a buyer asks ChatGPT, Claude, Perplexity, or Gemini "what are the best tools in my category," are you in the answer, or is your competitor?

`geo-audit` runs that exact question across multiple AI models, parses every answer, and scores your visibility. One command, one report.

## Quick start

```bash
bun install
cp .env.example .env   # add at least OPENAI_API_KEY

bun src/cli.ts \
  --brand "Vellum" \
  --category "AI agent frameworks for developers" \
  --competitors "Hermes,OpenClaw,MemGPT" \
  --md report.md
```

Tip: the category string matters a lot. "AI assistant platforms" pulls
consumer voice assistants (Siri, Alexa); "AI agent frameworks for developers"
pulls the dev-tool category. Audit the phrasing your buyers actually use.

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
| `-c, --category` | The category buyers search (required) |
| `-k, --competitors` | Comma-separated competitor names to track |
| `-p, --prompts` | Number of buyer queries to run, 1-20 (default 6) |
| `--providers` | Restrict to a subset, e.g. `openai,perplexity` |
| `--parser-model` | Model used to parse answers (default `gpt-4o-mini`) |
| `--json <path>` | Write machine-readable JSON report |
| `--md <path>` | Write a shareable markdown report |

## Providers

| Provider | Env var | Notes |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | Required (also runs the parser) |
| Anthropic | `ANTHROPIC_API_KEY` | Optional |
| Perplexity | `PERPLEXITY_API_KEY` | Optional, closest to live AI search |
| Gemini | `GEMINI_API_KEY` | Optional |

Missing keys are skipped, so you can run with just one provider.

## CI / cron

The `--json` output is stable and machine-readable. Run it weekly and track your visibility score over time, or fail a CI job if it drops below a threshold.

## License

MIT
