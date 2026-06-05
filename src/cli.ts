#!/usr/bin/env node
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { ConfigSchema } from "./types.js";
import { resolveProviders } from "./providers/index.js";
import { runAudit } from "./core/audit.js";
import { renderTerminal, renderMarkdown } from "./core/report.js";

const program = new Command();

program
  .name("geo-audit")
  .description(
    "Audit how AI models answer category questions and whether your brand shows up.",
  )
  .version("0.1.0")
  .requiredOption("-b, --brand <name>", "your brand name")
  .requiredOption(
    "-c, --category <text>",
    'the category buyers search, e.g. "AI assistant platforms"',
  )
  .option(
    "-k, --competitors <list>",
    "comma-separated competitor names to track",
    "",
  )
  .option("-p, --prompts <n>", "number of buyer queries to run (1-20)", "6")
  .option(
    "--providers <list>",
    "restrict to a subset, e.g. openai,perplexity",
    "",
  )
  .option("--parser-model <model>", "model used to parse answers", "gpt-4o-mini")
  .option("--json <path>", "write machine-readable JSON report to a file")
  .option("--md <path>", "write a markdown report to a file")
  .action(async (opts) => {
    const config = ConfigSchema.parse({
      brand: opts.brand,
      category: opts.category,
      competitors: opts.competitors
        ? String(opts.competitors)
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [],
      prompts: Number(opts.prompts),
      providers: opts.providers
        ? String(opts.providers)
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined,
      parserModel: opts.parserModel,
    });

    const providers = resolveProviders(config.providers);
    if (providers.length === 0) {
      console.error(
        chalk.red(
          "No providers available. Set at least one of OPENAI_API_KEY, ANTHROPIC_API_KEY, PERPLEXITY_API_KEY, GEMINI_API_KEY.",
        ),
      );
      process.exit(1);
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error(
        chalk.red(
          "OPENAI_API_KEY is required: the answer parser runs through OpenAI.",
        ),
      );
      process.exit(1);
    }

    console.log(
      chalk.dim(
        `Running ${config.prompts} queries across ${providers
          .map((p) => p.name)
          .join(", ")}...`,
      ),
    );
    const spinner = ora("Querying models").start();

    const report = await runAudit(config, providers, (done, total) => {
      spinner.text = `Querying models (${done}/${total})`;
    });
    spinner.succeed("Audit complete");

    console.log(renderTerminal(report));

    if (opts.json) {
      writeFileSync(opts.json, JSON.stringify(report, null, 2));
      console.log(chalk.dim(`  JSON written to ${opts.json}`));
    }
    if (opts.md) {
      writeFileSync(opts.md, renderMarkdown(report));
      console.log(chalk.dim(`  Markdown written to ${opts.md}`));
    }
  });

program.parseAsync();
