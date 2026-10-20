import { type Point, anchor, animate, burst, buzz, coins, done, flash, floater, node, pointOf, punch, rays, reduced, ring, shake, slash, stamp, vignette } from "./core";

const SVG = "http://www.w3.org/2000/svg";

export function hedgeFund(card: DOMRect) {
  if (reduced()) return;
  const el = node("fx-sig fx-chart");
  el.style.left = `${card.left - 20}px`;
  el.style.top = `${card.top + card.height * 0.15}px`;
  el.style.width = `${card.width + 40}px`;
  el.style.height = `${card.height * 0.7}px`;
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 100 60");
  svg.setAttribute("preserveAspectRatio", "none");
  const line = document.createElementNS(SVG, "polyline");
  line.setAttribute("points", "0,54 14,46 24,50 38,34 48,38 62,22 72,26 86,10 100,4");
  line.setAttribute("pathLength", "1");
  svg.appendChild(line);
  el.appendChild(svg);
  animate(line, { strokeDashoffset: [1, 0] }, { duration: 0.6, ease: [0.3, 0, 0.2, 1] });
  const tip: Point = [card.left + card.width + 20, card.top + card.height * 0.15 + card.height * 0.7 * 0.07];
  setTimeout(() => {
    burst(tip, "gold", 18, 60, { size: 5, gravity: 60 });
    const to = pointOf(anchor("corp-credits"));
    if (to) coins(tip, to, 8, "gold");
    buzz([15, 15, 15, 15, 40]);
  }, 560);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.5, times: [0, 0.8, 1] }), el);
}

export function orbitalStrike(target: Point) {
  if (reduced()) return;
  const beam = node("fx-sig fx-beam");
  beam.style.left = `${target[0] - 9}px`;
  beam.style.height = `${target[1]}px`;
  const core = node("fx-beam-core", beam);
  animate(beam, { scaleY: [0, 1], opacity: [1, 1] }, { duration: 0.22, ease: [0.6, 0, 0.9, 0.4] });
  animate(core, { scaleX: [0.4, 1.6, 0.6] }, { duration: 0.7, times: [0, 0.35, 1] });
  setTimeout(() => {
    flash("white", 0.55, 0.35);
    burst(target, "red", 30, 110, { size: 7, shards: true, gravity: 60 });
    burst(target, "gold", 14, 70, { size: 4, gravity: -40 });
    vignette("red", 0.5);
    shake(1);
    buzz([90, 30, 140]);
  }, 220);
  done(animate(beam, { opacity: [1, 1, 0] }, { duration: 0.9, times: [0, 0.6, 1] }), beam);
}

export function transmission(from: Point, to: Point) {
  if (reduced()) return Promise.resolve();
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const arc = Math.min(140, Math.hypot(dx, dy) * 0.35);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const packet = node("fx-sig fx-packet");
  packet.style.left = `${from[0]}px`;
  packet.style.top = `${from[1]}px`;
  for (let i = 1; i <= 5; i++) {
    const t = node("fx-packet-trail", packet);
    t.style.setProperty("--i", String(i));
  }
  const flight = animate(packet, { x: [0, dx * 0.5, dx], y: [0, dy * 0.5 - arc, dy], rotate: [angle - 40, angle, angle + 30], scale: [0.6, 1.2, 0.8] }, { duration: 0.6, ease: [0.4, 0, 0.3, 1] });
  return flight.finished.then(() => {
    burst(to, "blue", 20, 60, { size: 4, gravity: 0, shards: true });
    packet.remove();
  });
}

function box(cls: string, r: DOMRect, pad = 0) {
  const el = node(`fx-sig ${cls}`);
  el.style.left = `${r.left - pad}px`;
  el.style.top = `${r.top - pad}px`;
  el.style.width = `${r.width + pad * 2}px`;
  el.style.height = `${r.height + pad * 2}px`;
  return el;
}

const REEL = ["7", "♦", "★", "♣", "♥", "♠", "★", "♦", "7"];

export function sureGamble(card: DOMRect) {
  if (reduced()) return;
  const el = box("fx-reels", new DOMRect(card.left + card.width * 0.08, card.top + card.height * 0.58, card.width * 0.84, card.height * 0.22));
  const cell = card.height * 0.22 - 10;
  for (let i = 0; i < 3; i++) {
    const reel = node("fx-reel", el);
    const strip = node("fx-reel-strip", reel);
    for (const s of [...REEL, ...REEL]) {
      const c = node(s === "7" ? "fx-reel-cell seven" : "fx-reel-cell", strip);
      c.textContent = s;
      c.style.height = `${cell}px`;
    }
    animate(strip, { y: ["0%", `-${(100 * (REEL.length * 2 - 1)) / (REEL.length * 2)}%`] }, { duration: 0.7 + i * 0.25, ease: [0.2, 0.6, 0.3, 1] });
  }
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    burst([r.left + r.width / 2, r.top + r.height / 2], "gold", 28, 90, { size: 6, gravity: 40 });
    flash("gold", 0.25, 0.4);
    buzz([20, 20, 20, 60]);
  }, 1250);
  done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: 2, times: [0, 0.08, 0.85, 1] }), el);
}

const PAINT = ["#ff3b30", "#f6e03a", "#22d3ee", "#c792ff", "#3ddc84"];

export function creativeCommission(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 7; i++) {
    const splat = node("fx-sig fx-splat");
    const s = 26 + Math.random() * 34;
    splat.style.width = `${s}px`;
    splat.style.height = `${s * (0.7 + Math.random() * 0.5)}px`;
    splat.style.left = `${card.left + Math.random() * card.width - s / 2}px`;
    splat.style.top = `${card.top + Math.random() * card.height - s / 2}px`;
    splat.style.background = PAINT[i % PAINT.length];
    splat.style.borderRadius = `${40 + Math.random() * 30}% ${50 + Math.random() * 30}% ${35 + Math.random() * 30}% ${55 + Math.random() * 30}%`;
    done(animate(splat, { scale: [0, 1.25, 1, 1], opacity: [1, 1, 0.9, 0], rotate: [Math.random() * 90, Math.random() * 90] }, { duration: 1.3, delay: i * 0.07, times: [0, 0.15, 0.3, 1] }), splat);
  }
  buzz([15, 25, 15]);
}

export function neurospike() {
  if (reduced()) return;
  const el = node("fx-sig fx-eeg");
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 200 40");
  svg.setAttribute("preserveAspectRatio", "none");
  const line = document.createElementNS(SVG, "polyline");
  line.setAttribute("points", "0,20 30,20 38,20 42,6 46,34 50,2 54,38 58,20 90,20 98,20 102,8 106,32 110,4 114,36 118,20 150,20 158,20 162,10 166,30 170,6 174,34 178,20 200,20");
  line.setAttribute("pathLength", "1");
  svg.appendChild(line);
  el.appendChild(svg);
  animate(line, { strokeDashoffset: [1, 0] }, { duration: 0.7, ease: "linear" });
  flash("violet", 0.3, 0.5);
  buzz([30, 30, 60, 30, 90]);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.2, times: [0, 0.75, 1] }), el);
}

export function publicTrail(card: DOMRect) {
  if (reduced()) return;
  const to = pointOf(anchor("runner-panel")) ?? [innerWidth / 2, 60];
  const from: Point = [card.left + card.width / 2, card.top + card.height];
  const steps = 7;
  const angle = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI + 90;
  for (let i = 0; i < steps; i++) {
    const k = (i + 1) / (steps + 1);
    const side = i % 2 ? 1 : -1;
    const step = node("fx-sig fx-step");
    const nx = Math.cos(((angle - 90 + 90) * Math.PI) / 180) * 8 * side;
    const ny = Math.sin(((angle - 90 + 90) * Math.PI) / 180) * 8 * side;
    step.style.left = `${from[0] + (to[0] - from[0]) * k + nx}px`;
    step.style.top = `${from[1] + (to[1] - from[1]) * k + ny}px`;
    step.style.rotate = `${angle}deg`;
    done(animate(step, { opacity: [0, 1, 1, 0], scale: [1.4, 1, 1, 1] }, { duration: 1.6, delay: 0.25 + i * 0.12, times: [0, 0.1, 0.7, 1] }), step);
  }
  setTimeout(() => buzz([20, 60, 20]), 900);
}

export function jailbreak(card: DOMRect) {
  if (reduced()) return;
  const el = box("fx-lock", new DOMRect(card.left + card.width / 2 - 34, card.top + card.height / 2 - 40, 68, 80));
  const shackle = node("fx-lock-shackle", el);
  const left = node("fx-lock-body l", el);
  const right = node("fx-lock-body r", el);
  animate(el, { scale: [0.6, 1.1, 1], opacity: [0, 1] }, { duration: 0.3 });
  animate(shackle, { y: [0, 0, -22], rotate: [0, 0, -25] }, { duration: 0.7, times: [0, 0.6, 1], ease: "easeOut" });
  setTimeout(() => {
    animate(left, { x: [0, -40], rotate: [0, -30], opacity: [1, 0] }, { duration: 0.45, ease: "easeOut" });
    animate(right, { x: [0, 40], rotate: [0, 30], opacity: [1, 0] }, { duration: 0.45, ease: "easeOut" });
    animate(shackle, { opacity: [1, 0] }, { duration: 0.4 });
    burst([card.left + card.width / 2, card.top + card.height / 2], "cyan", 24, 80, { size: 5, shards: true, gravity: 40 });
    buzz([20, 20, 80]);
  }, 650);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.3, times: [0, 0.9, 1] }), el);
}

