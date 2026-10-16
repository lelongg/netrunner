import { cardImage } from "../engine";
import type { Side } from "../engine";
import { anchor, animate, scoreSegment, banner, burst, buzz, coins, done, flash, layer, mid, node, place, punch, rays, rectOf, reduced, ring, shake, tileEl, visible, type Point, type Tone } from "./core";

interface Info {
  cid: unknown;
  zone: string;
  holder: Side;
  owner: Side;
  code?: string;
  type?: string;
  title?: string;
  facedown: boolean;
}

interface Move {
  cid: unknown;
  from?: Info;
  to?: Info;
  src: DOMRect | null;
  clone: HTMLElement | null;
}

export interface Plan {
  moves: Move[];
}

const SKIP = new Set(["basic-action-card", "prompt-state", "properties", "user", "toast", "abilities", "subroutines", "keep", "quote", "aid"]);
const MAX_MOVES = 10;

export function collect(view: any): Map<unknown, Info> {
  const out = new Map<unknown, Info>();
  for (const holder of ["corp", "runner"] as Side[]) {
    const walk = (x: any) => {
      if (!x || typeof x !== "object") return;
      if (Array.isArray(x)) return x.forEach(walk);
      if (x.cid != null && (x.zone || x.type === "Identity")) {
        out.set(x.cid, {
          cid: x.cid,
          zone: (x.zone ?? ["identity"]).join("/"),
          holder,
          owner: x.side === "Corp" ? "corp" : "runner",
          code: x.code,
          type: x.type,
          title: x.title,
          facedown: !!x.facedown,
        });
        walk(x.hosted);
        return;
      }
      for (const [k, v] of Object.entries(x)) if (!SKIP.has(k)) walk(v);
    };
    walk(view?.[holder]);
  }
  return out;
}

const head = (zone?: string) => zone?.split("/")[0];

function pile(name: string): Element | null {
  const el = anchor(name);
  return el?.querySelector(".tile") ?? el;
}

function zoneAnchor(info: Info | undefined): Element | null {
  if (!info) return null;
  const z = head(info.zone);
  if (z === "hand") return anchor(`${info.holder}-hand`);
  if (z === "deck") return pile(`${info.holder}-deck`);
  if (z === "discard") return pile(`${info.holder}-discard`);
  if (z === "scored") return anchor(`${info.holder}-points`);
  return null;
}

export function prepare(prev: Map<unknown, Info>, next: Map<unknown, Info>): Plan {
  const moves: Move[] = [];
  const ids = new Set<unknown>([...prev.keys(), ...next.keys()]);
  for (const cid of ids) {
    const from = prev.get(cid);
    const to = next.get(cid);
    if (from?.zone === to?.zone) continue;
    if (!to && head(from?.zone) === "identity") continue;
    moves.push({ cid, from, to, src: null, clone: null });
    if (moves.length > MAX_MOVES) return { moves: [] };
  }
  for (const m of moves) {
    const el = tileEl(m.cid);
    const r = rectOf(el);
    if (el && visible(r)) {
      m.src = r;
      m.clone = el.cloneNode(true) as HTMLElement;
    } else {
      const fallback = m.from ? zoneAnchor(m.from) : m.to && head(m.to.zone) === "hand" ? pile(`${m.to.holder}-deck`) : m.to ? (anchor(`${m.to.owner}-hand`) ?? pile(`${m.to.owner}-deck`)) : null;
      const fr = rectOf(fallback);
      m.src = visible(fr) ? fr : null;
    }
  }
  return { moves };
}

function synth(info: Info | undefined, faceUp: boolean): HTMLElement {
  const el = document.createElement("div");
  const side = info?.owner === "corp" ? "corp" : "runner";
  if (faceUp && info?.code) {
    el.className = `tile ${side}`;
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.src = cardImage(info.code, "small")!;
    img.alt = "";
    img.className = "fx-card-img";
    el.appendChild(img);
  } else {
    el.className = `tile back ${side}`;
    const label = document.createElement("span");
    label.className = "back-label";
    label.textContent = side === "corp" ? "CORP" : "RUN";
    el.appendChild(label);
  }
  return el;
}

