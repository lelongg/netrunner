import { type Point, anchor, animate, burst, buzz, coins, done, flash, floater, node, pointOf, punch, reduced, ring, shake, slash, vignette } from "./core";

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

export function rezSignature(title: string | undefined, r: DOMRect) {
  const t = plain(title);
  if (t === "Palisade") palisade(r);
  else if (t === "Bran 1.0") bran(r);
  else if (t === "Funhouse") funhouse(r);
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
}