export function overclock(card: DOMRect) {
  if (reduced()) return;
  const el = box("fx-gauge", new DOMRect(card.left + card.width * 0.1, card.top + card.height + 10, card.width * 0.8, 12));
  const fill = node("fx-gauge-fill", el);
  animate(fill, { scaleX: [0, 1] }, { duration: 0.8, ease: [0.4, 0, 0.2, 1] });
  setTimeout(() => {
    animate(el, { x: [0, -3, 3, -2, 2, 0] }, { duration: 0.3 });
    burst([card.left + card.width * 0.9, card.top + card.height + 16], "red", 14, 40, { size: 4, gravity: -60 });
    buzz([10, 10, 10, 10, 40]);
  }, 780);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.5, times: [0, 0.8, 1] }), el);
}

export function seamlessLaunch(card: DOMRect) {
  if (reduced()) return;
  const rocket = node("fx-sig fx-rocket");
  const x = card.left + card.width / 2;
  rocket.style.left = `${x - 9}px`;
  rocket.style.top = `${card.top + card.height - 10}px`;
  animate(rocket, { y: [0, -card.height - 120], scale: [0.8, 1.1] }, { duration: 0.9, ease: [0.5, 0, 0.8, 0.4] });
  for (let i = 0; i < 10; i++) setTimeout(() => burst([x, card.top + card.height - 10 - (card.height + 120) * ((i / 10) ** 1.8)], "orange", 3, 18, { size: 5, gravity: 80 }), i * 80);
  setTimeout(() => {
    burst([x, card.top - 120], "gold", 24, 70, { size: 5, gravity: 30 });
    buzz([20, 40, 80]);
  }, 880);
  done(animate(rocket, { opacity: [1, 1, 0] }, { duration: 1, times: [0, 0.85, 1] }), rocket);
}

const center = (r: DOMRect): Point => [r.left + r.width / 2, r.top + r.height / 2];

const plain = (title: string | undefined) => (title ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function retribution() {
  if (reduced()) return;
  const at = pointOf(anchor("runner-panel")) ?? [innerWidth / 2, 80];
  const el = node("fx-sig fx-reticle");
  el.style.left = `${at[0]}px`;
  el.style.top = `${at[1]}px`;
  animate(el, { scale: [3, 1], rotate: [-90, 0], opacity: [0, 1] }, { type: "spring", visualDuration: 0.4, bounce: 0.2 });
  setTimeout(() => {
    animate(el, { scale: [1, 0.7, 1.4], opacity: [1, 1, 0] }, { duration: 0.35 });
    flash("red", 0.35, 0.3);
    burst(at, "red", 26, 100, { size: 7, shards: true, gravity: 50 });
    ring(at, "red", 180);
    shake(1);
    buzz([60, 20, 120]);
  }, 650);
  setTimeout(() => el.remove(), 1100);
}

export function palisade(r: DOMRect) {
  if (reduced()) return;
  const el = box("fx-stakes", new DOMRect(r.left - 6, r.top - r.height * 0.15, r.width + 12, r.height * 1.15));
  for (let i = 0; i < 6; i++) {
    const stake = node("fx-stake", el);
    stake.style.height = `${82 + ((i * 37) % 18)}%`;
    animate(stake, { scaleY: [0, 1.08, 1] }, { duration: 0.35, delay: 0.05 * i, ease: "easeOut" });
  }
  setTimeout(() => {
    burst([r.left + r.width / 2, r.bottom], "orange", 16, 60, { size: 5, gravity: -20 });
    shake(0.5);
    buzz([20, 20, 20, 20, 40]);
  }, 320);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.3, times: [0, 0.75, 1] }), el);
}

export function bran(r: DOMRect) {
  if (reduced()) return;
  const scan = box("fx-scan", new DOMRect(r.left - 14, r.top, r.width + 28, 6));
  animate(scan, { y: [0, r.height, 0, r.height] }, { duration: 1.1, ease: "easeInOut" });
  done(animate(scan, { opacity: [0, 1, 1, 0] }, { duration: 1.2, times: [0, 0.1, 0.85, 1] }), scan);
  const [cx, cy] = center(r);
  for (let i = -1; i <= 1; i++) {
    const eye = node("fx-sig fx-eye");
    eye.style.left = `${cx + i * r.width * 0.26}px`;
    eye.style.top = `${cy - r.height * 0.12}px`;
    done(animate(eye, { scale: [0, 1.4, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }, { duration: 1.4, delay: 0.9 + (i + 1) * 0.08, times: [0, 0.15, 0.3, 0.8, 1] }), eye);
  }
  setTimeout(() => buzz([30, 60, 30, 60, 30]), 900);
}

const BULBS = ["#ff3b30", "#f6e03a", "#22d3ee", "#c792ff", "#3ddc84"];

export function funhouse(r: DOMRect) {
  if (reduced()) return;
  const pad = 8;
  const w = r.width + pad * 2;
  const h = r.height + pad * 2;
  const n = 16;
  for (let i = 0; i < n; i++) {
    let d = (i / n) * (w + h) * 2;
    let x: number, y: number;
    if (d < w) [x, y] = [d, 0];
    else if ((d -= w) < h) [x, y] = [w, d];
    else if ((d -= h) < w) [x, y] = [w - d, h];
    else [x, y] = [0, h - (d - w)];
    const bulb = node("fx-sig fx-bulb");
    bulb.style.left = `${r.left - pad + x}px`;
    bulb.style.top = `${r.top - pad + y}px`;
    bulb.style.color = BULBS[i % BULBS.length];
    done(animate(bulb, { opacity: [0, 1, 0.2, 1, 0.2, 1, 0], scale: [0, 1.3, 1, 1.3, 1, 1.3, 0] }, { duration: 1.6, delay: (i % 2) * 0.12 }), bulb);
  }
  setTimeout(() => buzz([15, 30, 15, 30, 15]), 200);
}

export function karuna(at: Point) {
  if (reduced()) return;
  slash(at, "violet", 150, -45);
  setTimeout(() => {
    slash(at, "violet", 150, 45);
    ring(at, "violet", 160);
    flash("violet", 0.25, 0.35);
    buzz([40, 30, 40]);
  }, 160);
}

export function urtica(at: Point) {
  if (reduced()) return;
  for (let i = 0; i < 8; i++) setTimeout(() => slash(at, "green", 50 + Math.random() * 60, Math.random() * 360), i * 40);
  burst(at, "green", 22, 100, { size: 8, shards: true, gravity: 20 });
  ring(at, "green", 150);
}

export function tithe(ice: Point) {
  if (reduced()) return;
  const from = pointOf(anchor("runner-panel")) ?? [innerWidth / 2, innerHeight - 120];
  coins(from, ice, 1, "gold");
  setTimeout(() => {
    ring(ice, "gold", 110);
    burst(ice, "gold", 16, 50, { size: 5, gravity: 0 });
    floater([ice[0], ice[1] - 20], "Tithe +1", "gold", 50, true);
    const to = pointOf(anchor("corp-credits"));
    if (to) coins(ice, to, 1, "gold");
  }, 600);
}

export function anoeticVoid(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const hole = node("fx-sig fx-void");
  hole.style.left = `${at[0]}px`;
  hole.style.top = `${at[1]}px`;
  animate(hole, { scale: [0, 1.5, 1.3, 0], rotate: [0, 200] }, { duration: 1.5, times: [0, 0.3, 0.8, 1], ease: "easeInOut" });
  setTimeout(() => hole.remove(), 1550);
  for (let i = 0; i < 22; i++) {
    const mote = node("fx-sig fx-mote");
    const a = Math.random() * Math.PI * 2;
    const d = 90 + Math.random() * 80;
    mote.style.left = `${at[0]}px`;
    mote.style.top = `${at[1]}px`;
    done(animate(mote, { x: [Math.cos(a) * d, Math.cos(a + 1.2) * d * 0.4, 0], y: [Math.sin(a) * d, Math.sin(a + 1.2) * d * 0.4, 0], opacity: [0, 1, 0], scale: [1, 1, 0.2] }, { duration: 0.9, delay: 0.1 + Math.random() * 0.4, ease: "easeIn" }), mote);
  }
  vignette("violet", 0.5);
  buzz([20, 20, 20, 20, 20, 80]);
}

export function regolith(r: DOMRect) {
  if (reduced()) return;
  const at: Point = [r.left + r.width / 2, r.top + r.height * 0.4];
  for (let i = 0; i < 3; i++)
    setTimeout(() => {
      slash(at, "gold", 34, -60 + i * 30);
      burst(at, "orange", 12, 70, { size: 7, shards: true, gravity: 120 });
      burst(at, "gold", 6, 30, { size: 3, gravity: 0 });
      buzz(25);
    }, i * 200);
}

export function mayfly(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 14; i++) {
    const fly = node("fx-sig fx-firefly");
    const [x, y] = [r.left + Math.random() * r.width, r.top + r.height * (0.4 + Math.random() * 0.6)];
    fly.style.left = `${x}px`;
    fly.style.top = `${y}px`;
    const xs = [0, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 90, (Math.random() - 0.5) * 120];
    const ys = [0, -30 - Math.random() * 30, -60 - Math.random() * 40, -110 - Math.random() * 50];
    done(animate(fly, { x: xs, y: ys, opacity: [0, 1, 0.3, 1, 0], scale: [0.5, 1, 0.8, 1, 0.4] }, { duration: 1.6 + Math.random() * 0.5, delay: i * 0.06, ease: "easeInOut" }), fly);
  }
}

export function botulus(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 10; i++) {
    const b = node("fx-sig fx-bubble");
    const s = 8 + Math.random() * 14;
    b.style.width = `${s}px`;
    b.style.height = `${s}px`;
    b.style.left = `${r.left + Math.random() * r.width - s / 2}px`;
    b.style.top = `${r.bottom - s}px`;
    const rise = r.height * (0.6 + Math.random() * 0.6);
    done(animate(b, { y: [0, -rise], x: [0, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20], scale: [0.3, 1, 1.4], opacity: [0, 1, 0] }, { duration: 1.1 + Math.random() * 0.5, delay: i * 0.08, ease: "easeOut" }), b);
  }
  setTimeout(() => burst(center(r), "green", 14, 60, { size: 5, gravity: -30 }), 700);
}

