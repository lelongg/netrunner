import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { type CardDb, type EngineApi, type Side, cardImage } from "../engine";
import type { Session } from "../session";
import { Cta, Meter, Ticker, ask, tell } from "../ui";
import { useFx, iceKind, quietUntil } from "../fx/director";
import { Count, useLoop } from "../fx/ui";
import { animate } from "../fx/core";
import { type BreakPlan, type Command, breakStep, cardRef, pendingChoice, awaitingMove, basicCommands, currentIce, findCard, otherSide, promptOf, runCommands, siblingsOf } from "./actions";
import { DeckView } from "../screens/Decks";
import { deckFormat } from "../deckrules";
import { CardSheet } from "./CardSheet";
import { CardTile } from "./CardTile";
import CursorGrid from "./CursorGrid";
import { setMood } from "../music";
import { PromptPanel } from "./PromptPanel";
import { useBackClose } from "../back";
import { PHASE_LABELS, byServerOrder, iconize, serverLabel, serverName } from "./text";
import { Icon, type IconName } from "../icons";
import { glyphs } from "./Glyphs";
import { Breakers } from "./Breakers";
import { Coach } from "./Coach";
import { type Prober, Verified, useChecked, useVerified } from "./legal";
import { CardImage, ZoomableCardImage } from "./CardImage";
import { withTerms } from "./RichText";
import { motionOff, setSetting, settings } from "../settings";
import { uiSound } from "../uisound";
import { MenuDrawer, MenuItem, MenuSection, MenuTile, SettingsSections } from "../screens/SettingsMenu";

interface Props {
  session: Session;
  engine: EngineApi;
  db: CardDb;
  side: Side;
  view: any;
  onSwitchSide?: () => void;
  onLeave: () => void;
  onExit: () => void;
  onWatch?: () => void;
  handoffLog?: number;
  controls?: preact.ComponentChildren;
  quiet?: boolean;
}

interface ClickMark {
  log: number;
  decks: [number, number];
}

