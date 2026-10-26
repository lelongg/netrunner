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
const ABR = "https://alwaysberunning.net/api";
const LEGACY_API = "https://netrunnerdb.com/api/2.0/public/decklist";
const RESULTS_SINCE = process.env.RESULTS_SINCE ?? "2024-01-01";
const TOURNAMENTS_PER_RUN = Number(process.env.TOURNAMENTS ?? 250);
const LEGACY_PER_RUN = Number(process.env.LEGACY ?? 600);
const SEARCH_ROWS_PER_RUN = Number(process.env.SEARCH_ROWS ?? 8000);
const ABR_FORMATS: Record<string, string> = { standard: "standard", startup: "startup", eternal: "eternal" };
const LOCAL = process.argv.includes("--local");
const mode = process.argv[2] ?? "update";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const quote = (v: string) => `'${v.replace(/'/g, "''")}'`;
const work = mkdtempSync(join(tmpdir(), "decklists-"));
let requests = 0;

async function getJson(url: string): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    if (requests++) await sleep(PAUSE_MS / 2);
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
    if (res.ok) return res.json();
    if (res.status === 404) return null;
    if (attempt >= 3 || (res.status < 500 && res.status !== 429)) throw new Error(`${url} answered ${res.status}`);
    await sleep(Number(res.headers.get("Retry-After")) * 1000 || 30_000 * (attempt + 1));
  }
}

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

const words = (name: string, user: string, identity: string) => [name, user, byCode.get(identity)?.title ?? ""].join(" ");
const cardWords = (cards: string) =>
  cards
    .split(",")
    .filter(Boolean)
    .flatMap((slot) => {
      const [code, qty] = slot.split(":");
      return Array.from({ length: Math.min(3, Number(qty) || 1) }, (_, i) => (i ? `c${code}x${i + 1}` : `c${code}`));
    })
    .join(" ");
const searchKey = (id: string) => {
  const hex = id.replace(/-/g, "");
  if (/^[0-9a-f]{13}/i.test(hex)) return parseInt(hex.slice(0, 13), 16);
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
};
const searchRow = (id: string, name: string, user: string, identity: string, cards: string) => [`DELETE FROM deck_search WHERE rowid = ${searchKey(id)};`, `INSERT INTO deck_search (rowid, id, words, cards) VALUES (${searchKey(id)}, ${[id, words(name, user, identity), cardWords(cards)].map(quote).join(", ")});`];
const dropRow = (id: string) => [`DELETE FROM decklists WHERE id = ${quote(id)};`, `DELETE FROM deck_formats WHERE id = ${quote(id)};`, `DELETE FROM deck_search WHERE rowid = ${searchKey(id)};`];

