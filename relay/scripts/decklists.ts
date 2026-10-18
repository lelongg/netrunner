import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Card } from "../../mobile/src/engine";
import { FORMATS, analyze } from "../../mobile/src/deckrules";
import { cardId } from "../../mobile/src/cardid";

const API = "https://api.netrunnerdb.com/api/v3/public/decklists";
const SITE = (process.env.SITE ?? "https://lelongg.github.io/netrunner/").replace(/\/?$/, "/");
const DB = "netrunner-decklists";
const USER_AGENT = "PocketRig-DeckIndex/1.0 (+https://github.com/lelongg/netrunner)";
const PAUSE_MS = Number(process.env.PAUSE_MS ?? 2500);
const PAGE = 250;
const BACKFILL_PAGES_PER_RUN = Number(process.env.BACKFILL_PAGES ?? 30);
const KEEP_UNLEGAL_DAYS = 365;
const LOCAL = process.argv.includes("--local");
const mode = process.argv[2] ?? "update";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const quote = (v: string) => `'${v.replace(/'/g, "''")}'`;
const work = mkdtempSync(join(tmpdir(), "decklists-"));
let requests = 0;

async function nrdb(params: Record<string, string>) {
  const url = `${API}?${new URLSearchParams(params)}`;
  for (let attempt = 0; ; attempt++) {
    if (requests++) await sleep(PAUSE_MS);
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/vnd.api+json" } });
    if (res.ok) return (await res.json()) as { data: any[]; links?: { next?: string } };
    if (attempt >= 3 || (res.status < 500 && res.status !== 429)) throw new Error(`NetrunnerDB answered ${res.status} for ${url}`);
    await sleep(Number(res.headers.get("Retry-After")) * 1000 || 30_000 * (attempt + 1));
  }
}

function d1(sql: string): any[] {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", DB, LOCAL ? "--local" : "--remote", "--json", "--command", sql], { encoding: "utf8", maxBuffer: 1 << 30 });
  return JSON.parse(out)[0]?.results ?? [];
}

function d1Write(statements: string[]) {
  for (let i = 0; i < statements.length; i += 400) {
    const file = join(work, `batch-${i}.sql`);
    writeFileSync(file, statements.slice(i, i + 400).join("\n"));
    execFileSync("npx", ["wrangler", "d1", "execute", DB, LOCAL ? "--local" : "--remote", "--file", file], { stdio: ["ignore", "ignore", "inherit"] });
  }
}

const meta = (k: string): string | undefined => d1(`SELECT v FROM index_meta WHERE k = ${quote(k)}`)[0]?.v;
const setMeta = (k: string, v: string) => `INSERT OR REPLACE INTO index_meta (k, v) VALUES (${quote(k)}, ${quote(v)});`;

const cards: Card[] = await (await fetch(`${SITE}data/cards.json`)).json();
const byId = new Map(cards.map((c) => [cardId(c.title), c]));
const byCode = new Map(cards.map((c) => [String(c.code), c]));
const ruleFields = (c: Card) => [c.title, c.code, c.side, c.type, c.faction, c.factioncost, c.agendapoints, c.minimumdecksize, c.influencelimit, c["deck-limit"], c.format];
const fingerprint = createHash("sha256")
  .update(JSON.stringify([FORMATS, cards.map(ruleFields)]))
  .digest("hex")
  .slice(0, 16);
const LEGAL_FORMATS = FORMATS.filter((f) => f.key !== "casual").map((f) => f.key);

function formatsOf(identity: Card, entries: { card: Card; qty: number }[]) {
  const deck = { name: "", identity, cards: entries };
  return LEGAL_FORMATS.filter((f) => analyze(deck, f).legal);
}

interface Row {
  id: string;
  name: string;
  user: string;
  side: string;
  faction: string;
  identity: string;
  created: string;
  updated: string;
  cards: string;
  formats: string[];
}

function toRow(item: any): Row | null {
  const a = item.attributes;
  if (!a.follows_basic_deckbuilding_rules) return null;
  const identity = byId.get(a.identity_card_id);
  if (!identity) return null;
  const entries: { card: Card; qty: number }[] = [];
  for (const [id, qty] of Object.entries<number>(a.card_slots ?? {})) {
    const card = byId.get(id);
    if (!card) return null;
    if (card.type !== "Identity") entries.push({ card, qty });
  }
  const formats = formatsOf(identity, entries);
  if (!formats.length && Date.now() - Date.parse(a.created_at) > KEEP_UNLEGAL_DAYS * 86_400_000) return null;
  return {
    id: String(item.id),
    name: String(a.name ?? "Decklist").slice(0, 120),
    user: String(a.user_id ?? ""),
    side: a.side_id,
    faction: a.faction_id,
    identity: String(identity.code),
    created: a.created_at,
    updated: a.updated_at,
    cards: entries.map((e) => `${e.card.code}:${e.qty}`).join(","),
    formats,
  };
}

