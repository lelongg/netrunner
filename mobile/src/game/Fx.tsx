import { useEffect, useRef, useState } from "preact/hooks";
import type { CardDb } from "../engine";
import { CardImage } from "./CardImage";
import { glyphs } from "./Glyphs";
import { iconize } from "./text";

type ChipKind = "sub" | "break" | "damage" | "tag" | "rez" | "play" | "advance" | "trash" | "purge";

interface Chip {
  id: number;
  kind: ChipKind;
  text: string;
}

interface Burst {
  id: number;
  kind: "score" | "steal";
  title: string;
  sub: string;
}

interface Reveal {
  id: number;
  code: string;
  title: string;
}

interface Flash {
  id: number;
  kind: "damage" | "core" | "tag";
}

interface Effect {
  chip?: Omit<Chip, "id">;
  burst?: Omit<Burst, "id">;
  reveal?: string;
  flash?: Flash["kind"];
}

const CHIP_LABEL: Record<ChipKind, string> = {
  sub: "Subroutine",
  break: "Broken",
  damage: "Damage",
  tag: "Tagged",
  rez: "Rez",
  play: "Played",
  advance: "Advance",
  trash: "Trashed",
  purge: "Purge",
};

const MAX_BATCH = 14;
const CHIP_MS = 2600;

function classify(text: string, ice: Set<string>, opponent: string): Effect[] {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^(.+?) steals (.+?) and gains (\d+) agenda points?/i))) return [{ burst: { kind: "steal", title: "Stolen", sub: `${m[2]} // +${m[3]} pts` } }];
  if ((m = text.match(/^(.+?) scores (.+?) and gains (\d+) agenda points?/i))) return [{ burst: { kind: "score", title: "Scored", sub: `${m[2]} // +${m[3]} pts` } }];
  if ((m = text.match(/trashes (.+?) due to (net|meat|core|brain) damage/i))) {
    const core = /core|brain/i.test(m[2]);
    return [{ chip: { kind: "damage", text: `${m[2]} damage · ${m[1]}` }, flash: core ? "core" : "damage" }];
  }
  if ((m = text.match(/(?:gives? the runner|takes?) (\d+) tags?/i))) return [{ chip: { kind: "tag", text: `+${m[1]} tag` }, flash: "tag" }];
  if ((m = text.match(/\bbreak (.*?)subroutines? on (.+?)(?: \(|\.?$)/i))) {
    const sub = text.match(/\("\[subroutine\] (.+?)"\)/i)?.[1];
    const breaker = text.match(/use (.+?) to break/i)?.[1] ?? text.match(/strength of (.+?) to \d+/i)?.[1];
    return [{ chip: { kind: "break", text: [breaker, m[2].trim(), sub].filter(Boolean).join(" · ") } }];
  }
  if ((m = text.match(/^.+? uses (.+?) to (.+?)\.?$/i)) && ice.has(m[1]) && !/\brez\b/i.test(m[2])) return [{ chip: { kind: "sub", text: `${m[1]} · ${m[2]}` } }];
  if ((m = text.match(/\brez (.+?)(?: protecting| in (?:the root of )?| at no cost|\.$|$)/i))) return [{ chip: { kind: "rez", text: m[1] } }];
  if ((m = text.match(/to play (.+?)\.?$/i))) return [{ chip: { kind: "play", text: m[1] }, reveal: text.startsWith(opponent) ? m[1] : undefined }];
  if ((m = text.match(/advancement counters? on (.+?)\.?$/i)) || (m = text.match(/to advance (.+?)\.?$/i))) return [{ chip: { kind: "advance", text: m[1].replace(/^an? (?:card|installed card) in /i, "") } }];
  if (/purges? virus counters/i.test(text)) return [{ chip: { kind: "purge", text: "Virus counters purged" } }];
  if ((m = text.match(/\btrash(?:es)? (.+?)(?: at no cost| from | for |\.?$)/i)) && !/\binstall/i.test(text)) return [{ chip: { kind: "trash", text: m[1] } }];
  return [];
}

function iceTitles(view: any): Set<string> {
  const out = new Set<string>();
  for (const server of Object.values<any>(view.corp?.servers ?? {})) for (const c of server?.ices ?? []) if (c?.title) out.add(c.title);
  return out;
}

interface Marks {
  rezzed: boolean;
  adv: number;
  fired: number;
  broken: number;
}

function boardMarks(view: any): Map<unknown, Marks> {
  const out = new Map<unknown, Marks>();
  const add = (c: any) => {
    if (!c?.cid) return;
    const subs: any[] = c.subroutines ?? [];
    out.set(c.cid, {
      rezzed: !!c.rezzed,
      adv: (c["advance-counter"] ?? 0) + (c["extra-advance-counter"] ?? 0),
      fired: subs.filter((s) => s.fired).length,
      broken: subs.filter((s) => s.broken).length,
    });
  };
  for (const server of Object.values<any>(view.corp?.servers ?? {})) {
    for (const c of server?.ices ?? []) add(c);
    for (const c of server?.content ?? []) add(c);
  }
  return out;
}

