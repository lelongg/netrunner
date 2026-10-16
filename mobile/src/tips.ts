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
let timer: number | undefined;

function hide() {
  clearTimeout(timer);
  const el = current;
  current = null;
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
  animate(el, { opacity: [0, 1], transform: [`translateY(${above ? 6 : -6}px) scale(0.92)`, "translateY(0px) scale(1)"] }, { duration: 0.22, ease: [0.2, 1.3, 0.4, 1] });
  timer = window.setTimeout(hide, 3200);
}

export function installTips() {
  document.addEventListener("click", (e) => {
    const target = e.target as Element | null;
    const hit = target && keyOf(target);
    if (!hit) return hide();
    show(MEANINGS[hit.key] ?? hit.key, hit.anchor);
  });
  addEventListener("scroll", hide, { capture: true, passive: true });
}
