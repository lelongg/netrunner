import { readFileSync, writeFileSync } from "node:fs";

const [input, weightsOut, reportOut] = process.argv.slice(2);
if (!input) {
  console.error("usage: node fit-eval.mjs positions.jsonl [weights.json] [report.md]");
  process.exit(1);
}

const rows = readFileSync(input, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));
if (rows.length < 50) {
  console.error(`only ${rows.length} positions`);
  process.exit(1);
}
const features = Object.keys(rows[0].features);
const gameOf = (r) => `${r.matchup}:${r.seed}:${r.players?.runner ?? ""}`;
const seeds = [...new Set(rows.map(gameOf))];
const holdout = new Set(seeds.filter((_, i) => i % 5 === 0));
const train = rows.filter((r) => !holdout.has(gameOf(r)));
const test = rows.filter((r) => holdout.has(gameOf(r)));

const X = (set) => set.map((r) => features.map((f) => Number(r.features[f]) || 0));
const Y = (set) => set.map((r) => Number(r.corpWon));
const xt = X(train);
const yt = Y(train);
const mean = features.map((_, j) => xt.reduce((s, x) => s + x[j], 0) / xt.length);
const scale = features.map((_, j) => Math.sqrt(xt.reduce((s, x) => s + (x[j] - mean[j]) ** 2, 0) / xt.length) || 1);
const norm = (x) => x.map((v, j) => (v - mean[j]) / scale[j]);
const xn = xt.map(norm);

let w = features.map(() => 0);
let b = 0;
const lambda = 0.002;
const rate = 0.05;
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
for (let epoch = 0; epoch < 400; epoch++) {
  const gw = features.map(() => 0);
  let gb = 0;
  for (let i = 0; i < xn.length; i++) {
    const p = sigmoid(xn[i].reduce((s, v, j) => s + v * w[j], b));
    const d = p - yt[i];
    for (let j = 0; j < w.length; j++) gw[j] += d * xn[i][j];
    gb += d;
  }
  for (let j = 0; j < w.length; j++) w[j] -= rate * (gw[j] / xn.length + lambda * w[j]);
  b -= rate * (gb / xn.length);
}

function score(set) {
  const xs = X(set).map(norm);
  const ys = Y(set);
  let loss = 0;
  let right = 0;
  for (let i = 0; i < xs.length; i++) {
    const p = Math.min(1 - 1e-6, Math.max(1e-6, sigmoid(xs[i].reduce((s, v, j) => s + v * w[j], b))));
    loss -= ys[i] * Math.log(p) + (1 - ys[i]) * Math.log(1 - p);
    if ((p >= 0.5) === (ys[i] === 1)) right++;
  }
  const base = ys.reduce((s, y) => s + y, 0) / ys.length;
  const clamped = Math.min(1 - 1e-6, Math.max(1e-6, base));
  const baseLoss = -(clamped * Math.log(clamped) + (1 - clamped) * Math.log(1 - clamped));
  return { n: xs.length, loss: loss / xs.length, accuracy: right / xs.length, baseRate: base, baseLoss };
}

const byTurn = {};
for (const r of test) {
  const bucket = r.turn <= 4 ? "turns 1-4" : r.turn <= 8 ? "turns 5-8" : r.turn <= 12 ? "turns 9-12" : "turns 13+";
  (byTurn[bucket] ??= []).push(r);
}

const weights = { features, mean, scale, weights: w, bias: b, positions: rows.length, games: seeds.length, fitted: new Date().toISOString().slice(0, 10) };
const tr = score(train);
const te = score(test);
const lines = [
  `# Learned evaluation fit`,
  "",
  `${rows.length} positions from ${seeds.length} games · train ${tr.n}, holdout ${te.n} (by game)`,
  "",
  `| set | log-loss | baseline log-loss | accuracy | corp win rate |`,
  `|---|---|---|---|---|`,
  `| train | ${tr.loss.toFixed(3)} | ${tr.baseLoss.toFixed(3)} | ${(tr.accuracy * 100).toFixed(1)} % | ${(tr.baseRate * 100).toFixed(1)} % |`,
  `| holdout | ${te.loss.toFixed(3)} | ${te.baseLoss.toFixed(3)} | ${(te.accuracy * 100).toFixed(1)} % | ${(te.baseRate * 100).toFixed(1)} % |`,
  "",
  `| holdout slice | n | log-loss | accuracy |`,
  `|---|---|---|---|`,
  ...Object.entries(byTurn).map(([k, set]) => {
    const s = score(set);
    return `| ${k} | ${s.n} | ${s.loss.toFixed(3)} | ${(s.accuracy * 100).toFixed(1)} % |`;
  }),
  "",
  `Weights on standardized features (positive favours the Corp):`,
  "",
  `| feature | weight |`,
  `|---|---|`,
  ...features
    .map((f, j) => [f, w[j]])
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([f, v]) => `| ${f} | ${v >= 0 ? "+" : ""}${v.toFixed(3)} |`),
  "",
];
const report = lines.join("\n");
if (weightsOut) writeFileSync(weightsOut, JSON.stringify(weights, null, 2));
if (reportOut) writeFileSync(reportOut, report);
console.log(report);