export function leech(from: Point, to: Point) {
  if (reduced()) return;
  for (let i = 0; i < 4; i++) {
    const drop = node("fx-sig fx-drop");
    drop.style.left = `${from[0]}px`;
    drop.style.top = `${from[1]}px`;
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    done(animate(drop, { x: [0, dx * 0.5 + (i - 1.5) * 12, dx], y: [0, dy * 0.5 - 40, dy], opacity: [0, 1, 1, 0], scale: [0.6, 1.2, 0.6] }, { duration: 0.7, delay: i * 0.1, ease: [0.4, 0, 0.3, 1] }), drop);
  }
  setTimeout(() => burst(to, "green", 10, 36, { size: 4, gravity: -20 }), 800);
  burst(from, "green", 8, 30, { size: 3, gravity: 30 });
}

export function carmen(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 6; i++) {
    const s = node("fx-sig fx-streak");
    const w = r.width * (0.8 + Math.random() * 0.8);
    s.style.width = `${w}px`;
    s.style.left = `${r.left - w}px`;
    s.style.top = `${r.top + r.height * (0.15 + i * 0.14)}px`;
    done(animate(s, { x: [0, r.width + w * 1.6], opacity: [0, 1, 0] }, { duration: 0.4, delay: i * 0.05, ease: "easeIn" }), s);
  }
  setTimeout(() => buzz([10, 10, 40]), 250);
}

export function docklandsPass(r: DOMRect) {
  if (reduced()) return;
  const el = box("fx-pass", new DOMRect(r.left - 10, r.top + r.height * 0.3, r.width + 20, r.height * 0.4));
  el.textContent = "HQ +1";
  animate(el, { scale: [1.8, 0.95, 1], rotate: [-14, -6], opacity: [0, 1] }, { duration: 0.35, ease: "easeOut" });
  setTimeout(() => {
    ring(center(r), "blue", 130);
    buzz(40);
  }, 300);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.4, times: [0, 0.8, 1] }), el);
}

export function cleaver(at: Point, iceEl: HTMLElement | null) {
  if (reduced()) return;
  slash(at, "orange", 220, -80);
  flash("white", 0.3, 0.25);
  punch(iceEl, 0.86);
  shake(1.1);
  burst(at, "orange", 20, 110, { size: 8, shards: true, gravity: 60 });
}

export function dirtyLaundry(card: DOMRect) {
  if (reduced()) return;
  const at = center(card);
  const drum = node("fx-sig fx-drum");
  drum.style.left = `${at[0]}px`;
  drum.style.top = `${at[1]}px`;
  animate(drum, { rotate: [0, 720], scale: [0.3, 1, 1, 0.8] }, { duration: 1.3, ease: [0.3, 0, 0.4, 1] });
  done(animate(drum, { opacity: [0, 1, 1, 0] }, { duration: 1.4, times: [0, 0.1, 0.8, 1] }), drum);
  for (let i = 0; i < 12; i++) {
    const b = node("fx-sig fx-bubble");
    const s = 10 + Math.random() * 18;
    b.style.width = `${s}px`;
    b.style.height = `${s}px`;
    b.style.left = `${at[0] - s / 2}px`;
    b.style.top = `${at[1] - s / 2}px`;
    b.style.filter = "hue-rotate(150deg)";
    const a = Math.random() * Math.PI * 2;
    const d = card.width * (0.5 + Math.random() * 0.6);
    done(animate(b, { x: [0, Math.cos(a) * d], y: [0, Math.sin(a) * d - 40], scale: [0.2, 1, 1.3], opacity: [0, 1, 0] }, { duration: 1.2, delay: 0.3 + Math.random() * 0.4, ease: "easeOut" }), b);
  }
  setTimeout(() => {
    const to = pointOf(anchor("runner-credits"));
    if (to) coins(at, to, 5, "gold");
    buzz([15, 15, 15, 15, 15, 60]);
  }, 1100);
}

export function stimhack(card: DOMRect) {
  if (reduced()) return;
  const el = box("fx-syringe", new DOMRect(card.right - 10, card.top + card.height * 0.35, card.width * 0.9, 16));
  node("fx-syringe-fill", el);
  animate(el, { x: [60, 0], opacity: [0, 1] }, { duration: 0.25, ease: "easeOut" });
  animate(el.firstElementChild!, { scaleX: [1, 0] }, { duration: 0.5, delay: 0.3, ease: "easeIn" });
  setTimeout(() => {
    flash("violet", 0.4, 0.4);
    vignette("violet", 0.5);
    burst(center(card), "violet", 24, 100, { size: 6, gravity: 0 });
    ring(center(card), "violet", card.width * 1.8);
    buzz([30, 30, 30, 30, 120]);
    const to = pointOf(anchor("runner-credits"));
    if (to) floater([to[0], to[1] - 30], "+9 run", "violet", 40, true);
  }, 800);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.2, times: [0, 0.75, 1] }), el);
}

export function hardHittingNews(card: DOMRect) {
  if (reduced()) return;
  const paper = box("fx-paper", new DOMRect(card.left - card.width * 0.25, card.top + card.height * 0.25, card.width * 1.5, card.height * 0.5));
  paper.innerHTML = "<b>BREAKING</b><i></i><i></i><i></i>";
  animate(paper, { rotate: [-720, -6], scale: [0.1, 1.08, 1] }, { duration: 0.75, ease: [0.2, 0.7, 0.3, 1] });
  setTimeout(() => {
    shake(0.7);
    buzz([60, 30, 60]);
    burst(center(card), "red", 14, 80, { size: 5, shards: true, gravity: 40 });
  }, 720);
  done(animate(paper, { opacity: [1, 1, 0] }, { duration: 1.9, times: [0, 0.8, 1] }), paper);
}

export function bioticLabor(card: DOMRect) {
  if (reduced()) return;
  const [cx, cy] = center(card);
  const n = 12;
  for (let i = 0; i < n; i++) {
    for (const phase of [0, Math.PI]) {
      const dot = node("fx-sig fx-helix");
      dot.style.left = `${cx}px`;
      dot.style.top = `${card.top + (card.height * (i + 0.5)) / n}px`;
      dot.style.color = phase ? "#3ddc84" : "#7fb0ff";
      const xs = Array.from({ length: 9 }, (_, k) => Math.sin(phase + i * 0.6 + (k / 8) * Math.PI * 2) * card.width * 0.42);
      done(animate(dot, { x: xs, opacity: [0, 1, 1, 0] }, { duration: 1.4, delay: i * 0.03, ease: "linear" }), dot);
    }
  }
  setTimeout(() => {
    floater([cx, cy], "+2 clicks", "green", 60, true);
    buzz([20, 40, 20, 40]);
  }, 700);
}

export function accountSiphon(card: DOMRect) {
  if (reduced()) return;
  const from = pointOf(anchor("corp-credits"));
  const to = pointOf(anchor("runner-credits"));
  if (!from || !to) return;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const pipe = node("fx-sig fx-pipe");
  pipe.style.left = `${from[0]}px`;
  pipe.style.top = `${from[1]}px`;
  pipe.style.width = `${Math.hypot(dx, dy)}px`;
  pipe.style.rotate = `${(Math.atan2(dy, dx) * 180) / Math.PI}deg`;
  animate(pipe, { scaleX: [0, 1] }, { duration: 0.35, ease: "easeOut" });
  done(animate(pipe, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.8, 1] }), pipe);
  setTimeout(() => {
    coins(from, to, 5, "gold");
    ring(from, "red", 80);
    buzz([20, 20, 20, 20, 20]);
  }, 350);
}

export function ipo(card: DOMRect) {
  if (reduced()) return;
  const bell = box("fx-bell", new DOMRect(card.left + card.width / 2 - 26, card.top - 30, 52, 52));
  bell.textContent = "🔔";
  animate(bell, { rotate: [0, 25, -25, 20, -20, 10, 0], scale: [0.5, 1.2, 1] }, { duration: 0.9 });
  done(animate(bell, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.1, 0.8, 1] }), bell);
  for (let i = 0; i < 26; i++) {
    const c = node("fx-sig fx-confetti");
    c.style.left = `${Math.random() * innerWidth}px`;
    c.style.top = "-20px";
    c.style.background = i % 3 ? "#f6e03a" : "#ffb800";
    done(animate(c, { y: [0, innerHeight * (0.5 + Math.random() * 0.4)], rotate: [0, Math.random() * 720], opacity: [1, 1, 0] }, { duration: 1.5 + Math.random() * 0.6, delay: 0.3 + Math.random() * 0.5, ease: "easeIn" }), c);
  }
  setTimeout(() => {
    const to = pointOf(anchor("corp-credits"));
    if (to) floater([to[0], to[1] - 30], "+13", "gold", 50, true);
    buzz([30, 60, 30, 60]);
  }, 500);
}

export function closedAccounts() {
  if (reduced()) return;
  const at = pointOf(anchor("runner-credits"));
  if (!at) return;
  const lock = node("fx-sig fx-freeze");
  lock.style.left = `${at[0]}px`;
  lock.style.top = `${at[1]}px`;
  animate(lock, { scale: [2.4, 1], opacity: [0, 1] }, { type: "spring", visualDuration: 0.35, bounce: 0.3 });
  setTimeout(() => {
    burst(at, "cyan", 22, 70, { size: 6, shards: true, gravity: 60 });
    flash("cyan", 0.25, 0.3);
    buzz([80, 40, 80]);
  }, 500);
  done(animate(lock, { opacity: [1, 1, 0] }, { duration: 1.5, times: [0, 0.75, 1] }), lock);
}