function ghostFrom(face: HTMLElement, r: DOMRect, cls = ""): HTMLElement {
  const ghost = node(`fx-ghost ${cls}`);
  place(ghost, r);
  face.classList.remove("selectable", "playable", "new", "selected");
  face.removeAttribute("data-cid");
  face.style.opacity = "";
  ghost.appendChild(face);
  return ghost;
}

function twoSided(front: HTMLElement, info: Info | undefined, r: DOMRect): { ghost: HTMLElement; flip: HTMLElement } {
  const ghost = node("fx-ghost");
  place(ghost, r);
  const flip = node("fx-flip", ghost);
  const a = node("fx-face fx-front", flip);
  const b = node("fx-face fx-back", flip);
  front.removeAttribute("data-cid");
  front.style.opacity = "";
  a.appendChild(front);
  b.appendChild(synth(info, false));
  return { ghost, flip };
}

type Kind = "play" | "score" | "steal" | "trash" | "draw" | "install" | "move";

function kindOf(m: Move, me: Side): Kind {
  const from = head(m.from?.zone);
  const to = head(m.to?.zone);
  const type = m.to?.type ?? m.from?.type;
  if (to === "scored") return m.to?.holder === "runner" && m.to.owner === "corp" ? "steal" : "score";
  if ((type === "Event" || type === "Operation") && (from === "hand" || (!m.from && m.to?.holder !== me)) && to !== "hand") return "play";
  if (to === "discard") return "trash";
  if (to === "hand" && (!m.from || from === "deck")) return "draw";
  if ((to === "servers" || to === "rig") && (from === "hand" || !m.from)) return "install";
  return "move";
}

let cinema: Promise<void> = Promise.resolve();

