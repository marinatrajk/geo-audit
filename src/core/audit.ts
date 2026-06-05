import type {
  AuditReport,
  Config,
  Mention,
  Provider,
  QueryResult,
} from "../types.js";
import { MentionSchema } from "../types.js";
import { resolvePrompts } from "./prompts.js";
import { parseWithOpenAI } from "../providers/openai.js";

const ABSENT: Mention = {
  mentioned: false,
  rank: null,
  sentiment: "absent",
  context: "",
  competitorsListed: [],
};

function safeParseMention(json: string): Mention {
  try {
    const parsed = MentionSchema.safeParse(JSON.parse(json));
    if (parsed.success) return parsed.data;
  } catch {
    // fall through
  }
  return ABSENT;
}

/**
 * Run the full audit: every prompt against every available provider, then
 * parse each raw answer into a structured verdict. The parser always runs
 * through OpenAI (cheap, deterministic, json-mode), independent of which
 * model produced the answer.
 */
export async function runAudit(
  config: Config,
  providers: Provider[],
  onProgress?: (done: number, total: number) => void,
): Promise<AuditReport> {
  const prompts = resolvePrompts(config);
  const tasks: { prompt: string; provider: Provider }[] = [];
  for (const provider of providers) {
    for (const prompt of prompts) {
      tasks.push({ prompt, provider });
    }
  }

  const results: QueryResult[] = [];
  let done = 0;

  // Sequential keeps rate limits friendly and progress legible. Audits are
  // small (a handful of prompts x a few models), so throughput is fine.
  for (const { prompt, provider } of tasks) {
    try {
      const rawResponse = await provider.ask(prompt);
      const parsedJson = await parseWithOpenAI(
        rawResponse,
        config.brand,
        config.parserModel,
      );
      const mention = safeParseMention(parsedJson);
      results.push({
        prompt,
        provider: provider.name,
        model: provider.defaultModel,
        rawResponse,
        mention,
      });
    } catch (err) {
      results.push({
        prompt,
        provider: provider.name,
        model: provider.defaultModel,
        rawResponse: "",
        mention: ABSENT,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    done += 1;
    onProgress?.(done, tasks.length);
  }

  return { ...buildReport(config, results) };
}

/** Aggregate raw results into the scored report. */
export function buildReport(
  config: Config,
  results: QueryResult[],
): AuditReport {
  const valid = results.filter((r) => !r.error);
  const total = valid.length || 1;
  const present = valid.filter((r) => r.mention.mentioned);

  const presenceRate = present.length / total;

  const ranks = present
    .map((r) => r.mention.rank)
    .filter((r): r is number => typeof r === "number" && r > 0);
  const avgRank =
    ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;

  // Tally competitor mentions across every answer.
  const competitorTally = new Map<string, number>();
  for (const r of valid) {
    for (const name of r.mention.competitorsListed) {
      const key = name.trim();
      if (!key) continue;
      competitorTally.set(key, (competitorTally.get(key) ?? 0) + 1);
    }
  }
  const topCompetitors = [...competitorTally.entries()]
    .map(([name, mentions]) => ({ name, mentions }))
    .sort((a, b) => b.mentions - a.mentions);

  const competitorMentionTotal = topCompetitors.reduce(
    (sum, c) => sum + c.mentions,
    0,
  );
  const brandMentionTotal = present.length;
  const shareOfVoice =
    brandMentionTotal + competitorMentionTotal > 0
      ? brandMentionTotal / (brandMentionTotal + competitorMentionTotal)
      : 0;

  // Visibility score: presence is the backbone, rank quality is the multiplier.
  // A brand named first everywhere scores ~100; named last occasionally scores low.
  const rankQuality =
    avgRank !== null ? Math.max(0, 1 - (avgRank - 1) / 10) : 0;
  const visibility = Math.round(
    100 * (0.7 * presenceRate + 0.3 * presenceRate * rankQuality),
  );

  return {
    brand: config.brand,
    category: config.category,
    competitors: config.competitors,
    generatedAt: new Date().toISOString(),
    results,
    score: {
      visibility,
      presenceRate: Math.round(presenceRate * 100) / 100,
      avgRank: avgRank !== null ? Math.round(avgRank * 10) / 10 : null,
      shareOfVoice: Math.round(shareOfVoice * 100) / 100,
    },
    topCompetitors: topCompetitors.slice(0, 10),
  };
}