export function diesel(card: DOMRect) {
  if (reduced()) return;
  const x = card.left + card.width / 2;
  for (let i = 0; i < 14; i++)
    setTimeout(() => burst([x + (Math.random() - 0.5) * card.width * 0.4, card.bottom - 4], i % 2 ? "orange" : "red", 4, 30, { size: 7, gravity: -160 }), i * 45);
  setTimeout(() => {
    const deck = pointOf(anchor("runner-deck")) ?? pointOf(anchor("runner-hand"));
    if (deck) ring(deck, "orange", 90);
    buzz([10, 10, 10, 10, 10, 10, 40]);
  }, 400);
}

export function insideJob(card: DOMRect) {
  if (reduced()) return;
  const ghost = box("fx-phantom", card);
  animate(ghost, { y: [0, -innerHeight * 0.45], opacity: [0, 0.8, 0], scale: [1, 0.7] }, { duration: 1.1, ease: [0.4, 0, 0.6, 1] });
  setTimeout(() => ghost.remove(), 1150);
  buzz([10, 80, 10]);
}

export function enigma(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const wheel = node("fx-sig fx-cipher");
  wheel.style.left = `${at[0]}px`;
  wheel.style.top = `${at[1]}px`;
  const glyphs = "?#%&@$?!*?";
  for (let i = 0; i < glyphs.length; i++) {
    const g = node("fx-cipher-glyph", wheel);
    g.textContent = glyphs[i];
    g.style.rotate = `${(i / glyphs.length) * 360}deg`;
  }
  animate(wheel, { rotate: [0, 360], scale: [0.4, 1.1, 1] }, { duration: 1.1, ease: [0.3, 0, 0.3, 1] });
  done(animate(wheel, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.15, 0.8, 1] }), wheel);
  setTimeout(() => buzz([10, 30, 10, 30]), 200);
}

export function tollbooth(r: DOMRect) {
  if (reduced()) return;
  const arm = box("fx-toll", new DOMRect(r.left - 10, r.top + r.height * 0.45, r.width + 20, 12));
  animate(arm, { rotate: [-80, 6, 0] }, { duration: 0.5, ease: "easeOut" });
  setTimeout(() => {
    shake(0.4);
    buzz(50);
    const from = pointOf(anchor("runner-credits"));
    if (from) coins(from, center(r), 3, "gold");
  }, 450);
  done(animate(arm, { opacity: [1, 1, 0] }, { duration: 1.5, times: [0, 0.8, 1] }), arm);
}

export function dailyCasts(r: DOMRect) {
  if (reduced()) return;
  const at: Point = [r.left + r.width / 2, r.top + r.height * 0.3];
  for (let i = 0; i < 4; i++) ring(at, "gold", 50 + i * 40, i * 0.15);
  burst(at, "gold", 8, 30, { size: 3, gravity: 0 });
  buzz([10, 30, 10, 30]);
}

export function globalFood(card: DOMRect) {
  if (reduced()) return;
  const at = center(card);
  const globe = node("fx-sig fx-globe");
  globe.style.left = `${at[0]}px`;
  globe.style.top = `${at[1]}px`;
  animate(globe, { scale: [0.2, 1.1, 1], rotate: [0, 180] }, { duration: 1.2, ease: "easeOut" });
  done(animate(globe, { opacity: [0, 0.9, 0.9, 0] }, { duration: 1.6, times: [0, 0.15, 0.8, 1] }), globe);
  for (let i = 0; i < 10; i++) {
    const leaf = node("fx-sig fx-leaf");
    leaf.style.left = `${at[0]}px`;
    leaf.style.top = `${at[1]}px`;
    const a = (i / 10) * Math.PI * 2;
    const d = card.width * 0.9;
    done(animate(leaf, { x: [0, Math.cos(a) * d], y: [0, Math.sin(a) * d + 30], rotate: [0, 200 + Math.random() * 200], opacity: [0, 1, 0] }, { duration: 1.4, delay: 0.3 + i * 0.03, ease: "easeOut" }), leaf);
  }
}

export function iveHadWorse(card: DOMRect) {
  if (reduced()) return;
  const el = box("fx-bandage", new DOMRect(card.left + card.width * 0.1, card.top + card.height * 0.42, card.width * 0.8, card.height * 0.16));
  const other = box("fx-bandage", new DOMRect(card.left + card.width * 0.1, card.top + card.height * 0.42, card.width * 0.8, card.height * 0.16));
  animate(el, { rotate: [45, 45], scaleX: [0, 1] }, { duration: 0.3, ease: "easeOut" });
  animate(other, { rotate: [-45, -45], scaleX: [0, 1] }, { duration: 0.3, delay: 0.15, ease: "easeOut" });
  for (const b of [el, other]) done(animate(b, { opacity: [1, 1, 0] }, { duration: 1.5, times: [0, 0.8, 1] }), b);
  setTimeout(() => {
    const at = center(card);
    ring(at, "green", card.width * 1.4);
    floater([at[0], at[1] - 20], "+3 cards", "green", 50, true);
    buzz([20, 40, 20]);
  }, 500);
}

export function legwork(card: DOMRect) {
  if (reduced()) return;
  const x = card.left + card.width / 2;
  for (let i = -1; i <= 1; i++) {
    const a = node("fx-sig fx-dash");
    a.style.left = `${x + i * card.width * 0.3 - 3}px`;
    a.style.top = `${card.top}px`;
    done(animate(a, { y: [0, -card.top - 40], scaleY: [0.3, 1.4, 0.6], opacity: [0, 1, 0] }, { duration: 0.6, delay: 0.1 + (i + 1) * 0.12, ease: "easeIn" }), a);
  }
  setTimeout(() => {
    floater([x, 120], "HQ ×3", "cyan", 40, true);
    buzz([15, 15, 15]);
  }, 500);
}

export function sweepsWeek(card: DOMRect) {
  if (reduced()) return;
  const tv = box("fx-tv", new DOMRect(card.left - 10, card.top + card.height * 0.2, card.width + 20, card.height * 0.55));
  for (let i = 0; i < 5; i++) {
    const bar = node("fx-tv-bar", tv);
    bar.style.left = `${10 + i * 17}%`;
    animate(bar, { scaleY: [0, 0.3 + ((i * 37) % 70) / 100] }, { duration: 0.4, delay: 0.4 + i * 0.08, ease: "easeOut" });
  }
  animate(tv, { scale: [0.2, 1.05, 1], opacity: [0, 1] }, { duration: 0.35 });
  setTimeout(() => {
    const to = pointOf(anchor("corp-credits"));
    const r = tv.getBoundingClientRect();
    if (to) coins([r.left + r.width / 2, r.top], to, 4, "gold");
    buzz([20, 20, 20, 60]);
  }, 900);
  done(animate(tv, { opacity: [1, 1, 0] }, { duration: 1.8, times: [0, 0.8, 1] }), tv);
}

export function levy(card: DOMRect) {
  if (reduced()) return;
  const at = center(card);
  for (let i = 0; i < 8; i++) {
    const c = box("fx-mini-card", new DOMRect(at[0] - 12, at[1] - 17, 24, 34));
    const a0 = (i / 8) * Math.PI * 2;
    const xs = Array.from({ length: 7 }, (_, k) => Math.cos(a0 + k * 0.9) * card.width * 0.7 * (1 - k / 7));
    const ys = Array.from({ length: 7 }, (_, k) => Math.sin(a0 + k * 0.9) * card.width * 0.7 * (1 - k / 7));
    done(animate(c, { x: xs, y: ys, rotate: [0, 360], opacity: [0, 1, 1, 0] }, { duration: 1.2, delay: i * 0.04, ease: "easeIn" }), c);
  }
  setTimeout(() => {
    ring(at, "green", card.width * 1.6);
    burst(at, "green", 16, 60, { size: 4, gravity: 0 });
    buzz([20, 20, 60]);
  }, 1100);
}

export function specialOrder(card: DOMRect) {
  if (reduced()) return;
  const target = pointOf(anchor("runner-deck")) ?? center(card);
  const lens = node("fx-sig fx-lens");
  lens.style.left = `${target[0]}px`;
  lens.style.top = `${target[1]}px`;
  animate(lens, { x: [-40, 30, -20, 0], y: [-20, 10, 20, 0], scale: [0.4, 1, 1, 1.2] }, { duration: 1, ease: "easeInOut" });
  setTimeout(() => {
    ring(target, "cyan", 110);
    burst(target, "cyan", 12, 50, { size: 4, gravity: -30 });
    buzz(40);
  }, 950);
  done(animate(lens, { opacity: [0, 1, 1, 0] }, { duration: 1.4, times: [0, 0.1, 0.8, 1] }), lens);
}

export function archivedMemories(card: DOMRect) {
  if (reduced()) return;
  const drawer = box("fx-drawer", new DOMRect(card.left - 6, card.bottom - 30, card.width + 12, 30));
  animate(drawer, { scaleY: [0, 1], opacity: [0, 1] }, { duration: 0.25 });
  const ghost = box("fx-phantom", new DOMRect(card.left + card.width * 0.2, card.bottom - 40, card.width * 0.6, card.height * 0.5));
  ghost.style.borderColor = "#7fb0ff";
  animate(ghost, { y: [0, -card.height * 0.9], opacity: [0, 1, 0] }, { duration: 1, delay: 0.25, ease: "easeOut" });
  setTimeout(() => ghost.remove(), 1300);
  setTimeout(() => buzz([20, 40]), 300);
  done(animate(drawer, { opacity: [1, 1, 0] }, { duration: 1.4, times: [0, 0.75, 1] }), drawer);
}