const clickMarks = new WeakMap<Session, Map<string, ClickMark>>();
const UNDO = /undo-click/i;
function Waiting({ name, lastAct }: { name: string; lastAct?: number }) {
  const shown = useRef(Date.now());
  const since = lastAct ?? shown.current;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const elapsed = s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${Math.floor(s / 60)}:${pad(s % 60)}`;
  return (
    <span class="status waiting">
      <span>Waiting for {name}…</span>
      <time>{elapsed}</time>
    </span>
  );
}

const AUTO_FIRE_MS = 260;

function autoTarget(steps: { command: string; args?: any }[]): HTMLElement | null {
  const last = steps[steps.length - 1];
  if (last.command === "select") return document.querySelector(".select-go");
  if (last.command !== "choice") return document.querySelector(`[data-cmd="${last.command}"]`);
  const uuid = last.args?.choice?.uuid;
  return uuid ? document.querySelector(`[data-choice="${uuid}"]`) ?? document.querySelector(".select-go") : document.querySelector(".number-picker .submit");
}

const FORCED = new Set(["start-turn", "unbroken-subroutines", "end-phase-12", "phase-12-pass-priority", "continue", "start-next-phase", "end-turn", "end-post-discard", "post-discard-pass-priority"]);
const REVEALING = /\b(draws?|accesses|reveals?|looks? at|search(es)?|mills?|to make a run|breach(es)?|trash(es)? the top)\b/i;

function undoAllowed(session: Session, view: any, side: Side, render: (m: unknown) => string, handoffLog = 0) {
  const active = view["active-player"] as Side;
  const clicks = Number(view[active]?.click ?? 0);
  const log: any[] = view.log ?? [];
  const decks: [number, number] = [Number(view.corp?.["deck-count"] ?? 0), Number(view.runner?.["deck-count"] ?? 0)];
  let marks = clickMarks.get(session);
  if (!marks) clickMarks.set(session, (marks = new Map()));
  const key = (c: number) => `${view.turn}:${active}:${c}`;
  if (!view.run) {
    for (let c = clicks - 1; c >= 0; c--) marks.delete(key(c));
    const existing = marks.get(key(clicks));
    if (!existing || log.slice(existing.log).some((e) => UNDO.test(render(e.text)))) marks.set(key(clicks), { log: log.length, decks });
  }
  if (side !== active || view.winner || view.run) return false;
  const mark = marks.get(key(clicks + 1));
  if (!mark || mark.decks[0] !== decks[0] || mark.decks[1] !== decks[1] || handoffLog > mark.log) return false;
  return !log.slice(mark.log).some((e) => {
    const text = render(e.text);
    return (e.text?.side && e.text.side !== active) || REVEALING.test(text) || UNDO.test(text);
  });
}

function serverOrder(servers: Record<string, any>) {
  const remotes = Object.keys(servers)
    .filter((k) => k.startsWith("remote"))
    .sort((a, b) => Number(a.slice(6)) - Number(b.slice(6)));
  return ["hq", "rd", "archives", ...remotes];
}

function Stat({ icon, label, children }: { icon: IconName; label: string; children: ComponentChildren }) {
  return (
    <span class="stat" data-tip={icon} aria-label={`${label} ${children}`}>
      <Icon name={icon} />
      {children}
    </span>
  );
}

function extras(p: any, side: Side) {
  const out = [];
  if (side === "runner") {
    if (p.memory)
      out.push(
        <Stat icon="mu" label="Memory">
          {`${p.memory.used ?? 0}/${p.memory.available ?? 0}`}
        </Stat>,
      );
    out.push(
      <Stat icon="tag" label="Tags">
        {p.tag?.total ?? 0}
      </Stat>,
    );
    if (p.link)
      out.push(
        <Stat icon="link" label="Link">
          {p.link}
        </Stat>,
      );
    if (p["brain-damage"])
      out.push(
        <Stat icon="core" label="Core damage">
          {p["brain-damage"]}
        </Stat>,
      );
  } else {
    const bp = (p["bad-publicity"]?.base ?? 0) + (p["bad-publicity"]?.additional ?? 0);
    if (bp)
      out.push(
        <Stat icon="bad-pub" label="Bad publicity">
          {bp}
        </Stat>,
      );
  }
  return out;
}

function Opponent({ view, side, name }: { view: any; side: Side; name: string }) {
  const p = view[side] ?? {};
  const active = view["active-player"] === side;
  return (
    <section class="panel opp" data-anchor={`${side}-panel`}>
      <span class="big">
        <Count value={p.credit ?? 0} anchor={`${side}-credits`} />
        <Icon name="credit" class="big-credit" />
      </span>
      <div class="opp-info">
        <div class="opp-line">
          <span class={`label opp-name who-${side}`}>
            {side} // {name}
          </span>
          <TurnState active={active} />
        </div>
        <div class="opp-stats">
          <Meter value={active ? (p.click ?? 0) : 0} max={Math.max(active ? (p.click ?? 0) : 0, side === "runner" ? 4 : 3)} anchor={`${side}-clicks`} />
          <span class="label stats">
            <span data-anchor={side === "runner" ? "runner-hand" : undefined}>
              <Stat icon="hand" label={side === "runner" ? "Grip" : "HQ"}>
                {p["hand-count"] ?? 0}
              </Stat>
            </span>
            {extras(p, side).map((x) => [" · ", x])}
          </span>
        </div>
      </div>
    </section>
  );
}

function ScoreHalf({ side, points, req }: { side: Side; points: number; req: number }) {
  const row = useRef<HTMLDivElement>(null);
  const shown = useRef(points);
  useLayoutEffect(() => {
    const before = shown.current;
    shown.current = points;
    if (points <= before || !row.current || motionOff()) return;
    const segs = [...row.current.children].slice(before, points) as HTMLElement[];
    for (const seg of segs) {
      seg.style.opacity = "0";
      seg.dataset.pending = "1";
    }
    setTimeout(() => {
      segs.forEach((seg, i) => {
        if (!seg.dataset.pending) return;
        delete seg.dataset.pending;
        animate(seg, { scaleY: [4, 1], opacity: [0, 1] }, { duration: 0.5, delay: i * 0.12, ease: [0.2, 1.4, 0.4, 1] }).finished.then(() => (seg.style.opacity = ""));
      });
    }, 5000);
  }, [points]);
  return (
    <div ref={row} class={`score-half score-${side}`} data-anchor={`${side}-points`} aria-label={`${side} ${points} of ${req} points`}>
      {Array.from({ length: req }, (_, i) => (
        <i class={i < points ? "on" : ""} />
      ))}
    </div>
  );
}

function ScoreBar({ view }: { view: any }) {
  const half = (side: Side) => <ScoreHalf side={side} points={Math.min(view[side]?.["agenda-point"] ?? 0, view[side]?.["agenda-point-req"] ?? 7)} req={view[side]?.["agenda-point-req"] ?? 7} />;
  return (
    <div class="score-bar" role="img">
      {half("corp")}
      {half("runner")}
    </div>
  );
}

function TurnState({ active }: { active: boolean }) {
  const dot = useRef<HTMLElement>(null);
  useLoop(dot, { opacity: [1, 0.25, 1], scale: [1, 0.6, 1] }, { duration: 1.2, ease: "easeInOut" }, [active]);
  return (
    <span class={`label turn-state ${active ? "active" : ""}`}>
      {active && <i ref={dot} class="turn-dot" />}
      {active ? "Their turn" : "Waiting"}
    </span>
  );
}

function MeBar({ view, side, name }: { view: any; side: Side; name: string }) {
  const p = view[side] ?? {};
  const clicks = p.click ?? 0;
  return (
    <div class="me-bar" data-anchor={`${side}-panel`}>
      <span class="big yellow">
        <Count value={p.credit ?? 0} anchor={`${side}-credits`} />
        <Icon name="credit" class="big-credit" />
      </span>
      <div class="me-info">
        <div class="me-line">
          <span class={`label who-${side}`}>
            {side} // {name}
          </span>
        </div>
        <div class="me-line">
          <Meter value={clicks} max={Math.max(clicks, side === "runner" ? 4 : 3)} anchor={`${side}-clicks`} />
          <span class="label">
            <Stat icon="click" label="Clicks">
              {clicks}
            </Stat>
            {extras(p, side).map((x) => [" · ", x])}
          </span>
        </div>
      </div>
    </div>
  );
}

type ZoneKey = "discard" | "play-area" | "rfg" | "set-aside" | "deck";
interface ZoneRef {
  owner: Side;
  key: ZoneKey;
}

const ZONE_LABELS: Record<Side, Record<ZoneKey, string>> = {
  corp: { discard: "Archives", "play-area": "Play area", rfg: "Removed", "set-aside": "Set aside", deck: "R&D" },
  runner: { discard: "Heap", "play-area": "Play area", rfg: "Removed", "set-aside": "Set aside", deck: "Stack" },
};

function Pile({ label, count, cards, owner, side, selectable, onOpen, anchor }: { label: string; count: number; cards?: any[]; owner: boolean; side: Side; selectable: Set<unknown>; onOpen?: () => void; anchor?: string }) {
  const top = cards?.[cards.length - 1];
  const target = (cards ?? []).some((c) => selectable.has(c.cid));
  const back = `back ${side === "corp" ? "corp" : "runner"}`;
  const face = top ? <CardTile card={top} owner={owner} size="sm" onTap={onOpen} selectable={target} /> : <div class={`tile tile-sm ${count ? back : "empty"}`} />;
  return (
    <div class="pile" data-anchor={anchor}>
      {face}
      <span class={target ? "yellow" : ""}>
        {label} {count}
      </span>
    </div>
  );
}

function Piles({ view, zoneOwner, viewer, onTap, onZone, selectable, centrals = true }: { view: any; zoneOwner: Side; viewer: Side; onTap: (c: any) => void; onZone: (z: ZoneRef) => void; selectable: Set<unknown>; centrals?: boolean }) {
  const p = view[zoneOwner] ?? {};
  const owner = viewer === zoneOwner;
  const labels = ZONE_LABELS[zoneOwner];
  const zone = (key: ZoneKey) => {
    const cards: any[] = p[key] ?? [];
    if (key !== "discard" && !cards.length) return null;
    return <Pile label={labels[key]} count={cards.length} cards={cards} owner={owner} side={zoneOwner} selectable={selectable} anchor={key === "discard" ? `${zoneOwner}-discard` : undefined} onOpen={cards.length ? () => onZone({ owner: zoneOwner, key }) : undefined} />;
  };
  const extras = ["play-area", "rfg", "set-aside"].some((k) => (p[k] ?? []).length) || (p.scored ?? []).length || (p.current ?? []).length;
  if (!centrals && !extras) return null;
  return (
    <div class="piles">
      {centrals && p.identity && (
        <div class="pile">
          <CardTile card={p.identity} owner={owner} onTap={onTap} size="sm" selectable={selectable.has(p.identity.cid)} />
          {zoneOwner === "runner" && <span>Grip {p["hand-count"] ?? (p.hand ?? []).length}</span>}
        </div>
      )}
      {centrals && <Pile label={zoneOwner === "corp" ? "R&D" : "Stack"} count={p["deck-count"] ?? 0} owner={owner} side={zoneOwner} selectable={selectable} anchor={`${zoneOwner}-deck`} />}
      {centrals && zone("discard")}
      {zone("play-area")}
      {zone("rfg")}
      {zone("set-aside")}
      {(p.scored ?? []).length > 0 && (
        <div class="scored">
          {p.scored.map((c: any) => (
            <CardTile card={c} owner={owner} onTap={onTap} size="sm" selectable={selectable.has(c.cid)} />
          ))}
        </div>
      )}
      {(p.current ?? []).map((c: any) => (
        <CardTile card={c} owner={owner} onTap={onTap} size="sm" selectable={selectable.has(c.cid)} />
      ))}
    </div>
  );
}

function ZoneSheet({ zone, view, viewer, selectable, onTap, onClose }: { zone: ZoneRef; view: any; viewer: Side; selectable: Set<unknown>; onTap: (c: any) => void; onClose: () => void }) {
  const cards: any[] = view[zone.owner]?.[zone.key] ?? [];
  const mine = viewer === zone.owner;
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet panel zone-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={ZONE_LABELS[zone.owner][zone.key]}>
        <div class="row">
          <span class="label">
            {mine ? "Your" : "Their"} {ZONE_LABELS[zone.owner][zone.key]} · {cards.length}
          </span>
          <button class="ghost" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {cards.length === 0 && <span class="status">Empty</span>}
        <div class="zone-grid">
          {[...cards].reverse().map((c) => (
            <CardTile card={c} owner={mine} onTap={onTap} selectable={selectable.has(c.cid)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Overflow({ class: cls, children }: { class: string; children: preact.ComponentChildren }) {
  const row = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState<[number, number]>([0, 0]);
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      let left = 0;
      let right = 0;
      for (const child of el.children) {
        const r = child.getBoundingClientRect();
        if (r.right > box.right + 4) right++;
        else if (r.left < box.left - 4) left++;
      }
      setHidden((h) => (h[0] === left && h[1] === right ? h : [left, right]));
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  });
  const go = (dir: -1 | 1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div class="overflow-wrap">
      <div ref={row} class={`${cls} ${hidden[0] ? "fade-left" : ""} ${hidden[1] ? "fade-right" : ""}`}>
        {children}
      </div>
      {hidden[0] > 0 && (
        <button class="more-hint left" onClick={() => go(-1)} aria-label={`${hidden[0]} more to the left`}>
          ‹ +{hidden[0]}
        </button>
      )}
      {hidden[1] > 0 && (
        <button class="more-hint right" onClick={() => go(1)} aria-label={`${hidden[1]} more to the right`}>
          +{hidden[1]} ›
        </button>
      )}
    </div>
  );
}

function CorpArea({ view, side, mine, onTap, onZone, selectable, runServer }: { view: any; side: Side; mine: boolean; onTap: (c: any) => void; onZone: (z: ZoneRef) => void; selectable: Set<unknown>; runServer?: string }) {
  const corp = view.corp ?? {};
  const servers = corp.servers ?? {};
  const owner = side === "corp";
  const tile = (c: any) => <CardTile card={c} owner={owner} onTap={onTap} selectable={selectable.has(c.cid)} />;
  const discard: any[] = corp.discard ?? [];
  const central = (key: string) => {
    if (key === "hq") return corp.identity ? tile(corp.identity) : null;
    if (key === "rd") return <div class={`tile ${corp["deck-count"] ? "back corp" : "empty"}`} />;
    if (key === "archives") {
      const top = discard[discard.length - 1];
      const target = discard.some((c) => selectable.has(c.cid));
      return top ? <CardTile card={top} owner={owner} onTap={() => onZone({ owner: "corp", key: "discard" })} selectable={target} /> : <div class="tile empty" />;
    }
    return null;
  };
  const count = (key: string) => (key === "hq" ? (corp["hand-count"] ?? (corp.hand ?? []).length) : key === "rd" ? (corp["deck-count"] ?? 0) : key === "archives" ? discard.length : null);
  const name = (key: string) => {
    const n = count(key);
    return (
      <span class="server-name">
        {serverName(key)}
        {n != null && <b> {n}</b>}
      </span>
    );
  };
  return (
    <div class="area corp-area">
      <div class="row">
        <span class="label">Servers</span>
        <span class="label">サーバー</span>
      </div>
      {!mine && <Piles view={view} zoneOwner="corp" viewer={side} onTap={onTap} onZone={onZone} selectable={selectable} centrals={false} />}
      <Overflow class={`servers ${mine ? "mine" : "theirs"}`}>
        {serverOrder(servers).map((key) => {
          const s = servers[key] ?? { content: [], ices: [] };
          const ices = [...(s.ices ?? [])];
          return (
            <div class={`server ${runServer === key ? "running" : ""}`} data-server={key}>
              {mine ? (
                <>
                  <div class="ices">{[...ices].reverse().map(tile)}</div>
                  {name(key)}
                  <div class="content" data-anchor={key === "rd" ? "corp-deck" : key === "archives" ? "corp-discard" : undefined}>
                    {central(key)}
                    {(s.content ?? []).map(tile)}
                  </div>
                </>
              ) : (
                <>
                  <div class="content" data-anchor={key === "rd" ? "corp-deck" : key === "archives" ? "corp-discard" : key === "hq" ? "corp-hand" : undefined}>
                    {central(key)}
                    {(s.content ?? []).map(tile)}
                  </div>
                  {name(key)}
                  <div class="ices">{ices.map(tile)}</div>
                </>
              )}
            </div>
          );
        })}
      </Overflow>
      {mine && <Piles view={view} zoneOwner="corp" viewer={side} onTap={onTap} onZone={onZone} selectable={selectable} centrals={false} />}
    </div>
  );
}

function RunnerArea({ view, side, onTap, onZone, selectable }: { view: any; side: Side; onTap: (c: any) => void; onZone: (z: ZoneRef) => void; selectable: Set<unknown> }) {
  const runner = view.runner ?? {};
  const rig = runner.rig ?? {};
  const owner = side === "runner";
  const row = (label: string, cards: any[]) =>
    cards?.length ? (
      <div class="rig-row">
        <span class="label">{label}</span>
        <div class="rig-cards">
          {cards.map((c) => (
            <CardTile card={c} owner={owner} onTap={onTap} selectable={selectable.has(c.cid)} />
          ))}
        </div>
      </div>
    ) : null;
  const empty = !["program", "hardware", "resource", "facedown"].some((k) => rig[k]?.length);
  const rows: [string, string][] = [
    ["Programs", "program"],
    ["Hardware", "hardware"],
    ["Resources", "resource"],
    ["Facedown", "facedown"],
  ];
  return (
    <div class="area runner-area">
      <div class="row">
        <span class="label">Rig</span>
        <span class="label">リグ</span>
      </div>
      {!owner && <Piles view={view} zoneOwner="runner" viewer={side} onTap={onTap} onZone={onZone} selectable={selectable} />}
      {empty && <span class="hint">Nothing installed</span>}
      {owner ? rows.map(([label, key]) => row(label, rig[key])) : [...rows].reverse().map(([label, key]) => row(label, rig[key]))}
      {owner && <Piles view={view} zoneOwner="runner" viewer={side} onTap={onTap} onZone={onZone} selectable={selectable} />}
    </div>
  );
}

interface LogGroup {
  kind: "action" | "misc" | "chat";
  side?: Side;
  click?: number;
  lines: preact.ComponentChildren[];
}

interface LogTurn {
  number?: number;
  side?: Side;
  who?: string;
  groups: LogGroup[];
}

const TURN_START = /^(.+?) started \[?their\]? turn (\d+)/i;
const CLICK_ACTION = /^(.+?) spends (\[click\])+/i;

function groupLog(log: any[], render: (m: unknown) => string, names: Record<Side, string>): LogTurn[] {
  const sideOf = (text: string): Side | undefined => {
    const corp = text.startsWith(names.corp);
    const runner = text.startsWith(names.runner);
    return corp && !runner ? "corp" : runner && !corp ? "runner" : undefined;
  };
  const turns: LogTurn[] = [{ groups: [] }];
  let turn = turns[0];
  let group: LogGroup | null = null;
  let clicks = 0;
  for (const e of log) {
    const raw = render(e.text);
    if (/^\s*\[hr\]\s*$/i.test(raw) || /has no further action\.?$/i.test(raw)) continue;
    if (e.user !== "__system__") {
      group = null;
      turn.groups.push({ kind: "chat", lines: [glyphs(`${e.user?.username ?? "?"}: ${iconize(raw)}`)] });
      continue;
    }
    const line = glyphs(iconize(raw));
    const start = raw.match(TURN_START);
    if (start) {
      const side = sideOf(raw);
      turn = { number: Number(start[2]), side, who: start[1], groups: [] };
      turns.push(turn);
      clicks = 0;
      group = { kind: "misc", side, lines: [line] };
      turn.groups.push(group);
      continue;
    }
    if (CLICK_ACTION.test(raw)) {
      const n = (raw.match(/\[click\]/gi) ?? []).length;
      group = { kind: "action", side: sideOf(raw), click: clicks + 1, lines: [line] };
      clicks += n;
      turn.groups.push(group);
      continue;
    }
    if (!group || group.kind === "chat" || /is ending \[?their\]? turn/i.test(raw)) {
      group = { kind: "misc", side: sideOf(raw), lines: [line] };
      turn.groups.push(group);
      continue;
    }
    group.lines.push(line);
  }
  return turns.filter((t) => t.groups.length);
}

export function LogTurns({ log, render, names }: { log: any[]; render: (m: unknown) => string; names: Record<Side, string> }) {
  const turns = useMemo(() => groupLog(log, render, names), [log.length]);
  return (
    <>
      {turns.map((t) => (
        <section class={`log-turn ${t.side ? `side-${t.side}` : ""}`}>
          <header class="log-turn-head">
            {t.number ? (
              <>
                <span>Turn {t.number}</span>
                {t.side && <span class={`who-${t.side}`}>{t.side}</span>}
                <span class="log-who">{t.who}</span>
              </>
            ) : (
              <span>Setup</span>
            )}
          </header>
          {t.groups.map((g) => (
            <div class={`log-group log-${g.kind} ${g.side ? `side-${g.side}` : ""}`}>
              {g.kind === "action" && <span class="log-click">Click {g.click}</span>}
              {g.lines.map((l, i) => (
                <p class={i > 0 ? "log-sub" : undefined}>{l}</p>
              ))}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

function Log({ view, render, names, onSay, onClose }: { view: any; render: (m: unknown) => string; names: Record<Side, string>; onSay: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const log: any[] = view.log ?? [];
  useEffect(() => end.current?.scrollIntoView(), [log.length]);
  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div class="sheet panel log-sheet" onClick={(e) => e.stopPropagation()}>
        <div class="row">
          <span class="label">Log</span>
          <button class="ghost" onClick={onClose} aria-label="Close log">
            <Icon name="close" />
          </button>
        </div>
        <div class="log">
          <LogTurns log={log} render={render} names={names} />
          <div ref={end} />
        </div>
        <form
          class="chat"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onSay(text.trim());
            setText("");
          }}
        >
          <input value={text} onInput={(e) => setText((e.target as HTMLInputElement).value)} placeholder="message or /command" aria-label="Chat message" />
          <button class="primary">Send</button>
        </form>
      </div>
    </div>
  );
}

function useLastIce(view: any, ice: any) {
  const last = useRef<any>(null);
  if (!view.run) last.current = null;
  else if (ice?.rezzed && (view.encounters || view.run.phase === "encounter-ice")) {
    const prev = last.current?.cid === ice.cid ? (last.current.subroutines ?? []) : [];
    const subroutines = (ice.subroutines ?? []).map((sub: any, i: number) => {
      const was = prev[i] ?? {};
      return { ...sub, broken: sub.broken || was.broken, breaker: sub.broken ? sub.breaker : was.broken ? was.breaker : sub.breaker, fired: sub.fired || was.fired };
    });
    last.current = { ...ice, subroutines };
  }
  return last.current;
}

function breakAllFromLog(view: any, title: string, render: (m: unknown) => string): string | undefined {
  const lines: any[] = (view.log ?? []).slice(-20);
  for (const e of lines.reverse()) {
    const text = render(e.text);
    if (/approaches /.test(text) && text.includes(title)) return undefined;
    const m = text.match(/(?:use|uses|strength of) (.+?) (?:to|and) .*?break all\s+(?:\d+\s+)?subroutines on /i);
    if (m && text.includes(`subroutines on ${title}`)) return m[1];
  }
  return undefined;
}

const NOISE = "01#$%&*+=<>/\\|{}[]?ABCDEFX";

function Decrypt({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (motionOff()) return;
    const start = performance.now();
    const id = setInterval(() => {
      const t = (performance.now() - start) / 520;
      if (t >= 1) {
        setShown(text);
        clearInterval(id);
        return;
      }
      setShown([...text].map((ch, i) => (ch === " " || i / text.length < t ? ch : NOISE[(Math.random() * NOISE.length) | 0])).join(""));
    }, 40);
    return () => clearInterval(id);
  }, [text]);
  return <>{shown === text ? glyphs(iconize(text)) : shown}</>;
}

function Encounter({ view, ice, passed, render, onTap, skip, onToggle }: { view: any; ice: any; passed?: boolean; render: (m: unknown) => string; onTap: (card: any) => void; skip?: Set<number>; onToggle?: (i: number) => void }) {
  const allBy = passed ? breakAllFromLog(view, ice.title, render) : undefined;
  const subs: any[] = (ice.subroutines ?? []).map((sub: any) => (allBy && !sub.broken && !sub.fired ? { ...sub, broken: true, breakerTitle: allBy } : sub));
  const encountering = !passed && (!!view.encounters || view.run?.phase === "encounter-ice");
  const strength = ice["current-strength"] ?? ice.strength;
  const types = (ice.subtypes ?? []).join(" · ");
  const states = subs.map((sub) => (sub.broken ? "broken" : sub.fired ? "fired" : sub.resolve === false ? "skipped" : "live"));
  const list = useRef<HTMLOListElement>(null);
  const seen = useRef<{ cid: unknown; states: string[] }>({ cid: ice.cid, states });
  useEffect(() => {
    const before = seen.current.cid === ice.cid ? seen.current.states : states;
    seen.current = { cid: ice.cid, states };
    const rows = list.current ? [...list.current.children] : [];
    if (motionOff()) return;
    states.forEach((st, i) => {
      if (st === before[i] || !rows[i]) return;
      if (st === "broken") {
        animate(rows[i], { x: [0, 10, 0], backgroundColor: ["rgba(34,211,238,0.45)", "rgba(34,211,238,0)"] }, { duration: 0.5, delay: 0.25 + i * 0.08 });
        const text = rows[i].querySelector(".enc-text");
        if (text) animate(text, { backgroundSize: ["0% 2px", "100% 2px"] }, { duration: 0.3, delay: 0.3 + i * 0.08, ease: [0.3, 0.9, 0.3, 1] });
      } else if (st === "fired") animate(rows[i], { x: [0, -8, 8, -5, 0], backgroundColor: ["rgba(255,59,48,0.5)", "rgba(255,59,48,0)"] }, { duration: 0.55, delay: 0.3 });
    });
  }, [ice.cid, states.join()]);
  return (
    <div class={`encounter ${encountering ? "live" : ""} ${passed ? "passed" : ""}`} data-kind={iceKind(ice)}>
      {ice.code && (
        <button class="enc-card" onClick={() => onTap(findCard(view, ice.cid) ?? ice)} aria-label={ice.title}>
          <CardImage code={ice.code} alt={ice.title} size="small" width="48px" />
          {passed && (
            <span class="enc-cleared" aria-label="Passed">
              <Icon name="check" />
            </span>
          )}
        </button>
      )}
      <div class="enc-body">
        <div class="enc-head">
          <span class="enc-title">{ice.title}</span>
          <span class="enc-meta">
            {types}
            {strength != null && (
              <>
                {" · "}
                <Stat icon="strength" label="Strength">
                  {strength}
                </Stat>
              </>
            )}
          </span>
        </div>
        {subs.length > 0 ? (
          <ol class="enc-subs" ref={list}>
            {subs.map((sub, i) => {
              const breaker = sub.breakerTitle ?? (sub.breaker != null ? findCard(view, sub.breaker)?.title : undefined);
              const state = states[i];
              const pickable = !!onToggle && state === "live";
              const left = pickable && !!skip?.has(i);
              return (
                <li class={`enc-sub ${state} ${pickable ? "pickable" : ""} ${left ? "left" : ""}`} onClick={pickable ? () => onToggle!(i) : undefined} role={pickable ? "checkbox" : undefined} aria-checked={pickable ? !left : undefined}>
                  <Icon name="sub" />
                  <span class="enc-label">
                    <span class="enc-text">{state === "broken" ? <Decrypt text={sub.label ?? "Subroutine"} /> : withTerms(iconize(sub.label ?? "Subroutine"))}</span>
                  </span>
                  <span class="enc-state">{state === "broken" ? (breaker ? `Broken · ${breaker}` : "Broken") : state === "fired" ? "Fired" : state === "skipped" ? "Won't fire" : left ? "Let it fire" : pickable ? "Break" : encountering ? "Unbroken" : ""}</span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p class="enc-none">No subroutines</p>
        )}
      </div>
    </div>
  );
}

const TOAST_MS = 4000;
const ACTION_ERROR = "action-error";
const TOAST_MAX = 3;

function Toasts({ toasts, render, dismiss }: { toasts: any[]; render: (m: unknown) => string; dismiss: (id: string) => void }) {
  const timers = useRef(new Map<string, number>());
  useEffect(() => {
    const live = new Set(toasts.map((t) => t.id));
    for (const t of toasts) {
      if (!timers.current.has(t.id)) uiSound(t.type === "error" ? "ui_error" : "ui_notify");
      if (!timers.current.has(t.id))
        timers.current.set(
          t.id,
          window.setTimeout(() => dismiss(t.id), TOAST_MS),
        );
    }
    for (const [id, handle] of timers.current) {
      if (!live.has(id)) {
        clearTimeout(handle);
        timers.current.delete(id);
      }
    }
  });
  useEffect(() => () => timers.current.forEach((handle) => clearTimeout(handle)), []);
  if (!toasts.length) return null;
  const groups = new Map<string, { text: string; type: string; ids: string[] }>();
  for (const t of toasts) {
    const text = iconize(render(t.msg));
    const group = groups.get(text) ?? { text, type: String(t.type), ids: [] as string[] };
    group.ids.push(t.id);
    groups.set(text, group);
  }
  const all = [...groups.values()];
  const hidden = all.length - TOAST_MAX;
  return (
    <div class="toasts" aria-live="polite">
      {all.slice(-TOAST_MAX).map((g) => (
        <button class={`toast ${g.type}`} onClick={() => g.ids.forEach(dismiss)}>
          {glyphs(g.text)}
          {g.ids.length > 1 && <span class="toast-count"> ×{g.ids.length}</span>}
        </button>
      ))}
      {hidden > 0 && <span class="label">+{hidden} more</span>}
    </div>
  );
}

function GameOver({ view, side, db, render, onLeave }: { view: any; side: Side; db: CardDb; render: (m: unknown) => string; onLeave: () => void }) {
  const logLength = (view.log ?? []).length;
  const { lines, cards } = useMemo(() => {
    const lines = (view.log ?? [])
      .map((e: any) => iconize(render(e.text)))
      .filter((t: string) => t && !/^\s*\[hr\]\s*$/i.test(t))
      .slice(-5);
    const found = new Map<string, { code: string; title: string; at: number }>();
    lines.forEach((line: string, i: number) => {
      for (const [title, card] of db.byTitle) if (title.length > 3 && card.code && line.includes(title)) found.set(title, { code: card.code, title, at: i });
    });
    const cards = [...found.values()].filter((c) => ![...found.keys()].some((t) => t !== c.title && t.includes(c.title))).sort((a, b) => b.at - a.at).slice(0, 4);
    return { lines, cards };
  }, [logLength]);
  const won = view.winner === side;
  return (
    <section class="prompt game-over">
      <span class={`big ${won ? "yellow" : ""}`} style="font-size: 56px">
        {won ? "VICTORY" : "DEFEAT"}
      </span>
      {view.reason && <span class="label">{view.reason}</span>}
      {cards.length > 0 && (
        <div class="game-over-cards">
          {cards.map((c) => (
            <ZoomableCardImage code={c.code} alt={c.title} size="small" />
          ))}
        </div>
      )}
      <ol class="game-over-log">
        {lines.map((l: string) => (
          <li>{glyphs(l)}</li>
        ))}
      </ol>
      <Cta onClick={onLeave}>Back to home</Cta>
    </section>
  );
}

function feedText(view: any, side: Side, names: Record<Side, string>, watching = false) {
  if (view.winner) return `${names[view.winner as Side] ?? view.winner} wins`;
  if (view.run) {
    const ice = currentIce(view);
    return `Run · ${serverName(view.run.server?.[0] ?? "")} · ${PHASE_LABELS[view.run.phase] ?? view.run.phase}${ice ? ` · ${ice.title ?? "unrezzed ice"}` : ""}`;
  }
  const active = view["active-player"] as Side;
  return `Turn ${view.turn ?? 0} · ${active === side && !watching ? "your move" : `${names[active] ?? active} to play`}`;
}

function markStaged(node: any, staged: Set<unknown>): any {
  if (Array.isArray(node)) return node.map((x) => markStaged(x, staged));
  if (!node || typeof node !== "object") return node;
  const out: any = {};
  for (const k in node) out[k] = markStaged(node[k], staged);
  if (node.cid != null && staged.has(node.cid)) out.selected = true;
  return out;
}

export function Board({ session, engine, db, side, view: live, onSwitchSide, onLeave, onExit, onWatch, handoffLog, controls, quiet }: Props) {
  const [staged, setStaged] = useState<Set<unknown>>(() => new Set());
  const view = useMemo(() => (staged.size ? markStaged(live, staged) : live), [live, staged]);
  const [selected, setSelected] = useState<any>(null);
  const [showLog, setShowLog] = useState(false);
  const [picking, setPicking] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  const [menu, setMenu] = useState(false);
  const [menuTab, setMenuTab] = useState("Game");
  const closeMenu = (then: () => void) => {
    setMenu(false);
    then();
  };
  const shareLink = async (url: string, title: string, copied: string) => {
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        uiSound("ui_copy");
        tell("Link copied", copied);
      }
    } catch {}
  };
  const exportJournal = async () => {
    const text = session.journal();
    if (!text) return;
    const name = `pocket-rig-${(session.lobby.code || "game").replace(/[^\w-]/g, "")}.json`;
    const file = new File([text], name, { type: "application/json" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const [zone, setZone] = useState<ZoneRef | null>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const autoZone = useRef(false);
  const render = (m: unknown) => engine.renderMessage(m);
  useFx(live, side, render, quiet, session.lobby.role === "spectator", (title) => db.byTitle.get(title)?.code);
  const sendNow = (command: string, args?: unknown) => session.send(command, args, side);
  const watching = session.lobby.role === "spectator";
  const disabled = session.pending || watching;
  const prober = useMemo<Prober | undefined>(() => (watching || controls ? undefined : (probes) => session.probe(side, probes)), [session, side, watching, !!controls]);
  const verified = useVerified(live, side, prober, live);
  const turnCommands = useChecked(view.run || view.encounters ? runCommands(view, side) : basicCommands(view, side), prober, live);
  const choices = turnCommands.filter((c) => c.enabled !== false && c.command !== "toggle-auto-no-action");
  const openPrompt = promptOf(view, side);
  const me = view[side] ?? {};
  const opp = otherSide(side);
  const prompt = watching ? undefined : promptOf(view, side);
  const ptype = prompt?.["prompt-type"];
  const selectable = useMemo(() => new Set<unknown>(prompt?.selectable ?? []), [prompt]);
  const tap = (card: any) => setSelected(card);
  const current = selected ? findCard(view, selected.cid) : null;
  const siblings = current ? (current.zone?.[0] === "discard" ? [...siblingsOf(view, current.cid)].reverse() : siblingsOf(view, current.cid)) : [];
  const position = siblings.findIndex((c) => c.cid === current?.cid);
  const [slide, setSlide] = useState<-1 | 1>();
  const step = (dir: -1 | 1) => {
    const next = siblings[position + dir];
    if (!next) return;
    setSlide(dir);
    setSelected(next);
  };
  const openZone = (z: ZoneRef) => {
    const cards: any[] = view[z.owner]?.[z.key] ?? [];
    if (cards.length) setSelected(cards[cards.length - 1]);
  };
  const closeCard = () => {
    setSelected(null);
    setSlide(undefined);
  };
  const theirDeck = session.deckFor(opp);
  useEffect(() => {
    const rank = (type: string) => (type === "ICE" ? 0 : type === "Asset" || type === "Upgrade" ? 1 : 2);
    const cards = [...(theirDeck?.cards ?? [])].sort((a, b) => rank(a.card.type) - rank(b.card.type));
    const codes = new Set(cards.map((e) => e.card.code).filter(Boolean));
    if (!codes.size) return;
    let cancelled = false;
    const onTable = [...document.querySelectorAll<HTMLImageElement>(".board img")].filter((img) => !img.complete);
    const settled = Promise.race([Promise.all(onTable.map((img) => img.decode().catch(() => {}))), new Promise((ok) => setTimeout(ok, 4000))]);
    settled.then(() => {
      if (cancelled) return;
      for (const code of codes) {
        const img = new Image();
        img.fetchPriority = "low";
        img.crossOrigin = "anonymous";
        img.src = cardImage(code, "small")!;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [theirDeck?.name, opp]);
  const myMove = awaitingMove(view, side);
  const remote = session.lobby.role !== "local" || session.lobby.vsBot;
  const canUndo = !watching && undoAllowed(session, view, side, render, handoffLog);
  const allowAuto = !disabled && !session.lobby.tutorial && !(session.lobby.role === "local" && !session.lobby.vsBot) && verified?.size === 0;
  const forced: { steps: { command: string; args?: unknown }[]; wait: number } | null = (() => {
    if (!allowAuto) return null;
    const pt = openPrompt?.["prompt-type"];
    if (!openPrompt || pt === "run") return choices.length === 1 && FORCED.has(choices[0].command) && !(choices[0].command === "end-turn" && canUndo) ? { steps: [choices[0]], wait: 700 } : null;
    const eid = openPrompt.eid;
    const options = openPrompt.choices;
    if (pt === "trace" && Number(options ?? 0) === 0) return { steps: [{ command: "choice", args: { eid, choice: 0 } }], wait: 700 };
    const selectable: unknown[] = openPrompt.selectable ?? [];
    if (Array.isArray(options) && options.length === 1 && !selectable.length && /^steal$/i.test(String(options[0]?.value))) return { steps: [{ command: "choice", args: { eid, choice: { uuid: options[0].uuid } } }], wait: 1600 };
    if (pt === "select" && selectable.length) {
      const max: number = openPrompt["select-max"] ?? 1;
      const min: number = openPrompt["select-all"] ? max : (openPrompt["select-min"] ?? 0);
      if (min < selectable.length || max < selectable.length) return null;
      const steps: { command: string; args?: unknown }[] = selectable.map((cid) => ({ command: "select", args: { card: cardRef(findCard(live, cid)), eid } }));
      const done = Array.isArray(options) ? options.find((c: any) => c?.value === "Done") : undefined;
      if (selectable.length < max && done) steps.push({ command: "choice", args: { eid, choice: { uuid: done.uuid } } });
      return { steps, wait: 900 };
    }
    return null;
  })();
  const forcedKey = forced ? JSON.stringify(forced.steps) : "";
  useEffect(() => {
    if (!forced) return;
    const delay = Math.max(forced.wait, quietUntil - performance.now() + 300);
    const target = autoTarget(forced.steps);
    target?.style.setProperty("--auto-ms", `${delay}ms`);
    target?.classList.add("auto-press");
    const press = setTimeout(() => target?.classList.add("auto-fire"), delay);
    const fire = setTimeout(() => forced.steps.forEach((step) => sendNow(step.command, step.args)), target ? delay + AUTO_FIRE_MS : delay);
    return () => {
      clearTimeout(press);
      clearTimeout(fire);
      target?.classList.remove("auto-press", "auto-fire");
    };
  }, [forcedKey, live]);
  useEffect(() => {
    if (myMove && remote) navigator.vibrate?.(40);
  }, [myMove]);
  useBackClose(!!current, closeCard);
  useBackClose(showLog, () => setShowLog(false));
  useBackClose(menu, () => setMenu(false));
  useBackClose(deckOpen, () => setDeckOpen(false));
  useBackClose(!!zone, () => {
    setZone(null);
    autoZone.current = false;
  });
  const promptId = prompt?.eid?.eid;
  const staging = ptype === "select" && (prompt.selectable ?? []).length > 0 && !/^Choose a credit providing card/.test(render(prompt.msg));
  useEffect(() => setStaged(new Set()), [promptId]);
  const send = (command: string, args?: any) => {
    if (!staging || command !== "select") return sendNow(command, args);
    const cid = args?.card?.cid;
    const max = prompt["select-max"] ?? 1;
    setStaged((was) => {
      if (was.has(cid)) {
        const next = new Set(was);
        next.delete(cid);
        return next;
      }
      if (max === 1) return new Set([cid]);
      return was.size < max ? new Set([...was, cid]) : was;
    });
  };
  const stagedNames = [...staged].map((cid) => findCard(live, cid)?.title).filter(Boolean) as string[];
  const selectZone: ZoneRef | null = (() => {
    if (ptype !== "select") return null;
    for (const cid of selectable) {
      const card = findCard(live, cid);
      const key = card?.zone?.[0];
      if (card && ["discard", "deck", "rfg", "set-aside", "play-area"].includes(key)) return { owner: card.side === "Corp" ? "corp" : "runner", key };
    }
    return null;
  })();
  const confirmStaged = () => {
    for (const cid of staged) {
      const card = findCard(live, cid);
      if (card) sendNow("select", { card: cardRef(card), eid: prompt.eid });
    }
    if (staged.size < (prompt["select-max"] ?? 1)) {
      const done = (prompt.choices ?? []).find?.((c: any) => c?.value === "Done");
      if (done) sendNow("choice", { eid: prompt.eid, choice: { uuid: done.uuid } });
    }
    setStaged(new Set());
    closeCard();
  };
  const stagedConfirm = (() => {
    if (!staging) return undefined;
    const max: number = prompt["select-max"] ?? 1;
    const min: number = prompt["select-all"] ? max : (prompt["select-min"] ?? 0);
    const ready = staged.size >= min && staged.size <= max && staged.size > 0;
    const msg = render(prompt.msg);
    const verb = /^discard/i.test(msg) ? "Discard" : /^trash/i.test(msg) ? "Trash" : "Confirm";
    return { label: ready ? `${verb} ${stagedNames.length === 1 ? stagedNames[0] : `${staged.size} ${staged.size === 1 ? "card" : "cards"}`}` : `Pick ${Math.max(1, min - staged.size)} more`, ready, onConfirm: confirmStaged };
  })();
  const closePrompt = () => session.say("/close-prompt", side);

  useEffect(() => setPicking(false), [!!view.run, promptId, view["active-player"], side]);
  const wasSelecting = useRef(false);
  useEffect(() => {
    if (wasSelecting.current) closeCard();
    wasSelecting.current = ptype === "select";
  }, [promptId]);
  useEffect(() => {
    const want = pendingChoice.value;
    if (!want || !prompt) return;
    pendingChoice.value = undefined;
    const choice = (prompt.choices ?? []).find?.((c: any) => c?.value === want);
    if (choice) send("choice", { eid: prompt.eid, choice: { uuid: choice.uuid } });
  }, [promptId]);

  useEffect(() => {
    const wanted: Side | null = prompt?.["show-discard"] ? side : prompt?.["show-opponent-discard"] ? opp : null;
    if (wanted) {
      setZone({ owner: wanted, key: "discard" });
      autoZone.current = true;
    } else if (autoZone.current) {
      setZone(null);
      autoZone.current = false;
    }
  }, [promptId, side]);
  const names = {
    [side]: me.user?.username ?? "You",
    [opp]: view[opp]?.user?.username ?? "Opponent",
  } as Record<Side, string>;

  const toasts: any[] = me.toast ?? [];

  const log: any[] = view.log ?? [];
  const lastLog = [...log].reverse().find((e) => !/^\s*\[hr\]\s*$/i.test(String(e.text?.["raw-text"] ?? e.text ?? "")));
  const runServer = view.run?.server?.[0];
  useEffect(() => {
    if (!runServer) return;
    document.querySelector(".server.running")?.scrollIntoView({ block: side === "runner" ? "end" : "start", inline: "center", behavior: "smooth" });
  }, [runServer, view.run?.position, side]);
  const ice = currentIce(view);
  const lastIce = useLastIce(view, ice);
  const [skip, setSkip] = useState<{ cid: unknown; subs: Set<number> }>({ cid: null, subs: new Set() });
  const skipped = skip.cid === ice?.cid ? skip.subs : new Set<number>();
  const plan = useRef<BreakPlan | null>(null);
  const [planTick, setPlanTick] = useState(0);
  const breakSome = (breaker: any, want: string[]) => {
    plan.current = { ice: ice?.cid, breaker: breaker.cid, want, stage: "pump", steps: 0 };
    setPlanTick((t) => t + 1);
  };
  useEffect(() => {
    if (!plan.current || session.pending) return;
    const next = breakStep(view, side, plan.current, render);
    if (next === "wait") plan.current.steps--;
    else if (next) send(next.command, next.args);
    else plan.current = null;
  }, [view, session.pending, planTick]);
  const toggleSub = (i: number) => {
    const next = new Set(skipped);
    if (!next.delete(i)) next.add(i);
    setSkip({ cid: ice?.cid, subs: next });
  };
  const link = session.lobby.role === "local" ? null : session.lobby.status;

  let panel: preact.ComponentChildren;
  if (controls) panel = <section class="actions replay-controls">{controls}</section>;
  else if (watching) {
    panel = (
      <section class="actions watching">
        {view.winner ? (
          <span class="big yellow" style="font-size: 40px">
            {names[view.winner as Side] ?? view.winner} wins
          </span>
        ) : (
          <p class="run-status">
            Spectating
            {view.run ? ` · run on ${serverName(runServer ?? "")} · ${PHASE_LABELS[view.run?.phase] ?? view.run?.phase}` : ` · ${names[view["active-player"] as Side] ?? "…"} to play`}
          </p>
        )}
        {view.reason && view.winner && <span class="label">{view.reason}</span>}
        {!view.winner && session.freeSeatSide && (
          <Cta
            onClick={async () => {
              const seatSide = session.freeSeatSide!;
              if (!(await ask({ title: `Take the ${seatSide === "corp" ? "Corp" : "Runner"} seat?`, body: "You will play this side from where the game stands now.", ok: "Take seat" }))) return;
              try {
                await session.takeSeat();
              } catch (e) {
                await tell("Could not take the seat", e instanceof Error ? e.message : String(e));
              }
            }}
          >
            Take the {session.freeSeatSide === "corp" ? "Corp" : "Runner"} seat
          </Cta>
        )}
      </section>
    );
  } else if (view.winner) {
    panel = <GameOver view={view} side={side} db={db} render={render} onLeave={onLeave} />;
  } else if (prompt && ptype !== "run") {
    panel = (
      <PromptPanel
        key={promptId}
        view={view}
        side={side}
        prompt={prompt}
        render={render}
        send={send}
        closePrompt={closePrompt}
        disabled={disabled}
        db={db}
        staging={staging ? { count: staged.size, names: stagedNames, onConfirm: confirmStaged, onClear: () => setStaged(new Set()) } : undefined}
        onShowZone={selectZone && !zone ? () => setZone(selectZone) : undefined}
        zoneLabel={selectZone ? ZONE_LABELS[selectZone.owner][selectZone.key] : undefined}
      />
    );
  } else if (picking && side === "runner") {
    const list: string[] = byServerOrder(me["runnable-list"] ?? [], (x) => x);
    panel = (
      <section class="prompt">
        <span class="label">Run on…</span>
        <div class="choices">
          {list.map((s) => (
            <button
              class="primary"
              disabled={disabled}
              onClick={() => {
                send("run", { server: s });
                setPicking(false);
              }}
            >
              {serverLabel(s)}
            </button>
          ))}
          <button class="ghost" onClick={() => setPicking(false)}>
            Cancel
          </button>
        </div>
      </section>
    );
  } else {
    const commands: Command[] = turnCommands;
    const [first, ...rest] = commands;
    const lead = first?.kind === "primary" ? first : undefined;
    const others = lead ? rest : commands;
    panel = (
      <section class="actions">
        {(view.run || view.encounters) && (
          <p class="run-status">
            Run · {serverName(runServer ?? "")} · {PHASE_LABELS[view.run?.phase] ?? view.run?.phase}
            {ice && !ice.rezzed ? " · unrezzed ice" : ""}
          </p>
        )}
        <div class="buttons">
          {lead && (
            <Cta
              cmd={lead.command}
              disabled={disabled || lead.enabled === false}
              onClick={() => {
                if (lead.confirm && armed !== lead.command) return setArmed(lead.command);
                setArmed(null);
                send(lead.command, lead.args);
                if (lead.then === "install-list") setPicking(true);
              }}
            >
              {glyphs(iconize(armed === lead.command && lead.confirm ? lead.confirm : lead.label))}
            </Cta>
          )}
          {others.map((c) => (
            <button
              data-cmd={c.command}
              class={`${armed === c.command && c.confirm ? "danger armed" : c.kind === "danger" ? "danger" : c.kind === "primary" ? "primary" : ""} ${c.label.replace(/\[[^\]]+\]/g, "#").length > 13 ? "wide" : ""}`}
              disabled={disabled || c.enabled === false}
              onClick={() => {
                if (c.confirm && armed !== c.command) return setArmed(c.command);
                setArmed(null);
                send(c.command, c.args);
                if (c.then === "install-list") setPicking(true);
              }}
            >
              {glyphs(iconize(armed === c.command && c.confirm ? c.confirm : c.label))}
            </button>
          ))}
          {commands.length === 0 && <Waiting name={names[opp]} lastAct={session.lastActAt} />}
        </div>
      </section>
    );
  }

  const theirArea = opp === "corp" ? <CorpArea view={view} side={side} mine={false} onTap={tap} onZone={openZone} selectable={selectable} runServer={runServer} /> : <RunnerArea view={view} side={side} onTap={tap} onZone={openZone} selectable={selectable} />;
  const myArea = side === "corp" ? <CorpArea view={view} side={side} mine onTap={tap} onZone={openZone} selectable={selectable} runServer={runServer} /> : <RunnerArea view={view} side={side} onTap={tap} onZone={openZone} selectable={selectable} />;
  const hand: any[] = [...(me.hand ?? []), ...(me.discard ?? []).filter((c: any) => c["flashback-playable"])];

  const tense = !view.winner && (Math.max(view.corp?.["agenda-point"] ?? 0, view.runner?.["agenda-point"] ?? 0) >= 4 || (view.runner?.tag?.total ?? 0) > 0);
  const mood = view.winner ? "calm" : view.run ? "run" : tense ? "tension" : "calm";
  useEffect(() => setMood(mood), [mood]);
  useEffect(() => {
    uiSound("ui_land");
    return () => setMood("menu");
  }, []);

  return (
    <Verified.Provider value={verified}>
    <div class={`board side-${side} ${ptype === "select" ? "selecting" : ""} ${view.run ? "in-run" : ""}`}>
      <ScoreBar view={view} />
      <Ticker
        onFeed={() => setShowLog(true)}
        feedKey={log.length}
        action={
          <button class="ticker-menu" onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}>
            <Icon name={menu ? "close" : "menu"} />
            <span>{menu ? "Close" : "Menu"}</span>
          </button>
        }
      >
        {view.winner || !lastLog ? feedText(view, side, names, watching) : glyphs(iconize(render(lastLog.text)))}
        {!!session.lobby.watchers && <span class="cyan"> · {session.lobby.watchers} watching</span>}
        {link && link !== "connected" && <span class="yellow"> · {link === "waiting" ? "opponent offline" : "reconnecting"}</span>}
      </Ticker>
      {menu && (
        <MenuDrawer title="Game menu" tabs={["Game", "Settings"]} tab={menuTab} onTab={setMenuTab} onClose={() => setMenu(false)}>
          {menuTab === "Settings" ? (
            <SettingsSections />
          ) : (
            <>
              <div class="menu-tiles">
                <MenuTile icon="deck" label="Deck list" onClick={() => closeMenu(() => setDeckOpen(true))} />
                <MenuTile icon="history" label="Game log" onClick={() => closeMenu(() => setShowLog(true))} />
                {canUndo && <MenuTile icon="undo" label="Undo click" onClick={() => closeMenu(() => session.say("/undo-click", side))} />}
                {onSwitchSide && <MenuTile icon="swap" label={watching ? `${opp === "corp" ? "Corp" : "Runner"} view` : `Play ${opp === "corp" ? "Corp" : "Runner"}`} onClick={() => closeMenu(onSwitchSide)} />}
                <MenuTile icon={settings.sound ? "sound" : "mute"} label={settings.sound ? "Sound on" : "Sound off"} active={settings.sound} onClick={() => setSetting("sound", !settings.sound)} />
              </div>
              {(session.watchUrl || session.rejoinUrl || !watching) && (
                <MenuSection title="Share">
                  {session.watchUrl && <MenuItem icon="eye" label="Spectator link" hint="Anyone with it can watch" onClick={() => closeMenu(() => shareLink(session.watchUrl!, "Watch this Netrunner game", "Send it to anyone who wants to watch this game."))} />}
                  {session.rejoinUrl && <MenuItem icon="link" label="Rejoin link" hint="Keep it private: it takes your seat" onClick={() => closeMenu(() => shareLink(session.rejoinUrl!, "Rejoin my Netrunner game", "Keep it private: it lets anyone take your seat."))} />}
                  {!watching && <MenuItem icon="share" label="Export game journal" hint="A file to replay or report a bug" onClick={() => closeMenu(exportJournal)} />}
                </MenuSection>
              )}
              {((prompt && ptype !== "run") || session.canFreeSeat) && (
                <MenuSection title="Troubleshoot">
                  {prompt && ptype !== "run" && (
                    <MenuItem
                      icon="warning"
                      label="Close stuck prompt"
                      onClick={() => closeMenu(async () => {
                        if (await ask({ title: "Close the prompt?", body: "Use this only if the game is stuck.", ok: "Close prompt", danger: true })) closePrompt();
                      })}
                    />
                  )}
                  {session.canFreeSeat && (
                    <MenuItem
                      icon="close"
                      label="Free opponent's seat"
                      hint="Someone else can take it"
                      onClick={() => closeMenu(async () => {
                        if (await ask({ title: "Free their seat?", body: `${session.lobby.opponentName ?? "Your opponent"} will be disconnected. Anyone with the game code, or watching it, can then take their seat and continue the game.`, ok: "Free seat", danger: true })) session.freeSeat();
                      })}
                    />
                  )}
                </MenuSection>
              )}
              <MenuSection title="Leave">
                <MenuItem icon="arrow-left" label="Back to home" hint={watching ? undefined : "The game stays saved"} onClick={() => closeMenu(onExit)} />
                {!watching && onWatch && session.watchUrl && <MenuItem icon="eye" label="Watch instead" onClick={() => closeMenu(onWatch)} />}
                {!watching && (
                  <MenuItem
                    icon="flag"
                    label="Concede"
                    tone="danger"
                    onClick={() => closeMenu(async () => {
                      if (await ask({ title: "Concede?", body: "Your opponent wins this game.", ok: "Concede", danger: true })) session.concede(side);
                    })}
                  />
                )}
                {!watching && (
                  <MenuItem
                    icon="trash"
                    label="Delete game"
                    tone="quiet"
                    onClick={() => closeMenu(async () => {
                      if (await ask({ title: "Delete this game?", body: "It is removed from this device and you will not be able to come back to it.", ok: "Delete", danger: true })) onLeave();
                    })}
                  />
                )}
              </MenuSection>
            </>
          )}
        </MenuDrawer>
      )}
      <Toasts toasts={session.actionError ? [...toasts, { id: ACTION_ERROR, type: "error", msg: session.actionError }] : toasts} render={render} dismiss={(id) => (id === ACTION_ERROR ? session.clearActionError() : send("toast", { id }))} />
      <div class="playfield-frame">
        <CursorGrid className="board-grid" cellSize={32} color={view.run ? "#ff5a4f" : "#3aa3b5"} gridColor={view.run ? "#b2443c" : "#2b8a9a"} radius={100} holdTime={200} fadeDuration={1400} maxOpacity={0.6} fillOpacity={0} gridOpacity={0.06} spotlight={0.3} ambient={motionOff() ? 0 : view.run ? 0.9 : 0.55} fps={30} tempo={view.run ? 2 : 1} clickPulse={!motionOff()} intro={!motionOff()} edgeFade={0.12} />
        <main class="playfield">
          <Opponent view={view} side={opp} name={names[opp]} />
          {theirArea}
          <div class="divider" />
          {myArea}
        </main>
      </div>
      <footer class="dock">
        <div class="enc-zone">
          {!view.winner && (ice?.rezzed ? <Encounter view={view} render={render} onTap={tap} ice={lastIce?.cid === ice.cid && (view.encounters || view.run?.phase === "encounter-ice") ? lastIce : ice} skip={skipped} onToggle={!watching && side === "runner" && view.encounters && !(prompt && ptype !== "run") ? toggleSub : undefined} /> : lastIce && <Encounter view={view} render={render} onTap={tap} ice={lastIce} passed />)}
          {!view.winner && !watching && side === "runner" && view.encounters && ice?.rezzed && !(prompt && ptype !== "run") && <Breakers view={view} stamp={live} probe={prober} side={side} ice={ice} send={send} onTap={tap} disabled={disabled} skip={skipped} onPartial={breakSome} />}
        </div>
        {panel}
        <MeBar view={view} side={side} name={names[side]} />
        <div class="hand" data-anchor={`${side}-hand`}>
          {hand.map((c) => (
            <CardTile key={c.cid} card={c} owner onTap={tap} selectable={selectable.has(c.cid)} />
          ))}
          {watching && hand.length === 0 && Array.from({ length: me["hand-count"] ?? 0 }, () => <div class={`tile back ${side}`}><span class="back-label">{side === "corp" ? "CORP" : "RUN"}</span></div>)}
          {hand.length === 0 && !(watching && me["hand-count"]) && <span class="hint">{side === "runner" ? "Empty grip" : "HQ is empty"}</span>}
        </div>
      </footer>
      {deckOpen && session.deckFor(side) && <DeckView deck={session.deckFor(side)!} format={deckFormat(session.lobby.format) ?? "casual"} onClose={() => setDeckOpen(false)} />}
      {zone && (
        <ZoneSheet
          zone={zone}
          view={view}
          viewer={side}
          selectable={selectable}
          onTap={tap}
          onClose={() => {
            setZone(null);
            autoZone.current = false;
          }}
        />
      )}
      {current && (
        <CardSheet confirm={stagedConfirm} card={current} view={view} stamp={live} probe={prober} side={side} db={db} send={send} disabled={disabled} readOnly={watching} index={Math.max(0, position)} count={siblings.length} slide={slide} onStep={step} onClose={closeCard} neighbors={{ prev: siblings[position - 1], next: siblings[position + 1] }}
          siblings={siblings}
          onJump={(c) => {
            setSlide(undefined);
            setSelected(c);
          }}
        />
      )}
      {session.lobby.tutorial && <Coach session={session} view={view} side={side} />}
      {showLog && <Log view={view} render={render} names={names} onSay={(t) => session.say(t, side)} onClose={() => setShowLog(false)} />}
    </div>
    </Verified.Provider>
  );
}