function pulse(cid: unknown, cls: string) {
  const el = document.querySelector(`[data-cid="${String(cid)}"]`)?.closest(".tile-wrap") as HTMLElement | null;
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 1100);
}

function shake() {
  const el = document.querySelector(".playfield") as HTMLElement | null;
  if (!el?.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.animate(
    [
      { transform: "translate(0, 0)" },
      { transform: "translate(-7px, 2px)" },
      { transform: "translate(6px, -3px)" },
      { transform: "translate(-4px, 1px)" },
      { transform: "translate(3px, 0)" },
      { transform: "translate(0, 0)" },
    ],
    { duration: 380, easing: "ease-out" },
  );
}

const SPARKS = Array.from({ length: 22 }, (_, i) => {
  const angle = (i / 22) * Math.PI * 2 + (i % 3) * 0.2;
  const dist = 90 + ((i * 37) % 70);
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.7, d: (i % 5) * 40 };
});

export function EventFx({ view, render, db, opponent }: { view: any; render: (m: unknown) => string; db: CardDb; opponent: string }) {
  const [chips, setChips] = useState<Chip[]>([]);
  const [burst, setBurst] = useState<Burst | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const seen = useRef<number | null>(null);
  const marks = useRef<Map<unknown, Marks> | null>(null);
  const next = useRef(1);
  const log: any[] = view.log ?? [];

  useEffect(() => {
    const from = seen.current;
    seen.current = log.length;
    if (from === null || log.length <= from || log.length - from > MAX_BATCH) return;
    const ice = iceTitles(view);
    const effects = log
      .slice(from)
      .filter((e) => e.user === "__system__")
      .flatMap((e) => classify(render(e.text), ice, opponent));
    const newChips: Chip[] = [];
    for (const fx of effects) {
      if (fx.chip) newChips.push({ id: next.current++, ...fx.chip });
      if (fx.burst) {
        setBurst({ id: next.current++, ...fx.burst });
        navigator.vibrate?.([40, 40, 40, 40, 120]);
      }
      if (fx.reveal) {
        const code = db.byTitle.get(fx.reveal)?.code;
        if (code) setReveal({ id: next.current++, code, title: fx.reveal });
      }
      if (fx.flash) {
        setFlash({ id: next.current++, kind: fx.flash });
        navigator.vibrate?.(fx.flash === "tag" ? [30, 50, 30] : [90, 40, 60]);
        if (fx.flash !== "tag") shake();
      }
    }
    if (newChips.length) setChips((prev) => [...prev, ...newChips].slice(-4));
  }, [log.length]);

  useEffect(() => {
    const now = boardMarks(view);
    const before = marks.current;
    marks.current = now;
    if (!before) return;
    for (const [cid, m] of now) {
      const b = before.get(cid);
      if (!b) continue;
      if (m.rezzed && !b.rezzed) pulse(cid, "fx-rez");
      if (m.adv > b.adv) pulse(cid, "fx-advance");
      if (m.broken > b.broken) pulse(cid, "fx-break");
      if (m.fired > b.fired) pulse(cid, "fx-fire");
    }
  });

  useEffect(() => {
    if (!chips.length) return;
    const t = setTimeout(() => setChips((prev) => prev.slice(1)), CHIP_MS);
    return () => clearTimeout(t);
  }, [chips]);

  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(null), 2000);
    return () => clearTimeout(t);
  }, [burst?.id]);

  useEffect(() => {
    if (!reveal) return;
    const t = setTimeout(() => setReveal(null), 1700);
    return () => clearTimeout(t);
  }, [reveal?.id]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [flash?.id]);

  return (
    <>
      {chips.length > 0 && (
        <div class="fx-chips" aria-live="polite">
          {chips.map((c, i) => (
            <div key={c.id} class={`fx-chip chip-${c.kind}`} style={`animation-delay: ${i * 60}ms`}>
              <span class="fx-chip-label">{CHIP_LABEL[c.kind]}</span>
              <span class="fx-chip-text">{glyphs(iconize(c.text))}</span>
            </div>
          ))}
        </div>
      )}
      {flash && <div key={flash.id} class={`screen-fx flash-${flash.kind}`} aria-hidden="true">{flash.kind === "tag" && <i class="reticle" />}</div>}
      {reveal && (
        <div key={reveal.id} class="fx-reveal" aria-hidden="true">
          <CardImage code={reveal.code} alt={reveal.title} size="large" />
        </div>
      )}
      {burst && (
        <div key={burst.id} class={`run-fx fx-${burst.kind}`} aria-live="polite">
          <div class="fx-sparks" aria-hidden="true">
            {SPARKS.map((s) => (
              <i style={`--x: ${s.x}px; --y: ${s.y}px; animation-delay: ${s.d}ms`} />
            ))}
          </div>
          <div class="fx-band">
            <span class="fx-title" data-text={burst.title}>
              {burst.title}
            </span>
            <span class="fx-sub">{burst.sub}</span>
          </div>
        </div>
      )}
    </>
  );
}