export function psychographics() {
  if (reduced()) return;
  const at = pointOf(anchor("runner-panel")) ?? [innerWidth / 2, innerHeight - 120];
  const radar = node("fx-sig fx-radar");
  radar.style.left = `${at[0]}px`;
  radar.style.top = `${at[1]}px`;
  animate(radar, { rotate: [0, 720] }, { duration: 1.4, ease: "linear" });
  done(animate(radar, { opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 1.1] }, { duration: 1.5, times: [0, 0.15, 0.8, 1] }), radar);
  setTimeout(() => {
    ring(at, "red", 200);
    vignette("red", 0.35);
    buzz([30, 30, 30, 30, 90]);
  }, 1100);
}

export function breakingNews() {
  if (reduced()) return;
  const band = node("fx-sig fx-ticker");
  band.style.top = `${innerHeight * 0.28}px`;
  const text = node("fx-ticker-text", band);
  text.textContent = "BREAKING NEWS ✦ BREAKING NEWS ✦ BREAKING NEWS ✦ BREAKING NEWS ✦ BREAKING NEWS";
  animate(band, { scaleY: [0, 1] }, { duration: 0.2 });
  animate(text, { x: [innerWidth, -innerWidth * 1.6] }, { duration: 2.4, ease: "linear" });
  done(animate(band, { opacity: [1, 1, 0] }, { duration: 2.4, times: [0, 0.88, 1] }), band);
  buzz([40, 40, 40]);
}

export function vitruvius(card: DOMRect) {
  if (reduced()) return;
  const el = box("fx-sig fx-vitruvius", new DOMRect(card.left - card.width * 0.15, card.top + card.height / 2 - card.width * 0.65, card.width * 1.3, card.width * 1.3));
  el.innerHTML = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" pathLength="1"/><rect x="14" y="14" width="72" height="72" pathLength="1"/><path d="M50 14 L50 86 M14 42 L86 42 M50 62 L22 86 M50 62 L78 86 M50 42 L18 22 M50 42 L82 22" pathLength="1"/></svg>';
  for (const shape of el.querySelectorAll("circle, rect, path")) animate(shape, { strokeDashoffset: [1, 0] }, { duration: 0.8, ease: "easeInOut" });
  done(animate(el, { opacity: [0, 1, 1, 0], rotate: [-20, 0, 0, 0] }, { duration: 2, times: [0, 0.15, 0.8, 1] }), el);
}

export function astroscript(card: DOMRect) {
  if (reduced()) return;
  const pts: Point[] = Array.from({ length: 7 }, (_, i) => [card.left + card.width * (0.1 + Math.random() * 0.8), card.top - 20 + card.height * (i / 6) * 0.9 + Math.random() * 20]);
  const el = box("fx-sig fx-constellation", new DOMRect(0, 0, innerWidth, innerHeight));
  el.innerHTML = `<svg viewBox="0 0 ${innerWidth} ${innerHeight}"><polyline points="${pts.map((p) => p.join(",")).join(" ")}" pathLength="1"/></svg>`;
  animate(el.querySelector("polyline")!, { strokeDashoffset: [1, 0] }, { duration: 0.9, ease: "easeInOut" });
  pts.forEach((p, i) =>
    setTimeout(() => {
      burst(p, "gold", 6, 24, { size: 4, gravity: 0 });
      ring(p, "gold", 36);
    }, i * 130),
  );
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.9, times: [0, 0.8, 1] }), el);
}

export function popUpWindow(r: DOMRect) {
  if (reduced()) return;
  const win = box("fx-popup", new DOMRect(r.left - 12, r.top + r.height * 0.2, r.width + 24, r.height * 0.6));
  win.innerHTML = "<b><i>×</i></b><span>ALERT</span>";
  animate(win, { scale: [0, 1.15, 1] }, { duration: 0.3, ease: "easeOut" });
  setTimeout(() => {
    animate(win, { x: [0, -4, 4, -2, 0] }, { duration: 0.25 });
    buzz([10, 20, 10]);
  }, 350);
  done(animate(win, { opacity: [1, 1, 0] }, { duration: 1.4, times: [0, 0.8, 1] }), win);
}

export function wraparound(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const wrap = node("fx-sig fx-wrap");
  const s = Math.max(r.width, r.height) * 1.3;
  wrap.style.left = `${at[0] - s / 2}px`;
  wrap.style.top = `${at[1] - s / 2}px`;
  wrap.style.width = `${s}px`;
  wrap.style.height = `${s}px`;
  animate(wrap, { rotate: [0, 540], scale: [1.6, 1] }, { duration: 1, ease: [0.2, 0.7, 0.3, 1] });
  done(animate(wrap, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.15, 0.8, 1] }), wrap);
  setTimeout(() => buzz([10, 10, 10, 40]), 600);
}

export function borderControl() {
  if (reduced()) return;
  const el = node("fx-sig fx-border");
  done(animate(el, { opacity: [0, 1, 0.2, 1, 0] }, { duration: 1.1 }), el);
  buzz([60, 60, 60]);
}

export function femmeFatale(r: DOMRect) {
  if (reduced()) return;
  const kiss = box("fx-kiss", new DOMRect(r.left + r.width / 2 - 24, r.top + r.height / 2 - 24, 48, 48));
  kiss.textContent = "💋";
  animate(kiss, { scale: [2.2, 0.9, 1], rotate: [-25, -10] }, { duration: 0.35, ease: "easeOut" });
  setTimeout(() => {
    ring(center(r), "red", 110);
    buzz(40);
  }, 300);
  done(animate(kiss, { opacity: [0, 1, 1, 0] }, { duration: 1.4, times: [0, 0.1, 0.8, 1] }), kiss);
}

export function plascrete(r: DOMRect) {
  if (reduced()) return;
  const at = pointOf(anchor("runner-panel")) ?? center(r);
  const shield = node("fx-sig fx-shield");
  shield.style.left = `${at[0]}px`;
  shield.style.top = `${at[1]}px`;
  animate(shield, { scale: [0.3, 1.1, 1], opacity: [0, 1] }, { duration: 0.4, ease: "easeOut" });
  setTimeout(() => {
    burst(at, "blue", 14, 70, { size: 4, gravity: 0 });
    buzz([30, 60]);
  }, 350);
  done(animate(shield, { opacity: [1, 1, 0] }, { duration: 1.5, times: [0, 0.8, 1] }), shield);
}

export function parasite(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 12; i++) {
    const spore = node("fx-sig fx-drop");
    const a = (i / 12) * Math.PI * 2;
    const d = Math.max(r.width, r.height) * 0.9;
    spore.style.left = `${at[0]}px`;
    spore.style.top = `${at[1]}px`;
    done(animate(spore, { x: [Math.cos(a) * d, Math.cos(a + 0.8) * d * 0.5, 0], y: [Math.sin(a) * d, Math.sin(a + 0.8) * d * 0.5, 0], opacity: [0, 1, 0], scale: [1, 1.2, 0.4] }, { duration: 0.9, delay: i * 0.03, ease: "easeIn" }), spore);
  }
  setTimeout(() => {
    burst(at, "green", 14, 50, { size: 4, gravity: 20 });
    vignette("cyan", 0.2);
    buzz([20, 20, 20, 60]);
  }, 900);
}

export function earthrise(r: DOMRect) {
  if (reduced()) return;
  const sun = box("fx-sun", new DOMRect(r.left - r.width * 0.2, r.top + r.height * 0.3, r.width * 1.4, r.width * 1.4));
  animate(sun, { y: [r.height * 0.5, 0], opacity: [0, 1] }, { duration: 0.8, ease: "easeOut" });
  done(animate(sun, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.75, 1] }), sun);
  setTimeout(() => buzz([10, 30, 10]), 500);
}

export function datasucker(r: DOMRect) {
  if (reduced()) return;
  const [cx] = center(r);
  for (const side of [-1, 1]) {
    const fang = box("fx-fang", new DOMRect(cx + side * r.width * 0.15 - 7, r.top - 10, 14, 26));
    done(animate(fang, { y: [-20, r.height * 0.35, r.height * 0.3], opacity: [0, 1, 1, 0] }, { duration: 1, times: [0, 0.3, 0.7, 1], ease: "easeIn" }), fang);
  }
  setTimeout(() => {
    for (let i = 0; i < 5; i++) {
      const drop = node("fx-sig fx-drop");
      drop.style.background = "#ff3b30";
      drop.style.boxShadow = "0 0 8px #ff3b30";
      drop.style.left = `${cx + (Math.random() - 0.5) * r.width * 0.5}px`;
      drop.style.top = `${r.top + r.height * 0.5}px`;
      done(animate(drop, { y: [0, r.height * 0.6], opacity: [1, 0] }, { duration: 0.7, delay: i * 0.06, ease: "easeIn" }), drop);
    }
    buzz([30, 20]);
  }, 350);
}

export function blackOrchestra(r: DOMRect) {
  if (reduced()) return;
  const notes = ["♪", "♫", "♩", "♬"];
  for (let i = 0; i < 8; i++) {
    const n = node("fx-sig fx-note");
    n.textContent = notes[i % notes.length];
    n.style.left = `${r.left + Math.random() * r.width}px`;
    n.style.top = `${r.top + r.height * 0.6}px`;
    n.style.color = i % 2 ? "#ff3b30" : "#c792ff";
    done(animate(n, { y: [0, -r.height * (0.8 + Math.random() * 0.6)], x: [0, (Math.random() - 0.5) * 40], rotate: [-20, 20], opacity: [0, 1, 0] }, { duration: 1.3, delay: i * 0.08, ease: "easeOut" }), n);
  }
  buzz([20, 40, 20, 40]);
}

