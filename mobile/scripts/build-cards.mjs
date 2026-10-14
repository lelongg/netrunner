import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseEDNString } from "edn-data";

const REPO = process.env.CARDS_REPO ?? "NoahTheDuke/netrunner-data";
const BRANCH = process.env.CARDS_BRANCH ?? "master";
const OUT = new URL("../public/data/", import.meta.url);

const source = process.argv[2];
const text = source
  ? await readFile(source, "utf8")
  : await (await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/edn/raw_data.edn`)).text();

const data = parseEDNString(text, { mapAs: "object", keywordAs: "string", listAs: "array" });

const keep = ({ "previous-versions": _pv, flavor, ...card }) => card;
const cards = data.cards.map(keep);

await mkdir(OUT, { recursive: true });
await writeFile(new URL("cards.json", OUT), JSON.stringify(cards));
await writeFile(
  new URL("meta.json", OUT),
  JSON.stringify({ sets: data.sets, cycles: data.cycles, formats: data.formats, mwls: data.mwls }),
);
console.log(`${cards.length} cards written`);
