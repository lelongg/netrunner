import { animate } from "motion";

const MEANINGS: Record<string, string> = {
  click: "Click · one action. The Corp gets 3 per turn, the Runner 4.",
  credit: "Credit · the game's currency.",
  mu: "Memory units · programs installed / memory available.",
  link: "Link · added to the Runner's strength against traces.",
  core: "Core damage · each point lowers the Runner's maximum hand size by 1.",
  sub: "Subroutine · an effect of the ice that fires unless the Runner breaks it.",
  trash: "Trash · the cost or ability to trash this card.",
  recurring: "Recurring credits · refilled each turn, usable only as the card says.",
  agenda: "Agenda points · 7 wins the game.",
  rez: "Rez cost · credits the Corp pays to turn the card face up.",
  strength: "Strength · an icebreaker needs at least the ice's strength to break it.",
  tag: "Tags · while tagged, the Corp can trash the Runner's resources and more. Removing one costs a click and 2 credits.",
  "bad-pub": "Bad publicity · the Runner gains 1 credit per point at the start of each run.",
  hand: "Cards in hand.",
  power: "Power counters.",
  advance: "Advancement counters.",
  virus: "Virus counters.",
};

const GLOSSARY: [string, string, string][] = [
  ["trace", "trace", "Trace X · the Corp pays credits to raise the trace strength above X, the Runner pays to raise their link. If the Corp ends higher, the effect happens."],
  ["expose", "expose", "Expose · the Runner looks at an installed facedown card, then it stays as it is."],
  ["bypass", "bypass", "Bypass · the Runner passes the ice without encountering it, so none of its subroutines fire."],
  ["derez", "derez(?:zed|s)?", "Derez · a rezzed Corp card is turned face down. Its effects stop until the Corp rezzes it again, paying its cost."],
  ["rez", "rez(?:zed|zing|s)?", "Rez · the Corp pays a card's rez cost to turn it face up and make it active."],
  ["forfeit", "forfeit(?:ed|s)?", "Forfeit · a scored or stolen agenda is removed from the game and its points are lost."],
  ["host", "host(?:ed|s|ing)?", "Host · a card placed on another card. If the host leaves play, the hosted cards are trashed."],
  ["purge", "purge(?:d|s)?", "Purge · the Corp spends 3 clicks to remove every virus counter."],
  ["sabotage", "sabotage", "Sabotage X · the Corp trashes X cards, from HQ and/or the top of R&D."],
  ["threat", "threat", "Threat X · this ability is active only while a player has at least X agenda points."],
  ["advance", "advance(?:d|s|ment)?(?: counters?)?", "Advance · the Corp pays a click and a credit to place an advancement counter. Agendas need enough of them to be scored."],
  ["access", "access(?:ed|es|ing)?", "Access · the Runner looks at a card during a breach. Agendas are stolen; other cards can be trashed by paying their trash cost."],
  ["breach", "breach(?:ed|es)?", "Breach · after a successful run, the Runner accesses cards in the server."],
  ["encounter", "encounter(?:ed|s|ing)?", "Encounter · the Runner faces a rezzed ice. Unbroken subroutines fire."],
  ["steal", "steal(?:s|ing)?|stolen", "Steal · an agenda the Runner accesses goes to their score area for its points."],
  ["net", "net damage", "Net damage · the Runner discards a random card from the grip per point. Taking more than the grip holds flatlines them."],
  ["meat", "meat damage", "Meat damage · like net damage, a random card from the grip per point. Often dealt to tagged Runners."],
  ["core", "core damage|brain damage", "Core damage · a random card from the grip per point, and the maximum hand size drops by 1 for good."],
  ["bad-pub", "bad publicity", "Bad publicity · the Runner gains 1 credit per point at the start of each run."],
  ["tag", "tag(?:ged|s)?", "Tags · while tagged, the Corp can trash the Runner's resources and more. Removing one costs a click and 2 credits."],
  ["trojan", "trojan", "Trojan · a program installed on a piece of ice instead of in the rig."],
  ["mark", "your mark|mark", "Mark · a central server chosen at random at the start of the Runner's turn, used by some cards."],
  ["charge", "charge", "Charge · place 1 power counter on an installed card that already has power counters."],
  ["expend", "expend", "Expend · the Corp reveals and trashes this card from HQ, paying the cost, to resolve its effect."],
  ["interface", "interface", "Interface · an icebreaker ability used during an encounter to break subroutines."],
  ["trash-cost", "trash cost", "Trash cost · what the Runner pays to trash a card they access."],
  ["recurring", "recurring credits?", "Recurring credits · refilled each turn, usable only as the card says."],
];

for (const [key, , text] of GLOSSARY) MEANINGS[key] ??= text;

export const TERMS = new RegExp(`\\b(${[...GLOSSARY].sort((a, b) => b[1].length - a[1].length).map(([, re]) => `(?:${re})`).join("|")})\\b`, "gi");

export function termKey(word: string): string | undefined {
  const lower = word.toLowerCase();
  return GLOSSARY.find(([, re]) => new RegExp(`^(?:${re})$`, "i").test(lower))?.[0];
}

const ZONES = ".sheet, .log, .encounter, .prompt, .opp, .me-bar, .fact-chips";

function keyOf(target: Element): { key: string; anchor: Element } | null {
  const tagged = target.closest<HTMLElement>("[data-tip]");
  if (tagged) return { key: tagged.dataset.tip!, anchor: tagged };
  const icon = target.closest(".sym, .icon");
  if (!icon || icon.closest("button") || !icon.closest(ZONES)) return null;
  const name = [...icon.classList].map((c) => c.match(/^(?:sym|icon)-(.+)$/)?.[1]).find(Boolean);
  return name && MEANINGS[name] ? { key: name, anchor: icon } : null;
}

let current: HTMLElement | null = null;
let currentAnchor: Element | null = null;
let timer: number | undefined;

function hide() {
  clearTimeout(timer);
  const el = current;
  current = null;
  currentAnchor = null;
  if (!el) return;
  animate(el, { opacity: [1, 0] }, { duration: 0.15 }).finished.then(() => el.remove(), () => el.remove());
}

function show(text: string, anchor: Element) {
  hide();
  const el = document.createElement("div");
  el.className = "tip";
  el.setAttribute("role", "tooltip");
  el.textContent = text;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  const above = r.top - h - 8 > 8;
  el.style.left = `${left}px`;
  el.style.top = `${above ? r.top - h - 8 : r.bottom + 8}px`;
  current = el;
  currentAnchor = anchor;
  animate(el, { opacity: [0, 1], transform: [`translateY(${above ? 6 : -6}px) scale(0.92)`, "translateY(0px) scale(1)"] }, { duration: 0.22, ease: [0.2, 1.3, 0.4, 1] });
  timer = window.setTimeout(hide, 3200);
}

export function installTips() {
  document.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    const hit = target && keyOf(target);
    if (!hit || hit.anchor === currentAnchor) return hide();
    show(MEANINGS[hit.key] ?? hit.key, hit.anchor);
  }, true);
  addEventListener("scroll", hide, { capture: true, passive: true });
}