export function mkultra(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const spiral = node("fx-sig fx-hypno");
  const s = Math.max(r.width, r.height) * 1.2;
  spiral.style.left = `${at[0] - s / 2}px`;
  spiral.style.top = `${at[1] - s / 2}px`;
  spiral.style.width = `${s}px`;
  spiral.style.height = `${s}px`;
  animate(spiral, { rotate: [0, 900] }, { duration: 1.4, ease: "easeIn" });
  done(animate(spiral, { opacity: [0, 0.9, 0.9, 0], scale: [0.3, 1, 1, 0.2] }, { duration: 1.5, times: [0, 0.2, 0.75, 1] }), spiral);
  setTimeout(() => buzz([10, 10, 10, 10, 10, 10]), 300);
}

export function david(r: DOMRect) {
  if (reduced()) return;
  const from: Point = [r.left + r.width / 2, r.top];
  const stone = node("fx-sig fx-stone");
  stone.style.left = `${from[0]}px`;
  stone.style.top = `${from[1]}px`;
  const rise = Math.min(from[1] - 60, 260);
  animate(stone, { y: [0, -rise], x: [0, 40], scale: [1, 0.7] }, { duration: 0.45, ease: [0.2, 0.8, 0.4, 1] });
  setTimeout(() => {
    const hit: Point = [from[0] + 40, from[1] - rise];
    ring(hit, "gold", 120);
    burst(hit, "gold", 18, 70, { size: 5, shards: true, gravity: 80 });
    shake(0.5);
    buzz([20, 60]);
    stone.remove();
  }, 450);
}

export function hippo(r: DOMRect) {
  if (reduced()) return;
  const top = box("fx-jaw top", new DOMRect(r.left - 10, r.top - 10, r.width + 20, r.height * 0.5 + 10));
  const bottom = box("fx-jaw bottom", new DOMRect(r.left - 10, r.top + r.height * 0.5, r.width + 20, r.height * 0.5 + 10));
  animate(top, { y: [-r.height * 0.6, 0] }, { duration: 0.3, delay: 0.1, ease: "easeIn" });
  animate(bottom, { y: [r.height * 0.6, 0] }, { duration: 0.3, delay: 0.1, ease: "easeIn" });
  setTimeout(() => {
    shake(0.8);
    burst(center(r), "red", 16, 70, { size: 5, shards: true, gravity: 40 });
    buzz([80, 20, 40]);
  }, 400);
  for (const j of [top, bottom]) done(animate(j, { opacity: [0, 1, 1, 0] }, { duration: 1.1, times: [0, 0.2, 0.75, 1] }), j);
}

export function cloneChip(r: DOMRect) {
  if (reduced()) return;
  for (const dx of [-1, 1]) {
    const ghost = box("fx-phantom", r);
    done(animate(ghost, { x: [0, dx * r.width * 0.7], opacity: [0.9, 0], scale: [1, 0.9] }, { duration: 0.8, ease: "easeOut" }), ghost);
  }
  ring(center(r), "cyan", 100);
  buzz([10, 30, 10]);
}

export function rdInterface(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 10; i++) {
    const line = node("fx-sig fx-dash");
    line.style.width = "2px";
    line.style.left = `${r.left + (i + 0.5) * (r.width / 10)}px`;
    line.style.top = `${r.top}px`;
    done(animate(line, { y: [r.height * 0.5, -r.height * 1.2], opacity: [0, 1, 0] }, { duration: 0.7, delay: Math.random() * 0.4, ease: "linear" }), line);
  }
  buzz([10, 10, 10]);
}

export function desperado(r: DOMRect) {
  if (reduced()) return;
  const star = box("fx-star", new DOMRect(r.left + r.width / 2 - 30, r.top + r.height / 2 - 30, 60, 60));
  animate(star, { rotate: [-180, 0], scale: [0.2, 1.2, 1] }, { duration: 0.5, ease: "easeOut" });
  setTimeout(() => {
    burst(center(r), "gold", 14, 60, { size: 4, gravity: 20 });
    buzz(40);
  }, 450);
  done(animate(star, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.1, 0.8, 1] }), star);
}

export function stargate(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const gate = node("fx-sig fx-portal");
  const s = Math.max(r.width, r.height) * 1.1;
  gate.style.left = `${at[0] - s / 2}px`;
  gate.style.top = `${at[1] - s / 2}px`;
  gate.style.width = `${s}px`;
  gate.style.height = `${s}px`;
  animate(gate, { rotate: [0, 360], scale: [0, 1] }, { duration: 1, ease: "easeOut" });
  done(animate(gate, { opacity: [1, 1, 0] }, { duration: 1.4, times: [0, 0.8, 1] }), gate);
  setTimeout(() => buzz([10, 40, 10, 40]), 300);
}

export function corroder(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 9; i++) {
    const drop = node("fx-sig fx-drop");
    drop.style.background = "#d4ff3a";
    drop.style.boxShadow = "0 0 10px #a3e635";
    drop.style.left = `${r.left + Math.random() * r.width}px`;
    drop.style.top = `${r.top}px`;
    done(animate(drop, { y: [0, r.height * (0.6 + Math.random() * 0.5)], scaleY: [1, 1.8, 1], opacity: [0, 1, 0] }, { duration: 0.9, delay: i * 0.07, ease: "easeIn" }), drop);
  }
  setTimeout(() => burst([r.left + r.width / 2, r.bottom], "green", 10, 40, { size: 6, gravity: -50 }), 700);
  buzz([10, 20, 10, 20]);
}

export function eli(r: DOMRect) {
  if (reduced()) return;
  for (const [i, side] of [[0, -1], [1, 1]] as const) {
    const bar = box("fx-brace", new DOMRect(r.left - 8, r.top + r.height * (0.3 + i * 0.3), r.width + 16, 10));
    animate(bar, { x: [side * innerWidth, 0] }, { duration: 0.3, delay: i * 0.12, ease: "easeIn" });
    done(animate(bar, { opacity: [1, 1, 0] }, { duration: 1.3, times: [0, 0.8, 1] }), bar);
  }
  setTimeout(() => {
    shake(0.6);
    buzz([50, 30, 50]);
  }, 420);
}

export function architect(r: DOMRect) {
  if (reduced()) return;
  const grid = box("fx-blueprint", new DOMRect(r.left - 8, r.top - 8, r.width + 16, r.height + 16));
  animate(grid, { clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"] } as any, { duration: 0.6, ease: "easeOut" });
  done(animate(grid, { opacity: [1, 1, 0] }, { duration: 1.5, times: [0, 0.8, 1] }), grid);
  setTimeout(() => buzz([10, 20, 10, 60]), 550);
}

export function iceWall(r: DOMRect) {
  if (reduced()) return;
  const frost = box("fx-frost", new DOMRect(r.left - 6, r.top - 6, r.width + 12, r.height + 12));
  animate(frost, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.2, 0.7, 1] });
  setTimeout(() => frost.remove(), 1350);
  burst(center(r), "cyan", 18, 70, { size: 7, shards: true, gravity: 30 });
  buzz([20, 20]);
}

export function padCampaign(r: DOMRect) {
  if (reduced()) return;
  const at: Point = [r.left + r.width / 2, r.top + r.height * 0.35];
  for (let i = 0; i < 4; i++) ring(at, "blue", 60 + i * 50, i * 0.12);
  setTimeout(() => {
    const to = pointOf(anchor("corp-credits"));
    if (to) coins(at, to, 1, "gold");
  }, 400);
  buzz([10, 20, 10]);
}

export function sansan(r: DOMRect) {
  if (reduced()) return;
  const city = box("fx-city", new DOMRect(r.left - 10, r.top + r.height * 0.3, r.width + 20, r.height * 0.7));
  for (let i = 0; i < 7; i++) {
    const tower = node("fx-tower", city);
    tower.style.left = `${i * 14 + 2}%`;
    tower.style.height = `${35 + ((i * 53) % 60)}%`;
    animate(tower, { scaleY: [0, 1] }, { duration: 0.4, delay: i * 0.05, ease: "easeOut" });
  }
  done(animate(city, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.8, 1] }), city);
  setTimeout(() => buzz([20, 40]), 400);
}

export function beale(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 5; i++) {
    const col = box("fx-tv-bar", new DOMRect(card.left + card.width * (0.1 + i * 0.17), card.top + card.height * 0.2, card.width * 0.12, card.height * 0.6));
    animate(col, { scaleY: [0, 0.3 + i * 0.17] }, { duration: 0.5, delay: i * 0.1, ease: "easeOut" });
    done(animate(col, { opacity: [1, 1, 0] }, { duration: 1.8, times: [0, 0.8, 1] }), col);
  }
}

export function rebirth(card: DOMRect) {
  if (reduced()) return;
  const at = center(card);
  for (let i = 0; i < 16; i++) setTimeout(() => burst([at[0] + (Math.random() - 0.5) * card.width * 0.6, card.bottom - 10], i % 2 ? "orange" : "gold", 4, 40, { size: 7, gravity: -200 }), i * 40);
  setTimeout(() => {
    rays(at, "orange", card.width * 2.4, 1);
    ring(at, "gold", card.width * 1.8);
    flash("gold", 0.3, 0.4);
    buzz([20, 40, 80]);
  }, 600);
}

export function pinhole(card: DOMRect) {
  if (reduced()) return;
  const from: Point = [card.left - 20, card.top + card.height * 0.7];
  const to: Point = [card.right + 20, card.top + card.height * 0.3];
  const needle = node("fx-sig fx-thread");
  needle.style.left = `${from[0]}px`;
  needle.style.top = `${from[1]}px`;
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  needle.style.width = `${len}px`;
  needle.style.rotate = `${(Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI}deg`;
  animate(needle, { scaleX: [0, 1] }, { duration: 0.4, ease: "easeIn" });
  setTimeout(() => {
    burst(to, "cyan", 10, 40, { size: 3, gravity: 0 });
    buzz(30);
  }, 400);
  done(animate(needle, { opacity: [1, 1, 0] }, { duration: 1.1, times: [0, 0.75, 1] }), needle);
}

