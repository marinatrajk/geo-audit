import chalk from "chalk";
import type { AuditReport } from "../types.js";

function scoreColor(score: number): (s: string) => string {
  if (score >= 75) return chalk.green;
  if (score >= 40) return chalk.yellow;
  return chalk.red;
}

/** Pretty terminal output. The screenshot-able summary. */
export function renderTerminal(report: AuditReport): string {
  const lines: string[] = [];
  const color = scoreColor(report.score.visibility);

  lines.push("");
  lines.push(chalk.bold(`  GEO Audit: ${report.brand}`));
  lines.push(chalk.dim(`  Category: ${report.category}`));
  lines.push("");
  lines.push(
    `  Visibility score   ${color(chalk.bold(`${report.score.visibility}/100`))}`,
  );
  lines.push(
    `  Presence rate      ${(report.score.presenceRate * 100).toFixed(0)}% of queries`,
  );
  lines.push(
    `  Avg rank when seen ${report.score.avgRank ?? chalk.dim("not seen")}`,
  );
  lines.push(
    `  Share of voice     ${(report.score.shareOfVoice * 100).toFixed(0)}%`,
  );
  lines.push("");

  if (report.topCompetitors.length > 0) {
    lines.push(chalk.bold("  Who's getting named instead:"));
    for (const c of report.topCompetitors.slice(0, 5)) {
      lines.push(`    ${c.name.padEnd(24)} ${chalk.dim(`${c.mentions}x`)}`);
    }
    lines.push("");
  }

  lines.push(chalk.bold("  Per-query breakdown:"));
  for (const r of report.results) {
    const tag = r.error
      ? chalk.red("ERR")
      : r.mention.mentioned
        ? chalk.green(`#${r.mention.rank ?? "?"}`)
        : chalk.red("absent");
    lines.push(`    ${chalk.dim(`[${r.provider}]`)} ${tag}  ${r.prompt}`);
  }
  lines.push("");
  return lines.join("\n");
}

/** Shareable markdown report. The GTM artifact people screenshot. */
export function renderMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`# GEO Audit: ${report.brand}`);
  lines.push("");
  lines.push(`**Category:** ${report.category}  `);
  lines.push(`**Generated:** ${report.generatedAt}  `);
  if (report.competitors.length > 0) {
    lines.push(`**Tracked competitors:** ${report.competitors.join(", ")}  `);
  }
  lines.push("");
  lines.push("## Score");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Visibility score | **${report.score.visibility}/100** |`);
  lines.push(
    `| Presence rate | ${(report.score.presenceRate * 100).toFixed(0)}% of queries |`,
  );
  lines.push(`| Avg rank when seen | ${report.score.avgRank ?? "not seen"} |`);
  lines.push(
    `| Share of voice | ${(report.score.shareOfVoice * 100).toFixed(0)}% |`,
  );
  lines.push("");

  if (report.topCompetitors.length > 0) {
    lines.push("## Who's getting named instead");
    lines.push("");
    lines.push("| Brand | Mentions |");
    lines.push("| --- | --- |");
    for (const c of report.topCompetitors) {
      lines.push(`| ${c.name} | ${c.mentions} |`);
    }
    lines.push("");
  }

  lines.push("## Per-query breakdown");
  lines.push("");
  lines.push("| Provider | Result | Query |");
  lines.push("| --- | --- | --- |");
  for (const r of report.results) {
    const result = r.error
      ? "error"
      : r.mention.mentioned
        ? `mentioned (#${r.mention.rank ?? "?"})`
        : "absent";
    lines.push(`| ${r.provider} | ${result} | ${r.prompt} |`);
  }
  lines.push("");
  return lines.join("\n");
}
