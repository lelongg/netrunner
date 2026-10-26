import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { parseEDNString } from "edn-data";

const REPO = process.env.CARDS_REPO ?? "NoahTheDuke/netrunner-data";
const BRANCH = process.env.CARDS_BRANCH ?? "master";
const OUT = new URL("../public/data/", import.meta.url);
const I18N_SRC = new URL("../../resources/public/i18n/", import.meta.url);
const I18N_OUT = new URL("../public/i18n/", import.meta.url);
const LANGS = ["en", "fr"];

const source = process.argv[2];
const text = source
  ? await readFile(source, "utf8")
  : await (await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/edn/raw_data.edn`)).text();

const data = parseEDNString(text, { mapAs: "object", keywordAs: "string", listAs: "array" });

const codes = {};
const cards = data.cards.map(({ "previous-versions": previous = [], flavor, ...card }) => {
  codes[card.code] = card.title;
  for (const { code } of previous) codes[code] = card.title;
  return card;
});

const NRDB = "https://api.netrunnerdb.com/api/v3/public";
const nrdb = async (path) => {
  const res = await fetch(`${NRDB}/${path}`, { headers: { "User-Agent": "PocketRig/1.0 (+https://github.com/lelongg/netrunner)" } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return (await res.json()).data;
};

for (const card of cards.filter((c) => c.type === "Identity" && c.faces?.length)) {
  try {
    const faces = (await nrdb(`printings/${card.code}`)).attributes.faces ?? [];
    card["face-texts"] = faces.map((f) => ({ title: f.title ?? card.title, text: f.text ?? "" }));
  } catch (e) {
    console.warn(`faces of ${card.title} unavailable: ${e.message}`);
  }
}

await mkdir(OUT, { recursive: true });
await writeFile(new URL("cards.json", OUT), JSON.stringify(cards));
await writeFile(new URL("codes.json", OUT), JSON.stringify(codes));
console.log(`${cards.length} cards, ${Object.keys(codes).length} printings written`);
const FORMAT_KEYS = { standard: "standard", startup: "startup", core: "core", system_gateway: "system-gateway", eternal: "eternal" };
const pools = {};
try {
  const cycles = new Map((await nrdb("card_cycles?page[size]=200")).map((c) => [c.id, c.attributes]));
  for (const format of await nrdb("formats")) {
    const key = FORMAT_KEYS[format.id];
    const snapshotId = format.attributes.active_snapshot_id;
    if (!key || !snapshotId) continue;
    const snapshot = (await nrdb(`snapshots/${snapshotId}`)).attributes;
    const pool = (await nrdb(`card_pools/${snapshot.card_pool_id}`)).attributes;
    const ids = pool.card_cycle_ids ?? [];
    pools[key] = {
      since: snapshot.date_start,
      cycles: ids
        .map((id) => ({ name: cycles.get(id)?.name ?? id, released: cycles.get(id)?.date_release ?? "" }))
        .sort((a, b) => a.released.localeCompare(b.released))
        .map((c) => c.name),
    };
  }
  console.log(`format pools: ${Object.entries(pools).map(([k, v]) => `${k} (${v.cycles.length})`).join(", ")}`);
} catch (e) {
  console.warn(`format pools unavailable: ${e.message}`);
}
await writeFile(new URL("formats.json", OUT), JSON.stringify(pools));
await copyFile(new URL("../i18n/cards.fr.json", import.meta.url), new URL("cards.fr.json", OUT));

for (const lang of LANGS) {
  const dir = new URL(`${lang}/`, I18N_OUT);
  await mkdir(dir, { recursive: true });
  for (const file of ["messages.ftl", "ui.ftl"]) {
    await copyFile(new URL(`${lang}/${file}`, I18N_SRC), new URL(file, dir));
  }
}
console.log(`i18n copied: ${LANGS.join(", ")}`);
