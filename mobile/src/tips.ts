import { settings } from "./settings";
import { animate } from "motion";

const MEANINGS: Record<string, string> = {
  click: "Click · one action. The Corp gets 3 per turn, the Runner 4.",
  credit: "Credit · the game's currency.",
  mu: "Memory units · programs installed / memory available.",
  link: "Link · added to the Runner's strength against traces.",
  core: "Core damage · each point trashes a random card from the grip and lowers the maximum hand size by 1 for good.",
  sub: "Subroutine · an effect of the ice that fires unless the Runner breaks it.",
  trash: "Trash · the cost or ability to trash this card.",
  recurring: "Recurring credits · refilled each turn, usable only as the card says.",
  agenda: "Agenda points · 7 wins the game.",
  rez: "Rez cost · credits the Corp pays to turn the card face up.",
  strength: "Strength · an icebreaker needs at least the ice's strength to break it.",
  tag: "Tags · while tagged, the Corp can trash a resource for 1 click and 2 credits. The Runner removes a tag for 1 click and 2 credits.",
  "bad-pub": "Bad publicity · during each run, the Runner gets 1 credit per bad publicity to spend on that run.",
  hand: "Cards in hand.",
  power: "Power counters.",
  advance: "Advancement counters.",
  virus: "Virus counters.",
};

const GLOSSARY: [string, string, string][] = [
  ["trace", "trace", "Trace X · the Corp spends credits on top of X to set the trace strength, then the Runner spends credits on top of their link. The trace succeeds only if the trace strength is higher."],
  ["expose", "expose", "Expose · reveal an installed, unrezzed card. It stays where it is, face down."],
  ["bypass", "bypass", "Bypass · the encounter stops at once and the Runner passes the ice: its subroutines are neither broken nor resolved."],
  ["derez", "derez(?:zed|s)?", "Derez · a rezzed card is turned face down. The Corp must rez it again, paying its rez cost, for it to work."],
  ["rez", "rez(?:zed|zing|s)?", "Rez · the Corp pays a card's rez cost to turn it face up and make it active."],
  ["forfeit", "forfeit(?:ed|s)?", "Forfeit · an agenda moves from a score area out of the game. Its points no longer count."],
  ["host", "host(?:ed|s|ing)?", "Host · a card or counter placed on another card. When the host leaves play, what it hosts is trashed."],
  ["purge", "purge(?:d|s)?", "Purge · remove every virus counter. The Corp can do it as a 3-click action or with a card ability."],
  ["sabotage", "sabotage", "Sabotage X · the Corp trashes X cards in total, choosing some from HQ and the rest from the top of R&D."],
  ["threat", "threat", "Threat X · this ability is active only while the highest score of any player is at least X."],
  ["advance", "advance(?:d|s|ment)?(?: counters?)?", "Advance · place an advancement counter on a card, usually with the Corp's 1 click and 1 credit action. Agendas need enough of them to be scored."],
  ["access", "access(?:ed|es|ing)?", "Access · the Corp shows a card to the Runner. An accessed agenda is stolen; other cards can be trashed by paying their trash cost."],
  ["breach", "breach(?:ed|es)?", "Breach · the Runner accesses the cards of a server, usually at the end of a successful run."],
  ["encounter", "encounter(?:ed|s|ing)?", "Encounter · the Runner faces a rezzed ice and may break its subroutines. The unbroken ones then resolve."],
  ["steal", "steal(?:s|ing)?|stolen", "Steal · an agenda the Runner accesses goes to their score area for its points."],
  ["net", "net damage", "Net damage · one random card is trashed from the grip per point. Taking more than the grip holds flatlines the Runner."],
  ["meat", "meat damage", "Meat damage · resolved like net damage: one random card trashed from the grip per point."],
  ["core", "core damage|brain damage", "Core damage · one random card trashed from the grip per point, and the Runner's maximum hand size drops by 1 for good."],
  ["bad-pub", "bad publicity", "Bad publicity · during each run, the Runner gets 1 credit per bad publicity to spend on that run."],
  ["tag", "tag(?:ged|s)?", "Tags · while tagged, the Corp can trash a resource for 1 click and 2 credits. The Runner removes a tag for 1 click and 2 credits."],
  ["mark", "your mark|mark", "Mark · when told to identify their mark, the Runner picks a central server at random, unless one is already the mark. It stays the mark until the end of the turn."],
  ["charge", "charge", "Charge · place 1 power counter on a card that already has at least 1."],
  ["interface", "interface", "Interface · an icebreaker ability, used on ice whose strength the breaker matches, to break subroutines."],
  ["trash-cost", "trash cost", "Trash cost · what the Runner pays to trash a card they access."],
  ["recurring", "recurring credits?", "Recurring credits · placed on the card again each turn, usable only as the card says."],
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
  if (tagged?.classList.contains("term") && !settings.glossary) return null;
  if (tagged) return { key: tagged.dataset.tip!, anchor: tagged };
  const icon = target.closest(".sym, .icon");
  if (!icon || icon.closest("button") || !icon.closest(ZONES)) return null;
  const name = [...icon.classList].map((c) => c.match(/^(?:sym|icon)-(.+)$/)?.[1]).find(Boolean);
  return name && MEANINGS[name] ? { key: name, anchor: icon } : null;
}

let current: HTMLElement | null = null;
let currentAnchor: Element | null = null;

function hide() {
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
}

export function installTips() {
  document.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    const hit = target && keyOf(target);
    if (current) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (hit && hit.anchor !== currentAnchor) show(MEANINGS[hit.key] ?? hit.key, hit.anchor);
      else hide();
      return;
    }
    if (hit) show(MEANINGS[hit.key] ?? hit.key, hit.anchor);
  }, true);
  addEventListener("scroll", hide, { capture: true, passive: true });
}
