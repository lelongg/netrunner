import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [root, mdOut, jsonOut] = process.argv.slice(2);
if (!root) {
  console.error("usage: node grid-report.mjs <cells dir> [report.md] [report.json]");
  process.exit(1);
}

const DECKS = {
  "core-hb": "Discretion Advised",
  "core-jinteki": "Advanced Yomi",
  "core-nbn": "Hyper Velocity",
  "core-weyland": "Quick and Dirty",
  "core-anarch": "Party Hard",
  "core-criminal": "Stolen Goods",
  "core-shaper": "Planning Ahead",
};
const CORPS = ["core-hb", "core-jinteki", "core-nbn", "core-weyland"];
const RUNNERS = ["core-anarch", "core-criminal", "core-shaper"];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name === "cell.json") yield p;
  }
}

const cells = [...walk(root)].map((p) => JSON.parse(readFileSync(p, "utf8")));
const configs = [...new Set(cells.map((c) => c.config))];
const splits = [...new Set(cells.map((c) => c.split))];
const label = (k) => DECKS[k] ?? k;
const lines = [];
const report = { configs: {}, cells };

const sides = ["corp", "runner"].filter((s) => cells.some((c) => (c.side === "runner" ? "runner" : "corp") === s));

for (const config of configs) {
  const flags = cells.find((c) => c.config === config)?.flags ?? "";
  lines.push(`## ${config}${flags ? ` (\`${flags}\`)` : ""}`, "");
  report.configs[config] = { flags, splits: {} };
  for (const side of sides) for (const split of splits) {
    const mine = cells.filter((c) => c.config === config && c.split === split && (c.side === "runner" ? "runner" : "corp") === side);
    if (!mine.length) continue;
    const games = mine[0].games;
    const who = side === "runner" ? "Runner" : "Corp";
    const cell = (corp, runner) => mine.find((c) => c.corp === corp && c.runner === runner);
    let total = 0;
    let played = 0;
    const rows = CORPS.map((corp) => {
      const wins = RUNNERS.map((runner) => cell(corp, runner)?.wins?.[side]);
      const sum = wins.reduce((n, w) => n + (w ?? 0), 0);
      total += sum;
      played += wins.filter((w) => w !== undefined).length * games;
      return `| ${label(corp)} | ${wins.map((w) => (w === undefined ? "–" : String(w))).join(" | ")} | ${sum} |`;
    });
    const ms = mine.map((c) => c.decisionMs).filter((x) => x != null);
    lines.push(`### ${split} split · ${who} ${total} of ${played}${ms.length ? ` · decision ${(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(0)} ms` : ""}`, "");
    lines.push(`| Corp \\ Runner | ${RUNNERS.map(label).join(" | ")} | total |`, `|---|${RUNNERS.map(() => "---").join("|")}|---|`, ...rows, "");
    const mistakes = {};
    for (const c of mine) for (const [k, v] of Object.entries(c.mistakes ?? {})) if (k.startsWith(`${side}:`)) mistakes[`${label(side === "runner" ? c.runner : c.corp)} ${k.slice(side.length + 1)}`] = (mistakes[`${label(side === "runner" ? c.runner : c.corp)} ${k.slice(side.length + 1)}`] ?? 0) + v;
    const top = Object.entries(mistakes).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length) lines.push(`${who} mistakes: ${top.map(([k, v]) => `${k} ${v}`).join(", ")}`, "");
    report.configs[config].splits[sides.length > 1 ? `${side}:${split}` : split] = { side, games, total, played, decisionMs: ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null, mistakes };
  }
}

if (configs.length > 1) {
  lines.push("## Side by side", "", `| split | ${configs.join(" | ")} |`, `|---|${configs.map(() => "---").join("|")}|`);
  for (const key of Object.keys(report.configs[configs[0]].splits)) lines.push(`| ${key} | ${configs.map((c) => { const s = report.configs[c].splits[key]; return s ? `${s.total} / ${s.played}` : "–"; }).join(" | ")} |`);
  lines.push("");
}

const md = lines.join("\n");
if (mdOut) writeFileSync(mdOut, md);
else console.log(md);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2));
