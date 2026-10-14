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

await mkdir(OUT, { recursive: true });
await writeFile(new URL("cards.json", OUT), JSON.stringify(cards));
await writeFile(new URL("codes.json", OUT), JSON.stringify(codes));
console.log(`${cards.length} cards, ${Object.keys(codes).length} printings written`);

for (const lang of LANGS) {
  const dir = new URL(`${lang}/`, I18N_OUT);
  await mkdir(dir, { recursive: true });
  for (const file of ["messages.ftl", "ui.ftl"]) {
    await copyFile(new URL(`${lang}/${file}`, I18N_SRC), new URL(file, dir));
  }
}
console.log(`i18n copied: ${LANGS.join(", ")}`);