function queue(fn: () => Promise<void>) {
  cinema = cinema.then(fn, fn);
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function flyTo(ghost: HTMLElement, from: DOMRect, to: DOMRect, opts: { duration?: number; delay?: number; lift?: number; tilt?: number; ease?: any; endScale?: number } = {}) {
  const dx = to.left - from.left;
  const dy = to.top - from.top;
  const sx = (to.width / from.width) * (opts.endScale ?? 1);
  const sy = (to.height / from.height) * (opts.endScale ?? 1);
  const lift = opts.lift ?? Math.min(80, Math.hypot(dx, dy) * 0.25);
  const tilt = opts.tilt ?? (dx > 0 ? 8 : -8);
  return animate(
    ghost,
    {
      x: [0, dx * 0.5, dx],
      y: [0, dy * 0.5 - lift, dy],
      scaleX: [1, ((1 + sx) / 2) * 1.12, sx],
      scaleY: [1, ((1 + sy) / 2) * 1.12, sy],
      rotate: [0, tilt, 0],
    },
    { duration: opts.duration ?? 0.52, delay: opts.delay ?? 0, ease: opts.ease ?? [0.35, 0.05, 0.25, 1] },
  );
}

function hide(el: HTMLElement | null) {
  if (el) el.style.opacity = "0";
}

function show(el: HTMLElement | null) {
  if (el) el.style.opacity = "";
}

const sideTone = (owner?: Side): Tone => (owner === "corp" ? "blue" : "red");

function land(el: HTMLElement | null, info: Info | undefined, strong: boolean) {
  show(el);
  const r = rectOf(el);
  if (!el || !visible(r)) return;
  punch(el, strong ? 1.22 : 1.12);
  const at = mid(r);
  ring(at, info?.type === "ICE" ? "blue" : sideTone(info?.owner), strong ? 150 : 100);
  burst(at, info?.type === "ICE" ? "blue" : sideTone(info?.owner), strong ? 16 : 8, strong ? 70 : 45, { size: 4, gravity: 10 });
  if (info?.type === "ICE") shake(0.45);
}

function stage(width: number) {
  const w = Math.min(width, innerWidth * 0.62, 280);
  const h = w * (88 / 63);
  return new DOMRect((innerWidth - w) / 2, Math.max(60, (innerHeight - h) / 2 - 30), w, h);
}

function bigFace(info: Info | undefined, fallback: HTMLElement): HTMLElement {
  if (!info?.code) return fallback;
  const el = document.createElement("div");
  el.className = `tile fx-big ${info.owner === "corp" ? "corp" : "runner"}`;
  const img = document.createElement("img");
  img.alt = "";
  img.className = "fx-card-img";
  img.crossOrigin = "anonymous";
  img.src = cardImage(info.code, "small")!;
  const hi = new Image();
  hi.crossOrigin = "anonymous";
  hi.onload = () => (img.src = hi.src);
  hi.src = cardImage(info.code, "large")!;
  el.appendChild(img);
  return el;
}

async function showcase(m: Move, kind: Kind, me: Side) {
  const info = m.to ?? m.from;
  const destEl = tileEl(m.cid);
  const target = rectOf(destEl);
  const dest = visible(target) ? target : rectOf(zoneAnchor(m.to));
  const src = m.src ?? new DOMRect(innerWidth / 2 - 30, innerHeight + 20, 60, 84);
  if (kind === "steal" && (m.to?.holder ?? m.from?.holder) === me) {
    const seen = rectOf(document.querySelector(".prompt img"));
    const from = visible(seen) ? mid(seen) : visible(src) ? mid(src) : ([innerWidth / 2, innerHeight / 2] as Point);
    const pr = rectOf(scoreSegment("runner"));
    banner("Stolen", info?.title ?? "", "red", { size: "lg", hold: 0.4 });
    ring(from, "red", 160);
    burst(from, "red", 24, 90, { size: 6, gravity: 0, shards: true });
    if (visible(pr)) for (let i = 0; i < 3; i++) setTimeout(() => coins(from, mid(pr), 6, "red"), 90 * i);
    buzz([40, 40, 120]);
    return;
  }
  const big = stage(260);
  hide(destEl);
  const ghost = ghostFrom(bigFace(info, m.clone ?? synth(info, true)), big, "fx-showcase");
  const sx = src.width / big.width;
  const sy = src.height / big.height;
  const tone: Tone = kind === "score" ? "gold" : kind === "steal" ? "red" : sideTone(info?.owner);
  const mine = (m.to?.holder ?? m.from?.holder) === me;
  const hold = kind === "play" ? (mine ? 0.35 : 0.9) : 0.9;
  ghost.style.transformOrigin = "0 0";
  await animate(ghost, { x: [src.left - big.left, 0], y: [src.top - big.top, 0], scaleX: [sx, 1], scaleY: [sy, 1], rotate: [mine ? 0 : -12, 0], opacity: [0.4, 1] }, { type: "spring", visualDuration: 0.42, bounce: 0.28 }).finished;
  const center = mid(big);
  if (kind === "play") {
    ring(center, tone, big.width * 1.6);
    burst(center, tone, 14, big.width * 0.8, { size: 5, gravity: 0 });
    buzz(25);
  } else {
    rays(center, tone, big.width * 2.6, hold + 0.9);
    ring(center, tone, big.width * 2);
    ring(center, tone, big.width * 1.4, 0.12);
    burst(center, tone, 30, big.width * 1.1, { size: 7, gravity: 30 });
    flash(kind === "steal" ? "red" : "gold", 0.35);
    shake(0.6);
    buzz([40, 40, 40, 40, 120]);
    const points = info?.title ?? "";
    banner(kind === "steal" ? "Stolen" : "Scored", points, kind === "steal" ? "red" : "gold", { size: "xl", hold: hold + 0.2 });
  }
  const glow = node(`fx-glow tone-${tone}`, ghost);
  animate(glow, { opacity: [0, 1, 0.6] }, { duration: 0.5 });
  await animate(ghost, { scaleX: [1, 1.04], scaleY: [1, 1.04] }, { duration: hold, ease: "easeInOut" }).finished;
  glow.remove();
  if (kind === "score" || kind === "steal") {
    const points = scoreSegment(m.to?.holder ?? "corp");
    const pr = rectOf(points);
    const to = visible(pr) ? mid(pr) : null;
    if (to) {
      coins(center, to, 8, kind === "steal" ? "red" : "gold");
      for (let i = 0; i < 3; i++) setTimeout(() => coins(center, to, 6, kind === "steal" ? "red" : "gold"), 90 * (i + 1));
    }
    burst(center, tone, 36, big.width * 0.9, { size: 6, gravity: 0, shards: true });
    await animate(ghost, { scaleX: [1.04, 1.5], scaleY: [1.04, 1.5], opacity: [1, 0], filter: ["brightness(1)", "brightness(3)"] }, { duration: 0.35, ease: "easeOut" }).finished;
    ghost.remove();
    setTimeout(() => {
      show(destEl);
      if (destEl && visible(rectOf(destEl))) animate(destEl, { scale: [0, 1.2, 1], opacity: [0, 1] }, { duration: 0.5, ease: "easeOut" });
    }, 600);
    return;
  }
  if (!dest || !visible(dest)) {
    done(animate(ghost, { opacity: [1, 0], scaleX: [1.04, 0.6], scaleY: [1.04, 0.6] }, { duration: 0.3 }), ghost);
    show(destEl);
    return;
  }
  const anim = animate(ghost, { x: [0, dest.left - big.left], y: [0, dest.top - big.top], scaleX: [1.04, dest.width / big.width], scaleY: [1.04, dest.height / big.height], rotate: [0, 6, 0], opacity: [1, 1, kind === "play" && !destEl ? 0 : 1] }, { duration: 0.42, ease: [0.5, 0, 0.3, 1] });
  await anim.finished;
  ghost.remove();
  if (kind === "play") {
    show(destEl);
    if (visible(rectOf(destEl))) punch(destEl, 1.1);
  } else land(destEl, info, true);
}

export function play(plan: Plan, me: Side) {
  if (!plan.moves.length) return;
  if (reduced()) return;
  let i = 0;
  for (const m of plan.moves) {
    const kind = kindOf(m, me);
    const info = m.to ?? m.from;
    if (kind === "play" || kind === "score" || kind === "steal") {
      queue(() => showcase(m, kind, me));
      continue;
    }
    const destEl = tileEl(m.cid);
    const dr = rectOf(destEl);
    const dest = visible(dr) ? dr : rectOf(zoneAnchor(m.to));
    const src = m.src;
    if (!src || !dest || !visible(dest)) {
      if (destEl && visible(dr)) animate(destEl, { scale: [0.6, 1], opacity: [0, 1] }, { type: "spring", visualDuration: 0.35, bounce: 0.4 });
      continue;
    }
    const delay = i++ * 0.07;
    if (kind === "draw") {
      const face = synth(info, !!info?.code);
      const { ghost, flip } = twoSided(face, info, src);
      ghost.style.transformOrigin = "0 0";
      hide(destEl);
      animate(flip, { transformPerspective: 600, rotateY: [180, 0] }, { duration: 0.45, delay: delay + 0.08, ease: [0.3, 0.6, 0.3, 1], keep: true });
      flyTo(ghost, src, dest, { delay, duration: 0.5, lift: 50, tilt: 0 }).finished.then(() => {
        ghost.remove();
        show(destEl);
        if (destEl) animate(destEl, { y: [-6, 0] }, { type: "spring", visualDuration: 0.3, bounce: 0.5 });
      });
      continue;
    }
    const face = info?.code ? synth(info, true) : (m.clone ?? synth(info, false));
    const ghost = ghostFrom(face, src, kind === "trash" ? "fx-burn" : "");
    ghost.style.transformOrigin = "0 0";
    hide(destEl);
    if (kind === "trash") {
      burst(mid(src), "orange", 10, 40, { size: 4, gravity: -30 });
      flyTo(ghost, src, dest, { delay, duration: 0.55, tilt: 18, lift: 40 }).finished.then(() => {
        ghost.remove();
        show(destEl);
        burst(mid(dest), "orange", 8, 30, { size: 3, gravity: -40 });
      });
      continue;
    }
    flyTo(ghost, src, dest, { delay, duration: kind === "install" ? 0.5 : 0.45 }).finished.then(() => {
      ghost.remove();
      if (kind === "install") land(destEl, info, info?.type === "ICE" || info?.owner !== me);
      else show(destEl);
    });
  }
  layer();
}