function writeRow(r: Row) {
  return [
    `INSERT OR REPLACE INTO decklists (id, name, user, side, faction, identity, created, updated, cards) VALUES (${[r.id, r.name, r.user, r.side, r.faction, r.identity, r.created, r.updated, r.cards].map(quote).join(", ")});`,
    `DELETE FROM deck_formats WHERE id = ${quote(r.id)};`,
    ...r.formats.map((f) => `INSERT INTO deck_formats (format, id, side, faction, created) VALUES (${[f, r.id, r.side, r.faction, r.created].map(quote).join(", ")});`),
  ];
}

async function update() {
  const since = meta("updated") ?? "";
  let newest = since;
  const out: string[] = [];
  let seen = 0;
  for (let page = 1; ; page++) {
    const json = await nrdb({ sort: "-updated_at", "page[size]": String(PAGE), "page[number]": String(page) });
    const fresh = json.data.filter((d) => d.attributes.updated_at > since);
    for (const item of fresh) {
      seen++;
      if (item.attributes.updated_at > newest) newest = item.attributes.updated_at;
      const row = toRow(item);
      out.push(...(row ? writeRow(row) : [`DELETE FROM decklists WHERE id = ${quote(String(item.id))};`, `DELETE FROM deck_formats WHERE id = ${quote(String(item.id))};`]));
    }
    if (!since || fresh.length < json.data.length || !json.links?.next) break;
  }
  if (newest) out.push(setMeta("updated", newest));
  d1Write(out);
  console.log(`update: ${seen} decklists changed since ${since || "the start"}`);
}

async function backfill() {
  if (meta("backfill") === "done") return;
  let page = Number(meta("backfill") ?? 1);
  if (page === 1 && !meta("updated")) d1Write([setMeta("updated", new Date().toISOString())]);
  let stored = 0;
  for (let n = 0; n < BACKFILL_PAGES_PER_RUN; n++, page++) {
    const json = await nrdb({ sort: "created_at", "page[size]": String(PAGE), "page[number]": String(page) });
    const out: string[] = [];
    for (const item of json.data) {
      const row = toRow(item);
      if (row) {
        out.push(...writeRow(row));
        stored++;
      }
    }
    const last = !json.links?.next;
    out.push(setMeta("backfill", last ? "done" : String(page + 1)));
    d1Write(out);
    if (last) break;
  }
  console.log(`backfill: stored ${stored} decklists, next page ${meta("backfill")}`);
}

async function reformat() {
  if (meta("cards") === fingerprint) return;
  const rows = d1("SELECT d.id, d.side, d.faction, d.identity, d.created, d.cards, (SELECT group_concat(f.format) FROM deck_formats f WHERE f.id = d.id) AS formats FROM decklists d");
  const out: string[] = [];
  for (const r of rows) {
    const identity = byCode.get(r.identity);
    const entries = String(r.cards)
      .split(",")
      .filter(Boolean)
      .map((s) => s.split(":"))
      .flatMap(([code, qty]) => (byCode.get(code) ? [{ card: byCode.get(code)!, qty: Number(qty) }] : []));
    const formats = identity ? formatsOf(identity, entries) : [];
    if (formats.join(",") === String(r.formats ?? "").split(",").filter(Boolean).sort((a, b) => LEGAL_FORMATS.indexOf(a) - LEGAL_FORMATS.indexOf(b)).join(",")) continue;
    out.push(`DELETE FROM deck_formats WHERE id = ${quote(r.id)};`, ...formats.map((f) => `INSERT INTO deck_formats (format, id, side, faction, created) VALUES (${[f, r.id, r.side, r.faction, r.created].map(quote).join(", ")});`));
  }
  out.push(setMeta("cards", fingerprint));
  d1Write(out);
  console.log(`reformat: ${rows.length} decklists checked against the current card data`);
}

async function prune() {
  if (meta("backfill") !== "done") return;
  const alive = new Set<string>();
  for (let page = 1; ; page++) {
    const json = await nrdb({ "fields[decklists]": "updated_at", "page[size]": String(PAGE), "page[number]": String(page) });
    for (const item of json.data) alive.add(String(item.id));
    if (!json.links?.next) break;
  }
  const gone = d1("SELECT id FROM decklists")
    .map((r) => String(r.id))
    .filter((id) => !alive.has(id));
  d1Write(gone.flatMap((id) => [`DELETE FROM decklists WHERE id = ${quote(id)};`, `DELETE FROM deck_formats WHERE id = ${quote(id)};`]));
  console.log(`prune: ${alive.size} decklists on NetrunnerDB, ${gone.length} removed from the index`);
}

if (mode === "prune") await prune();
else {
  await reformat();
  await update();
  await backfill();
}
console.log(`${requests} NetrunnerDB requests`);