function writeRow(r: Row) {
  return [
    ...searchRow(r.id, r.name, r.user, r.identity, r.cards),
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
      out.push(...(row ? writeRow(row) : dropRow(String(item.id))));
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
  d1Write(gone.flatMap(dropRow));
  console.log(`prune: ${alive.size} decklists on NetrunnerDB, ${gone.length} removed from the index`);
}

async function searchIndex() {
  if (meta("search-keys") !== "rowid") d1Write(["DELETE FROM deck_search;", "DELETE FROM index_meta WHERE k = 'search';", setMeta("search-keys", "rowid")]);
  if (meta("search") === "done") return;
  const after = Number(meta("search") ?? 0);
  const rows = d1(`SELECT rowid AS n, id, name, user, identity, cards FROM decklists WHERE rowid > ${after} ORDER BY rowid LIMIT ${SEARCH_ROWS_PER_RUN}`);
  const out = rows.flatMap((r) => searchRow(r.id, r.name, r.user, r.identity, r.cards));
  out.push(setMeta("search", rows.length < SEARCH_ROWS_PER_RUN ? "done" : String(rows.at(-1).n)));
  d1Write(out);
  console.log(`search: indexed ${rows.length} decklists`);
}

const day = (abr: string) => abr.replace(/\.$/, "").replace(/\./g, "-");
const legacyOf = (url: string) => Number(url.match(/decklist\/(\d+)/)?.[1]) || null;

async function tournaments() {
  const all: any[] = (await getJson(`${ABR}/tournaments?concluded=1`)) ?? [];
  const known = new Set(d1("SELECT id FROM tournaments").map((r) => Number(r.id)));
  const todo = all
    .filter((t) => !known.has(Number(t.id)) && day(String(t.date)) >= RESULTS_SINCE && Number(t.players_count) >= 4)
    .sort((a, b) => day(String(b.date)).localeCompare(day(String(a.date))))
    .slice(0, TOURNAMENTS_PER_RUN);
  let entries = 0;
  for (const t of todo) {
    const list: any[] = (await getJson(`${ABR}/entries?id=${t.id}`)) ?? [];
    const out = [`INSERT OR REPLACE INTO tournaments (id, title, date, format, players, top) VALUES (${Number(t.id)}, ${quote(String(t.title ?? "").slice(0, 120))}, ${quote(day(String(t.date)))}, ${quote(ABR_FORMATS[t.format] ?? String(t.format ?? "other"))}, ${Number(t.players_count) || list.length}, ${Number(t.top_count) || 0});`];
    for (const e of Array.isArray(list) ? list : []) {
      const swiss = Number(e.rank_swiss) || null;
      const cut = Number(e.rank_top) || null;
      const place = cut ?? swiss;
      if (!place) continue;
      const player = String(e.user_name ?? e.user_import_name ?? e.user_id ?? place).slice(0, 60);
      for (const side of ["corp", "runner"] as const) {
        const identity = String(e[`${side}_deck_identity_id`] ?? "");
        if (!identity) continue;
        const legacy = legacyOf(String(e[`${side}_deck_url`] ?? ""));
        out.push(`INSERT OR REPLACE INTO results (tournament, side, player, identity, swiss, cut, place, legacy, deck) VALUES (${Number(t.id)}, '${side}', ${quote(player)}, ${quote(identity)}, ${swiss ?? "NULL"}, ${cut ?? "NULL"}, ${place}, ${legacy ?? "NULL"}, (SELECT uuid FROM legacy_ids WHERE num = ${legacy ?? "NULL"}));`);
        entries++;
      }
    }
    d1Write(out);
  }
  console.log(`tournaments: ${todo.length} imported, ${entries} results`);
}

async function legacyIds() {
  const nums = d1(`SELECT DISTINCT legacy FROM results WHERE deck IS NULL AND legacy IS NOT NULL AND legacy NOT IN (SELECT num FROM legacy_ids) ORDER BY legacy DESC LIMIT ${LEGACY_PER_RUN}`).map((r) => Number(r.legacy));
  const out: string[] = [];
  for (const num of nums) {
    const json = await getJson(`${LEGACY_API}/${num}`);
    const uuid = json?.data?.[0]?.uuid;
    out.push(`INSERT OR REPLACE INTO legacy_ids (num, uuid) VALUES (${num}, ${uuid ? quote(String(uuid)) : "NULL"});`);
  }
  out.push("UPDATE results SET deck = (SELECT uuid FROM legacy_ids WHERE num = results.legacy) WHERE deck IS NULL AND legacy IN (SELECT num FROM legacy_ids WHERE uuid IS NOT NULL);");
  d1Write(out);
  console.log(`legacy: ${nums.length} NetrunnerDB decklist ids resolved`);
}

const month = (iso: string) => iso.slice(0, 7);

async function stats() {
  const decks = d1("SELECT d.id, d.side, d.identity, d.created, d.cards, (SELECT group_concat(f.format) FROM deck_formats f WHERE f.id = d.id) AS formats FROM decklists d");
  const results = d1("SELECT r.side, r.identity, r.place, r.deck, t.format, t.date, t.players FROM results r JOIN tournaments t ON t.id = r.tournament");
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1)).toISOString().slice(0, 7));
  const out: string[] = [];
  for (const format of ["casual", ...LEGAL_FORMATS]) {
    const inFormat = decks.filter((d) => format === "casual" || String(d.formats ?? "").split(",").includes(format));
    const deckIds = new Set(inFormat.map((d) => String(d.id)));
    const played = results.filter((r) => (format === "casual" ? true : r.format === format || (r.deck && deckIds.has(String(r.deck)))));
    for (const side of ["corp", "runner"]) {
      const ids = new Map<string, { identity: string; decks: number; recent: number; results: number; wins: number; best: number | null }>();
      const entry = (identity: string) => ids.get(identity) ?? ids.set(identity, { identity, decks: 0, recent: 0, results: 0, wins: 0, best: null }).get(identity)!;
      const recent = months[0];
      for (const d of inFormat) if (d.side === side) {
        const e = entry(String(d.identity));
        e.decks++;
        if (month(String(d.created)) >= recent) e.recent++;
      }
      for (const r of played) if (r.side === side && byCode.get(String(r.identity))) {
        const e = entry(String(r.identity));
        e.results++;
        if (Number(r.place) === 1) e.wins++;
        e.best = e.best == null ? Number(r.place) : Math.min(e.best, Number(r.place));
      }
      const list = [...ids.values()].filter((e) => byCode.get(e.identity)).sort((a, b) => b.results + b.recent - (a.results + a.recent) || b.decks - a.decks);
      out.push(`INSERT OR REPLACE INTO stats (k, v) VALUES (${quote(`identities:${format}:${side}`)}, ${quote(JSON.stringify(list))});`);
      const share = list.slice(0, 16).map((e) => ({
        identity: e.identity,
        decks: months.map((m) => inFormat.filter((d) => d.side === side && String(d.identity) === e.identity && month(String(d.created)) === m).length),
        results: months.map((m) => played.filter((r) => r.side === side && String(r.identity) === e.identity && month(String(r.date)) === m).length),
      }));
      const totals = {
        decks: months.map((m) => inFormat.filter((d) => d.side === side && month(String(d.created)) === m).length),
        results: months.map((m) => played.filter((r) => r.side === side && month(String(r.date)) === m).length),
      };
      out.push(`INSERT OR REPLACE INTO stats (k, v) VALUES (${quote(`meta:${format}:${side}`)}, ${quote(JSON.stringify({ months, totals, rows: share }))});`);
    }
    const byIdentity = new Map<string, any[]>();
    for (const d of inFormat) (byIdentity.get(String(d.identity)) ?? byIdentity.set(String(d.identity), []).get(String(d.identity))!).push(d);
    for (const [identity, list] of byIdentity) {
      if (list.length < 3) continue;
      const counts = new Map<string, { n: number; qty: number }>();
      for (const d of list)
        for (const slot of String(d.cards).split(",").filter(Boolean)) {
          const [code, qty] = slot.split(":");
          const c = counts.get(code) ?? counts.set(code, { n: 0, qty: 0 }).get(code)!;
          c.n++;
          c.qty += Number(qty) || 1;
        }
      const cards = [...counts.entries()]
        .sort((a, b) => b[1].n - a[1].n)
        .slice(0, 45)
        .map(([code, c]) => [code, Math.round((100 * c.n) / list.length), Math.round((10 * c.qty) / c.n) / 10]);
      out.push(`INSERT OR REPLACE INTO stats (k, v) VALUES (${quote(`identity:${format}:${identity}`)}, ${quote(JSON.stringify({ decks: list.length, cards }))});`);
    }
  }
  out.push(setMeta("stats", new Date().toISOString()));
  d1Write(out);
  console.log(`stats: ${out.length} rows from ${decks.length} decklists and ${results.length} results`);
}

if (mode === "prune") await prune();
else if (mode === "results") {
  await searchIndex();
  await tournaments();
  await legacyIds();
  await stats();
} else {
  await reformat();
  await update();
  await backfill();
  await searchIndex();
  await tournaments();
  await legacyIds();
  await stats();
}
console.log(`${requests} NetrunnerDB requests`);
