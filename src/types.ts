import { z } from "zod";

/**
 * A single AI model's structured verdict on one prompt.
 * This is what the LLM-as-parser returns after reading a raw response.
 */
export const MentionSchema = z.object({
  mentioned: z.boolean(),
  rank: z.number().int().nullable(), // 1-based position in the answer, null if absent
  sentiment: z.enum(["positive", "neutral", "negative", "absent"]),
  context: z.string(), // short quote or paraphrase of how the brand was framed
  competitorsListed: z.array(z.string()),
});
export type Mention = z.infer<typeof MentionSchema>;

/** One prompt sent to one model, plus the raw response and the parsed verdict. */
export interface QueryResult {
  prompt: string;
  provider: string;
  model: string;
  rawResponse: string;
  mention: Mention;
  error?: string;
}

/** Aggregate score across every prompt and model. */
export interface AuditReport {
  brand: string;
  category: string;
  competitors: string[];
  generatedAt: string;
  results: QueryResult[];
  score: {
    visibility: number; // 0-100
    presenceRate: number; // share of queries that mentioned the brand
    avgRank: number | null; // average rank when present
    shareOfVoice: number; // brand mentions / (brand + competitor mentions)
  };
  topCompetitors: { name: string; mentions: number }[];
}

export const ConfigSchema = z
  .object({
    brand: z.string().min(1),
    // category is optional: it's only used to synthesize prompts when you
    // don't supply your own. Real audits should pass real prompts.
    category: z.string().default(""),
    // explicit prompts: the actual phrases people type into a chat. When
    // present, these are used verbatim and category synthesis is skipped.
    explicitPrompts: z.array(z.string()).default([]),
    competitors: z.array(z.string()).default([]),
    prompts: z.number().int().min(1).max(50).default(6),
    providers: z.array(z.string()).optional(), // restrict to a subset; defaults to all with keys present
    parserModel: z.string().default("gpt-4o-mini"),
  })
  .refine((c) => c.category.length > 0 || c.explicitPrompts.length > 0, {
    message:
      "Provide either --category (to synthesize prompts) or at least one --prompt / --prompts-file.",
  });
export type Config = z.infer<typeof ConfigSchema>;

/** Interface every provider adapter implements. */
export interface Provider {
  name: string;
  /** Default model used for answering buyer queries. */
  defaultModel: string;
  /** True when the required API key is present in the environment. */
  available(): boolean;
  /** Send a single buyer-style prompt, return the raw text answer. */
  ask(prompt: string, model?: string): Promise<string>;
}