function svgBox(cls: string, r: DOMRect, inner: string, view = "0 0 100 100") {
  const el = box(cls, r);
  el.innerHTML = `<svg viewBox="${view}">${inner}</svg>`;
  return el;
}

function draw(el: HTMLElement, duration = 0.6) {
  for (const shape of el.querySelectorAll("path, polyline, circle, rect")) animate(shape, { strokeDashoffset: [1, 0] }, { duration, ease: "easeInOut" });
}

export function paperclip(r: DOMRect) {
  if (reduced()) return;
  const el = svgBox("fx-stroke silver", new DOMRect(r.left + r.width * 0.2, r.top + r.height * 0.1, r.width * 0.6, r.height * 0.8), '<path pathLength="1" d="M30 85 V20 a15 15 0 0 1 30 0 V75 a10 10 0 0 1 -20 0 V30"/>');
  draw(el, 0.7);
  setTimeout(() => {
    burst(center(r), "cyan", 10, 50, { size: 3, gravity: 0 });
    buzz([10, 20, 10]);
  }, 650);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.4, times: [0, 0.8, 1] }), el);
}

export function liberatedAccount(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (const side of [-1, 1]) {
    const link = box("fx-link", new DOMRect(at[0] - 14 + side * 10, at[1] - 8, 28, 16));
    done(animate(link, { x: [0, side * 50], rotate: [0, side * 50], opacity: [1, 1, 0] }, { duration: 0.7, delay: 0.25, ease: "easeOut" }), link);
  }
  setTimeout(() => {
    burst(at, "gold", 12, 50, { size: 4, gravity: 30 });
    buzz([20, 40]);
  }, 250);
}

const GLYPHS = "01<>{}[]#$%&*+=/\\|;:";

export function selfModifyingCode(r: DOMRect) {
  if (reduced()) return;
  const el = box("fx-code", r);
  const spans = Array.from({ length: 24 }, () => node("fx-code-char", el, "span"));
  let n = 0;
  const tick = setInterval(() => {
    for (const s of spans) s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    if (++n > 14) clearInterval(tick);
  }, 60);
  done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: 1.2, times: [0, 0.1, 0.8, 1] }), el);
  buzz([10, 10, 10, 10]);
}

export function mimic(r: DOMRect) {
  if (reduced()) return;
  const ghost = box("fx-phantom", r);
  ghost.style.borderColor = "#ff8a80";
  ghost.style.background = "rgb(255 59 48 / 0.15)";
  animate(ghost, { rotateY: [0, 180, 360], scale: [1, 1.15, 1], transformPerspective: 500 } as any, { duration: 0.8, ease: "easeInOut" });
  done(animate(ghost, { opacity: [0, 1, 0] }, { duration: 1 }), ghost);
  setTimeout(() => slash(center(r), "red", 70, -40), 600);
}

export function streetPeddler(r: DOMRect) {
  if (reduced()) return;
  for (let i = -1; i <= 1; i++) {
    const c = box("fx-mini-card peddler", new DOMRect(r.left + r.width / 2 - 14, r.top + r.height * 0.3, 28, 40));
    done(animate(c, { y: [0, -r.height * 0.6], x: [0, i * 34], rotate: [0, i * 18], opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.2, 0.8, 1], delay: (i + 1) * 0.06, ease: "easeOut" }), c);
  }
  buzz([10, 20, 10, 20]);
}

export function yog(r: DOMRect) {
  if (reduced()) return;
  const zero = box("fx-zero", new DOMRect(r.left, r.top + r.height * 0.15, r.width, r.height * 0.7));
  zero.textContent = "0";
  animate(zero, { scale: [2.5, 1], x: [0, -4, 4, -2, 0] }, { duration: 0.6, ease: "easeOut" });
  done(animate(zero, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.1, 0.75, 1] }), zero);
  setTimeout(() => buzz([30, 10, 30]), 300);
}

export function turningWheel(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const wheel = node("fx-sig fx-wheel");
  const s = r.width * 1.3;
  wheel.style.left = `${at[0] - s / 2}px`;
  wheel.style.top = `${at[1] - s / 2}px`;
  wheel.style.width = `${s}px`;
  wheel.style.height = `${s}px`;
  animate(wheel, { rotate: [0, 360] }, { duration: 1.4, ease: "easeInOut" });
  done(animate(wheel, { opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.9] }, { duration: 1.5, times: [0, 0.15, 0.8, 1] }), wheel);
  buzz([10, 30, 10, 30]);
}

export function aumakua(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 14; i++) {
    const w = node("fx-sig fx-firefly");
    w.style.background = "#e6fbff";
    w.style.boxShadow = "0 0 8px #a5f3fc, 0 0 18px #22d3ee";
    w.style.left = `${at[0]}px`;
    w.style.top = `${r.bottom}px`;
    const a0 = (i / 14) * Math.PI * 2;
    const xs = Array.from({ length: 6 }, (_, k) => Math.cos(a0 + k) * r.width * 0.4);
    const ys = Array.from({ length: 6 }, (_, k) => -k * r.height * 0.3);
    done(animate(w, { x: xs, y: ys, opacity: [0, 1, 1, 0] }, { duration: 1.5, delay: i * 0.04, ease: "easeOut" }), w);
  }
  buzz([10, 40, 10]);
}

export function clot(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 8; i++) {
    const b = node("fx-sig fx-clot");
    const sz = 14 + Math.random() * 16;
    b.style.width = `${sz}px`;
    b.style.height = `${sz}px`;
    b.style.left = `${at[0] - sz / 2}px`;
    b.style.top = `${at[1] - sz / 2}px`;
    const a = Math.random() * Math.PI * 2;
    const d = r.width * 0.7;
    done(animate(b, { x: [Math.cos(a) * d, 0], y: [Math.sin(a) * d, 0], scale: [0.4, 1.2, 0.8], opacity: [0, 1, 0] }, { duration: 1.1, delay: i * 0.05, ease: "easeIn" }), b);
  }
  setTimeout(() => buzz([60, 40]), 900);
}

export function imp(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 6; i++) setTimeout(() => burst([at[0] + (Math.random() - 0.5) * r.width, at[1] + (Math.random() - 0.5) * r.height], i % 2 ? "red" : "orange", 6, 30, { size: 4, gravity: -60 }), i * 90);
  setTimeout(() => {
    slash(at, "red", 60, 45);
    slash(at, "red", 60, -45);
    buzz([20, 20, 40]);
  }, 400);
}

export function snare(r: DOMRect | null) {
  if (reduced()) return;
  const at = r ? center(r) : (pointOf(anchor("runner-panel")) ?? [innerWidth / 2, innerHeight / 2]);
  const t = new DOMRect(at[0] - 70, at[1] - 50, 140, 100);
  const top = box("fx-jaw top", new DOMRect(t.left, t.top, t.width, t.height * 0.5));
  const bottom = box("fx-jaw bottom", new DOMRect(t.left, t.top + t.height * 0.5, t.width, t.height * 0.5));
  animate(top, { y: [-60, 0] }, { duration: 0.18, ease: "easeIn" });
  animate(bottom, { y: [60, 0] }, { duration: 0.18, ease: "easeIn" });
  setTimeout(() => {
    flash("red", 0.35, 0.3);
    shake(1);
    stamp([at[0], at[1] - 70], "Snare!", "red");
    buzz([100, 30, 60]);
  }, 200);
  for (const j of [top, bottom]) done(animate(j, { opacity: [1, 1, 0] }, { duration: 1.2, times: [0, 0.75, 1] }), j);
}

export function spinDoctor(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 6; i++) {
    const c = box("fx-mini-card blue", new DOMRect(at[0] - 10, at[1] - 14, 20, 28));
    const a0 = (i / 6) * Math.PI * 2;
    const xs = Array.from({ length: 9 }, (_, k) => Math.cos(a0 + k * 0.8) * r.width * 0.6);
    const ys = Array.from({ length: 9 }, (_, k) => Math.sin(a0 + k * 0.8) * r.width * 0.6);
    done(animate(c, { x: xs, y: ys, rotate: [0, 540], opacity: [0, 1, 1, 0] }, { duration: 1.3, ease: "linear" }), c);
  }
  buzz([10, 20, 10, 20]);
}

export function cyberdex(r: DOMRect) {
  if (reduced()) return;
  const scan = box("fx-scan green", new DOMRect(0, r.top, innerWidth, 6));
  animate(scan, { y: [0, innerHeight - r.top - 10] }, { duration: 0.9, ease: "easeInOut" });
  done(animate(scan, { opacity: [0, 1, 1, 0] }, { duration: 1, times: [0, 0.1, 0.85, 1] }), scan);
  setTimeout(() => {
    flash("violet", 0.2, 0.3);
    buzz([20, 20, 20]);
  }, 800);
}

export function turnpike(r: DOMRect) {
  if (reduced()) return;
  const spikes = box("fx-spikes", new DOMRect(r.left - 10, r.bottom - 16, r.width + 20, 16));
  animate(spikes, { scaleY: [0, 1.2, 1] }, { duration: 0.3, ease: "easeOut" });
  done(animate(spikes, { opacity: [1, 1, 0] }, { duration: 1.3, times: [0, 0.8, 1] }), spikes);
  setTimeout(() => {
    const from = pointOf(anchor("runner-credits"));
    if (from) coins(from, center(r), 1, "gold");
    buzz(40);
  }, 300);
}

export function ichi(r: DOMRect) {
  if (reduced()) return;
  const glyph = box("fx-kanji", new DOMRect(r.left, r.top + r.height * 0.2, r.width, r.height * 0.6));
  glyph.textContent = "一";
  animate(glyph, { scaleX: [0, 1.2, 1] }, { duration: 0.4, ease: "easeOut" });
  done(animate(glyph, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.1, 0.75, 1] }), glyph);
  setTimeout(() => {
    slash(center(r), "red", r.width * 1.4, 0);
    buzz([40, 30, 40]);
  }, 400);
}

export function cobra(r: DOMRect) {
  if (reduced()) return;
  const el = svgBox("fx-stroke venom", new DOMRect(r.left - r.width * 0.3, r.top - r.height * 0.1, r.width * 1.6, r.height * 1.2), '<path pathLength="1" d="M10 95 C 40 80, 10 60, 40 50 S 70 30, 45 15 L 60 5"/>');
  draw(el, 0.35);
  setTimeout(() => {
    slash([r.left + r.width * 0.65, r.top + r.height * 0.1], "green", 60, 30);
    burst(center(r), "green", 12, 60, { size: 5, shards: true, gravity: 30 });
    buzz([10, 60]);
  }, 350);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.1, times: [0, 0.75, 1] }), el);
}

export function archangel(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (const side of [-1, 1]) {
    const wing = box(`fx-wing ${side < 0 ? "left" : "right"}`, new DOMRect(side < 0 ? at[0] - r.width * 1.1 : at[0], at[1] - r.height * 0.5, r.width * 1.1, r.height * 0.8));
    animate(wing, { scaleX: [0, 1], rotate: [side * 30, 0] }, { duration: 0.5, ease: "easeOut" });
    done(animate(wing, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.15, 0.8, 1] }), wing);
  }
  setTimeout(() => {
    rays(at, "gold", r.width * 3, 1);
    buzz([20, 40, 80]);
  }, 400);
}

export function offworldOffice(card: DOMRect) {
  if (reduced()) return;
  const to = pointOf(anchor("corp-credits"));
  if (!to) return;
  for (let i = 0; i < 7; i++) setTimeout(() => coins([card.left + Math.random() * card.width, card.top], to, 1, "gold"), i * 90);
  setTimeout(() => floater([to[0], to[1] - 30], "+7", "gold", 50, true), 700);
}

export function hostileTakeover(card: DOMRect) {
  if (reduced()) return;
  setTimeout(() => {
    stamp(center(card), "Takeover", "red");
    shake(0.6);
    buzz([60, 30, 60]);
  }, 400);
}

export function napdContract(card: DOMRect) {
  if (reduced()) return;
  setTimeout(() => {
    stamp(center(card), "Approved", "blue");
    buzz([40, 40]);
  }, 400);
}

export function inject(card: DOMRect) {
  if (reduced()) return;
  const el = box("fx-syringe green", new DOMRect(card.right - 10, card.top + card.height * 0.35, card.width * 0.9, 16));
  node("fx-syringe-fill", el);
  animate(el, { x: [60, 0], opacity: [0, 1] }, { duration: 0.25, ease: "easeOut" });
  animate(el.firstElementChild!, { scaleX: [1, 0] }, { duration: 0.5, delay: 0.3, ease: "easeIn" });
  setTimeout(() => {
    const deck = pointOf(anchor("runner-deck")) ?? center(card);
    for (let i = 0; i < 4; i++) {
      const c = box("fx-mini-card", new DOMRect(deck[0] - 10, deck[1] - 14, 20, 28));
      done(animate(c, { y: [0, -40 - i * 10], x: [0, (i - 1.5) * 26], rotateY: [0, 180], opacity: [1, 1, 0] } as any, { duration: 0.9, delay: i * 0.08, ease: "easeOut" }), c);
    }
    buzz([20, 20, 20, 20]);
  }, 800);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.2, times: [0, 0.75, 1] }), el);
}

export function exchangeOfInformation(card: DOMRect) {
  if (reduced()) return;
  const el = svgBox("fx-stroke swap", new DOMRect(card.left + card.width * 0.15, card.top + card.height * 0.25, card.width * 0.7, card.height * 0.5), '<path pathLength="1" d="M10 35 H85 L70 20 M90 65 H15 L30 80"/>');
  draw(el, 0.4);
  animate(el, { rotate: [0, 360], scale: [0.4, 1.1, 1] }, { duration: 0.8, ease: "easeInOut" });
  done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: 1.4, times: [0, 0.1, 0.8, 1] }), el);
  setTimeout(() => buzz([20, 40, 20]), 500);
}

export function scoreSignature(title: string | undefined, card: DOMRect) {
  const t = plain(title);
  if (t === "Global Food Initiative") globalFood(card);
  else if (t === "Breaking News") breakingNews();
  else if (t === "Project Vitruvius") vitruvius(card);
  else if (t === "AstroScript Pilot Program") astroscript(card);
  else if (t === "Project Beale") beale(card);
  else if (t === "Offworld Office") offworldOffice(card);
  else if (t === "Hostile Takeover") hostileTakeover(card);
  else if (t === "NAPD Contract") napdContract(card);
}

export function rezSignature(title: string | undefined, r: DOMRect) {
  const t = plain(title);
  if (t === "Palisade") palisade(r);
  else if (t === "Bran 1.0") bran(r);
  else if (t === "Funhouse") funhouse(r);
  else if (t === "Enigma") enigma(r);
  else if (t === "Tollbooth") tollbooth(r);
  else if (t === "Pop-up Window") popUpWindow(r);
  else if (t === "Wraparound") wraparound(r);
  else if (t === "Border Control") borderControl();
  else if (t === "Eli 1.0") eli(r);
  else if (t === "Architect") architect(r);
  else if (t === "Ice Wall") iceWall(r);
  else if (t === "PAD Campaign") padCampaign(r);
  else if (t === "SanSan City Grid") sansan(r);
  else if (t === "Spin Doctor") spinDoctor(r);
  else if (t === "Cyberdex Virus Suite") cyberdex(r);
  else if (t === "Turnpike") turnpike(r);
  else if (t === "Ichi 1.0") ichi(r);
  else if (t === "Cobra") cobra(r);
  else if (t === "Archangel") archangel(r);
}

export function fireSignature(title: string | undefined, ice: DOMRect | null, runner: Point) {
  const t = plain(title);
  if (t === "Karuna") karuna(runner);
  else if (t === "Urtica Cipher") urtica(runner);
  else if (t === "Tithe" && ice) tithe(center(ice));
  else if (t === "Anoetic Void" && ice) anoeticVoid(ice);
}

export function installSignature(title: string | undefined, r: DOMRect) {
  const t = plain(title);
  if (t === "Mayfly") mayfly(r);
  else if (t === "Botulus") botulus(r);
  else if (t === "Carmen") carmen(r);
  else if (t === "Docklands Pass") docklandsPass(r);
  else if (t === "Daily Casts") dailyCasts(r);
  else if (t === "Femme Fatale") femmeFatale(r);
  else if (t === "Plascrete Carapace") plascrete(r);
  else if (t === "Parasite") parasite(r);
  else if (t === "Earthrise Hotel") earthrise(r);
  else if (t === "Datasucker") datasucker(r);
  else if (t === "Black Orchestra") blackOrchestra(r);
  else if (t === "MKUltra") mkultra(r);
  else if (t === "D4v1d") david(r);
  else if (t === "Hippo") hippo(r);
  else if (t === "Clone Chip") cloneChip(r);
  else if (t === "R&D Interface") rdInterface(r);
  else if (t === "Desperado") desperado(r);
  else if (t === "Stargate") stargate(r);
  else if (t === "Corroder") corroder(r);
  else if (t === "Paperclip") paperclip(r);
  else if (t === "Liberated Account") liberatedAccount(r);
  else if (t === "Self-modifying Code") selfModifyingCode(r);
  else if (t === "Mimic") mimic(r);
  else if (t === "Street Peddler") streetPeddler(r);
  else if (t === "Yog.0") yog(r);
  else if (t === "The Turning Wheel") turningWheel(r);
  else if (t === "Aumakua") aumakua(r);
  else if (t === "Clot") clot(r);
  else if (t === "Imp") imp(r);
}

export function signature(title: string | undefined, card: DOMRect) {
  if (title === "Hedge Fund") hedgeFund(card);
  else if (title === "Sure Gamble") sureGamble(card);
  else if (title === "Creative Commission") creativeCommission(card);
  else if (title === "Neurospike") neurospike();
  else if (title === "Public Trail") publicTrail(card);
  else if (title === "Jailbreak") jailbreak(card);
  else if (title === "Overclock") overclock(card);
  else if (title === "Seamless Launch") seamlessLaunch(card);
  else if (title === "Retribution") retribution();
  else if (title === "Dirty Laundry") dirtyLaundry(card);
  else if (title === "Stimhack") stimhack(card);
  else if (title === "Hard-Hitting News") hardHittingNews(card);
  else if (title === "Biotic Labor") bioticLabor(card);
  else if (title === "Account Siphon") accountSiphon(card);
  else if (title === "IPO") ipo(card);
  else if (title === "Closed Accounts") closedAccounts();
  else if (title === "Diesel") diesel(card);
  else if (title === "Inside Job") insideJob(card);
  else if (title === "I've Had Worse") iveHadWorse(card);
  else if (title === "Legwork") legwork(card);
  else if (title === "Sweeps Week") sweepsWeek(card);
  else if (title === "Levy AR Lab Access") levy(card);
  else if (title === "Special Order") specialOrder(card);
  else if (title === "Archived Memories") archivedMemories(card);
  else if (title === "Psychographics") psychographics();
  else if (title === "Rebirth") rebirth(card);
  else if (title === "Pinhole Threading") pinhole(card);
  else if (title === "Inject") inject(card);
  else if (title === "Exchange of Information") exchangeOfInformation(card);
}
