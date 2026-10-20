import { type Point, anchor, animate, burst, buzz, coins, done, flash, floater, node, pointOf, punch, rays, reduced, ring, shake, slash, vignette } from "./core";

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
    flash("red", 0.18, 0.3);
    burst(at, "red", 26, 100, { size: 7, shards: true, gravity: 50 });
    ring(at, "red", 180);
    shake(1);
    buzz([60, 20, 120]);
  }, 650);
  setTimeout(() => el.remove(), 1100);
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



const GLYPHS = "01<>{}[]#$%&*+=/\\|;:";





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
    flash("red", 0.18, 0.3);
    shake(1);
    buzz([100, 30, 60]);
  }, 200);
  for (const j of [top, bottom]) done(animate(j, { opacity: [1, 1, 0] }, { duration: 1.2, times: [0, 0.75, 1] }), j);
}







export function offworldOffice(card: DOMRect) {
  if (reduced()) return;
  const to = pointOf(anchor("corp-credits"));
  if (!to) return;
  for (let i = 0; i < 7; i++) setTimeout(() => coins([card.left + Math.random() * card.width, card.top], to, 1, "gold"), i * 90);
  setTimeout(() => floater([to[0], to[1] - 30], "+7", "gold", 50, true), 700);
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


function disc(cls: string, at: Point, size: number) {
  const el = node(`fx-sig ${cls}`);
  el.style.left = `${at[0] - size / 2}px`;
  el.style.top = `${at[1] - size / 2}px`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  return el;
}

export function rashida(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  rays(at, "gold", r.width * 2.4, 1.2);
  ring(at, "gold", r.width * 1.6);
  setTimeout(() => burst(at, "blue", 14, 60, { size: 4, gravity: -20 }), 200);
  buzz([20, 40]);
}

export function jacksonHoward(r: DOMRect) {
  if (reduced()) return;
  const deck = pointOf(anchor("corp-deck")) ?? [r.left, r.top];
  const at = center(r);
  for (let i = 0; i < 3; i++) {
    const c = box("fx-mini-card blue", new DOMRect(at[0] - 10, at[1] - 14, 20, 28));
    done(animate(c, { x: [0, (i - 1) * 30, deck[0] - at[0]], y: [0, -50, deck[1] - at[1]], rotate: [0, 180, 360], opacity: [0, 1, 1, 0] }, { duration: 1, delay: i * 0.12, ease: "easeInOut" }), c);
  }
  setTimeout(() => {
    ring(deck, "blue", 90);
    buzz([10, 20, 10]);
  }, 1100);
}






export function archer(r: DOMRect) {
  if (reduced()) return;
  const from = center(r);
  const to = pointOf(anchor("runner-panel")) ?? [innerWidth / 2, innerHeight - 100];
  const arrow = node("fx-sig fx-arrow");
  arrow.style.left = `${from[0]}px`;
  arrow.style.top = `${from[1]}px`;
  const angle = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
  animate(arrow, { x: [0, to[0] - from[0]], y: [0, to[1] - from[1]], rotate: [angle, angle] }, { duration: 0.35, delay: 0.2, ease: "easeIn" });
  setTimeout(() => {
    arrow.remove();
    ring(to, "red", 100);
    burst(to, "red", 12, 50, { size: 4, shards: true, gravity: 20 });
    buzz([10, 60]);
  }, 560);
}


export function vanilla(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  ring(at, "cyan", r.width * 1.2);
  burst(at, "cyan", 8, 30, { size: 3, gravity: 0 });
}



export function atman(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 8; i++) {
    const petal = node("fx-sig fx-petal");
    petal.style.left = `${at[0] - 8}px`;
    petal.style.top = `${at[1] - 30}px`;
    petal.style.rotate = `${i * 45}deg`;
    done(animate(petal, { scale: [0, 1.2, 1], opacity: [0, 1, 1, 0] }, { duration: 1.4, delay: i * 0.05, times: [0, 0.3, 0.8, 1] }), petal);
  }
  buzz([10, 40, 10]);
}

export function fermenter(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 10; i++) {
    const b = node("fx-sig fx-bubble amber");
    const sz = 6 + Math.random() * 12;
    b.style.width = `${sz}px`;
    b.style.height = `${sz}px`;
    b.style.left = `${r.left + Math.random() * r.width}px`;
    b.style.top = `${r.bottom - sz}px`;
    done(animate(b, { y: [0, -r.height * (0.6 + Math.random() * 0.5)], scale: [0.4, 1, 1.3], opacity: [0, 1, 0] }, { duration: 1.1, delay: i * 0.07, ease: "easeOut" }), b);
  }
  setTimeout(() => {
    const to = pointOf(anchor("runner-credits"));
    if (to) coins(center(r), to, 2, "gold");
  }, 800);
}

export function faerie(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 4;
    const d = r.width * 0.2 + (i / n) * r.width * 0.6;
    setTimeout(() => burst([at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d - (i / n) * 40], i % 2 ? "violet" : "cyan", 3, 14, { size: 4, gravity: -10 }), i * 45);
  }
  buzz([5, 20, 5, 20]);
}



export function iceCarver(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 3; i++)
    setTimeout(() => {
      slash(at, "cyan", 50, -70 + i * 20);
      burst(at, "cyan", 10, 50, { size: 5, shards: true, gravity: 60 });
      buzz(20);
    }, i * 160);
}

export function emergencyShutdown() {
  if (reduced()) return;
  const el = node("fx-sig fx-shutdown");
  const line = node("fx-shutdown-line", el);
  animate(line, { scaleY: [1, 0.004, 0.004], scaleX: [1, 1, 0] }, { duration: 0.6, times: [0, 0.5, 1], ease: "easeIn" });
  done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: 1, times: [0, 0.1, 0.7, 1] }), el);
  buzz([80, 40]);
}


export function scorchedEarth() {
  if (reduced()) return;
  for (let i = 0; i < 26; i++) setTimeout(() => burst([Math.random() * innerWidth, innerHeight - 10], i % 3 ? "orange" : "red", 5, 50, { size: 9, gravity: -260 }), i * 30);
  setTimeout(() => {
    flash("red", 0.22, 0.4);
    vignette("orange", 0.8);
    shake(1.2);
    buzz([120, 40, 120]);
  }, 300);
}

export function madDash() {
  if (reduced()) return;
  for (let i = 0; i < 12; i++) {
    const s = node("fx-sig fx-streak");
    const w = 80 + Math.random() * 160;
    s.style.width = `${w}px`;
    s.style.left = `${-w}px`;
    s.style.top = `${innerHeight * (0.1 + Math.random() * 0.8)}px`;
    s.style.background = "linear-gradient(90deg, transparent, #22d3ee 40%, #fff)";
    done(animate(s, { x: [0, innerWidth + w * 2] }, { duration: 0.45, delay: i * 0.04, ease: "easeIn" }), s);
  }
  buzz([10, 10, 10, 40]);
}



function tag(cls: string, r: DOMRect, html: string) {
  const el = box(cls, r);
  el.innerHTML = html;
  return el;
}

function fade(el: HTMLElement, duration = 1.4) {
  done(animate(el, { opacity: [0, 1, 1, 0] }, { duration, times: [0, 0.12, 0.8, 1] }), el);
}

function inset(r: DOMRect, x: number, y: number, w: number, h: number) {
  return new DOMRect(r.left + r.width * x, r.top + r.height * y, r.width * w, r.height * h);
}

export function wildcatStrike(card: DOMRect) {
  if (reduced()) return;
  const at = center(card);
  for (let i = 0; i < 3; i++) setTimeout(() => slash([at[0] + (i - 1) * 22, at[1]], "orange", card.height * 0.7, -70), i * 90);
  setTimeout(() => {
    floater([at[0] - card.width * 0.3, at[1] - 30], "6¢", "gold", 40, true);
    floater([at[0] + card.width * 0.3, at[1] - 30], "4 cards", "cyan", 40, true);
    buzz([20, 20, 20, 60]);
  }, 400);
}


export function treadLightly(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 6; i++) {
    const step = node("fx-sig fx-step");
    step.style.background = "#a5f3fc";
    step.style.boxShadow = "0 0 8px #22d3ee";
    step.style.left = `${card.left + card.width * (0.2 + (i % 2) * 0.5)}px`;
    step.style.top = `${card.bottom - (i + 1) * card.height * 0.14}px`;
    done(animate(step, { opacity: [0, 0.8, 0], scale: [0.6, 0.8, 0.8] }, { duration: 1, delay: i * 0.15 }), step);
  }
  setTimeout(() => floater([card.left + card.width / 2, card.top], "+3 rez", "cyan", 40, true), 700);
}


export function sprint(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 8; i++) {
    const st = node("fx-sig fx-streak");
    const w = card.width * 1.2;
    st.style.width = `${w}px`;
    st.style.left = `${card.left - w}px`;
    st.style.top = `${card.top + card.height * (0.1 + i * 0.1)}px`;
    st.style.background = "linear-gradient(90deg, transparent, #7fb0ff 40%, #fff)";
    done(animate(st, { x: [0, card.width + w * 1.5] }, { duration: 0.35, delay: i * 0.04, ease: "easeIn" }), st);
  }
  setTimeout(() => floater([card.left + card.width / 2, card.top], "+3 cards", "blue", 40, true), 400);
}




export function carnivore(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (const a of [-60, -75, -90]) slash([at[0] + (a + 75), at[1]], "red", r.height * 0.9, a);
  burst(at, "red", 12, 50, { size: 5, shards: true, gravity: 40 });
  buzz([30, 20, 30]);
}




export function marjanah(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  ring(at, "orange", r.width * 1.3);
  setTimeout(() => {
    for (let i = 0; i < 4; i++) slash(at, "orange", 40 + i * 12, i * 45);
    shake(0.4);
    buzz([50, 20]);
  }, 150);
}


export function redTeam(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const sight = node("fx-sig fx-reticle");
  sight.style.left = `${at[0]}px`;
  sight.style.top = `${at[1]}px`;
  animate(sight, { scale: [2, 0.7], rotate: [90, 0] }, { duration: 0.4, ease: "easeOut" });
  fade(sight, 1.1);
  const from = pointOf(anchor("runner-credits"));
  if (from) setTimeout(() => coins(from, at, 6, "gold"), 300);
}












export function manegarm(r: DOMRect) {
  if (reduced()) return;
  for (const side of [-1, 1]) {
    const shutter = box("fx-hazard", new DOMRect(side < 0 ? r.left : r.left + r.width / 2, r.top, r.width / 2, r.height));
    animate(shutter, { x: [side * r.width, 0] }, { duration: 0.3, ease: "easeIn" });
    done(animate(shutter, { opacity: [1, 1, 0] }, { duration: 1.3, times: [0, 0.8, 1] }), shutter);
  }
  setTimeout(() => {
    shake(0.5);
    buzz([60, 30]);
  }, 300);
}


export function ping(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 3; i++) ring(at, "red", 80 + i * 60, i * 0.18);
  buzz([10, 80, 10, 80]);
}

export function amaze(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const colors: ("red" | "gold" | "cyan" | "violet" | "green")[] = ["red", "gold", "cyan", "violet", "green"];
  colors.forEach((c, i) => setTimeout(() => burst([at[0] + (Math.random() - 0.5) * 80, at[1] - 30 - Math.random() * 60], c, 14, 50, { size: 4, gravity: 40 }), i * 120));
  buzz([10, 20, 10, 20, 10]);
}

export function clearinghouse(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 3; i++) setTimeout(() => ring(at, "red", r.width * 1.2), i * 280);
  setTimeout(() => vignette("red", 0.3), 600);
  buzz([20, 260, 20, 260, 20]);
}

export function ballista(r: DOMRect) {
  if (reduced()) return;
  const from = center(r);
  const to = pointOf(anchor("runner-panel")) ?? [innerWidth / 2, innerHeight - 100];
  const bolt = node("fx-sig fx-arrow heavy");
  bolt.style.left = `${from[0]}px`;
  bolt.style.top = `${from[1]}px`;
  const angle = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
  animate(bolt, { x: [0, -10, to[0] - from[0]], y: [0, -10, to[1] - from[1]], rotate: [angle, angle, angle] }, { duration: 0.55, times: [0, 0.4, 1], ease: "easeIn" });
  setTimeout(() => {
    bolt.remove();
    burst(to, "red", 18, 70, { size: 6, shards: true, gravity: 30 });
    shake(0.7);
    buzz([20, 80]);
  }, 560);
}









function glyph(r: DOMRect, text: string, color: string, size = 56) {
  if (reduced()) return;
  const el = box("fx-glyph", r);
  el.textContent = text;
  el.style.color = color;
  el.style.fontSize = `${size}px`;
  el.style.textShadow = `0 0 14px ${color}`;
  animate(el, { scale: [2.2, 0.95, 1] }, { duration: 0.4, ease: "easeOut" });
  fade(el, 1.3);
}

function rain(r: DOMRect, n: number, color: string, rise = false, spread = 1) {
  if (reduced()) return;
  for (let i = 0; i < n; i++) {
    const d = node("fx-sig fx-mote");
    d.style.background = color;
    d.style.boxShadow = `0 0 8px ${color}`;
    d.style.left = `${r.left + Math.random() * r.width}px`;
    d.style.top = `${rise ? r.bottom : r.top}px`;
    const dy = (rise ? -1 : 1) * r.height * spread * (0.6 + Math.random() * 0.6);
    done(animate(d, { y: [0, dy], opacity: [0, 1, 0] }, { duration: 0.9 + Math.random() * 0.4, delay: Math.random() * 0.4, ease: "easeOut" }), d);
  }
}

function credits(at: Point, n: number, side: "corp" | "runner", gain = true) {
  const pile = pointOf(anchor(`${side}-credits`));
  if (!pile) return;
  if (gain) coins(at, pile, n, "gold");
  else coins(pile, at, n, "gold");
}

function strokes(r: DOMRect, cls: string, d: string, duration = 0.6) {
  if (reduced()) return;
  const el = svgBox(`fx-stroke ${cls}`, r, `<path pathLength="1" d="${d}"/>`);
  draw(el, duration);
  fade(el, 1.5);
}








export function illumination(card: DOMRect) {
  if (reduced()) return;
  const at = pointOf(anchor("corp-deck")) ?? center(card);
  rays(at, "gold", 260, 1.2);
  flash("white", 0.3, 0.4);
}

export function ritual(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 3; i++) setTimeout(() => burst([card.left + card.width * (0.25 + i * 0.25), card.bottom - 10], "orange", 6, 24, { size: 5, gravity: -120 }), i * 120);
  ring(center(card), "violet", card.width * 1.5);
}

export function bling(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 5; i++)
    setTimeout(() => {
      const p: Point = [r.left + Math.random() * r.width, r.top + Math.random() * r.height];
      ring(p, "gold", 30);
      burst(p, "gold", 4, 16, { size: 3, gravity: 0 });
    }, i * 90);
}

export function gourmand(r: DOMRect) {
  if (reduced()) return;
  slash(center(r), "gold", r.width, -45);
  setTimeout(() => burst(center(r), "orange", 12, 50, { size: 4, shards: true, gravity: 80 }), 150);
}




export function rentRioters(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 10; i++) setTimeout(() => burst([r.left + Math.random() * r.width, r.bottom - 6], i % 2 ? "red" : "orange", 4, 30, { size: 6, gravity: -180 }), i * 50);
  setTimeout(() => floater([r.left + r.width / 2, r.top], "9¢", "gold", 30, true), 500);
}






export function gamedragon(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 12; i++) setTimeout(() => burst([r.right + i * 8, r.top + r.height * 0.3 - i * 3], i % 2 ? "orange" : "gold", 4, 20 + i * 2, { size: 6, gravity: -20 }), i * 40);
}






export function knickknack(r: DOMRect) {
  if (reduced()) return;
  (["gold", "cyan", "red", "violet", "green", "orange"] as const).forEach((tone, i) => setTimeout(() => burst(center(r), tone, 3, 50, { size: 7, shards: i % 2 === 0, gravity: 60 }), i * 60));
}








export function greenmail(card: DOMRect) {
  if (reduced()) return;
  rain(card, 16, "#3ddc84", false, 1.2);
  setTimeout(() => credits(center(card), 2, "corp"), 300);
}







export function publicAccessPlaza(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 12; i++) {
    const d = node("fx-sig fx-drop");
    d.style.background = "#7fb0ff";
    d.style.boxShadow = "0 0 8px #7fb0ff";
    d.style.left = `${at[0]}px`;
    d.style.top = `${at[1]}px`;
    const dx = (Math.random() - 0.5) * r.width * 1.2;
    done(animate(d, { x: [0, dx * 0.5, dx], y: [0, -r.height * 0.5, r.height * 0.2], opacity: [1, 1, 0] }, { duration: 0.9, delay: i * 0.04 }), d);
  }
}

export function anthill(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 12; i++) {
    const ant = node("fx-sig fx-ant");
    ant.style.left = `${r.left - 20}px`;
    ant.style.top = `${r.bottom - 6 - (i % 3) * 4}px`;
    done(animate(ant, { x: [0, r.width + 40], opacity: [0, 1, 1, 0] }, { duration: 1.2, delay: i * 0.07, ease: "linear" }), ant);
  }
  setTimeout(() => floater([r.left + r.width / 2, r.top], "8¢", "gold", 30, true), 300);
}



export function scatterField(r: DOMRect) {
  if (reduced()) return;
  burst(center(r), "violet", 30, r.width * 1.2, { size: 3, gravity: 0 });
  ring(center(r), "violet", r.width * 1.6);
}



export function semakSamun(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 6; i++) setTimeout(() => slash([r.left + Math.random() * r.width, r.top + Math.random() * r.height], "green", 30, Math.random() * 360), i * 60);
  ring(center(r), "orange", r.width * 1.2);
}




export function kessleroid(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 8; i++) {
    const rock = node("fx-sig fx-stone");
    rock.style.left = `${at[0]}px`;
    rock.style.top = `${at[1]}px`;
    const a0 = (i / 8) * Math.PI * 2;
    const d = r.width * 0.8;
    const xs = Array.from({ length: 7 }, (_, k) => Math.cos(a0 + k * 0.5) * d);
    const ys = Array.from({ length: 7 }, (_, k) => Math.sin(a0 + k * 0.5) * d * 0.5);
    done(animate(rock, { x: xs, y: ys, opacity: [0, 1, 1, 0] }, { duration: 1.4, ease: "linear" }), rock);
  }
}















export function pettyCash(card: DOMRect) {
  if (reduced()) return;
  credits(center(card), 5, "corp");
  setTimeout(() => floater([card.left + card.width / 2, card.top], "+5", "gold", 40, true), 300);
}

export function chainReaction(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 3; i++) setTimeout(() => ring([card.left + card.width * (0.2 + i * 0.3), card.top + card.height * 0.4], "orange", 70), i * 150);
  setTimeout(() => {
    burst(center(card), "orange", 30, 120, { size: 7, shards: true, gravity: 40 });
    shake(0.8);
    buzz([30, 30, 100]);
  }, 500);
}









export function lampades(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 3; i++) for (let k = 0; k < 6; k++) setTimeout(() => burst([r.left + r.width * (0.2 + i * 0.3), r.top + r.height * 0.3], k % 2 ? "orange" : "gold", 3, 16, { size: 5, gravity: -120 }), k * 60 + i * 30);
}



export function stickAndPoke(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 9; i++) setTimeout(() => {
    const a = (i / 9) * Math.PI * 2;
    const p: Point = [r.left + r.width / 2 + Math.cos(a) * r.width * 0.3, r.top + r.height / 2 + Math.sin(a) * r.width * 0.3];
    burst(p, "red", 3, 6, { size: 4, gravity: 0 });
    buzz(8);
  }, i * 70);
}

export function borrowedGoods(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const sight = node("fx-sig fx-reticle");
  sight.style.left = `${at[0]}px`;
  sight.style.top = `${at[1]}px`;
  animate(sight, { scale: [1.8, 0.6] }, { duration: 0.4 });
  fade(sight, 1.1);
  setTimeout(() => floater([at[0], r.top], "+1 tag", "red", 30, true), 300);
}







export function sipa(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 4; i++) setTimeout(() => ring([r.left + r.width / 2, r.top + r.height * (0.8 - i * 0.2)], "cyan", 40), i * 120);
}


export function wordOnTheStreet(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 3; i++) {
    const b = box("fx-speech", new DOMRect(r.left + r.width * (i * 0.3), r.top + r.height * (0.1 + i * 0.25), r.width * 0.5, r.height * 0.18));
    b.textContent = "...";
    done(animate(b, { scale: [0, 1.1, 1], opacity: [0, 1, 1, 0] }, { duration: 1.3, delay: i * 0.15, times: [0, 0.2, 0.8, 1] }), b);
  }
}





export function synchrocyclotron(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 2; i++) {
    const p = node("fx-sig fx-mote");
    p.style.left = `${at[0]}px`;
    p.style.top = `${at[1]}px`;
    const xs = Array.from({ length: 17 }, (_, k) => Math.cos(k * 0.8 + i * Math.PI) * r.width * 0.45);
    const ys = Array.from({ length: 17 }, (_, k) => Math.sin(k * 0.8 + i * Math.PI) * r.width * 0.45);
    done(animate(p, { x: xs, y: ys, opacity: [0, 1, 1, 0] }, { duration: 1.2, ease: "linear" }), p);
  }
  ring(at, "cyan", r.width * 1.1);
}


export function reverb(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 5; i++) ring(center(r), "violet", r.width * (0.8 + i * 0.3), i * 0.12);
}







export function lionsmane(r: DOMRect) {
  if (reduced()) return;
  rays(center(r), "gold", r.width * 2.2, 1);
  setTimeout(() => {
    slash(center(r), "red", r.width, -60);
    slash(center(r), "red", r.width, -40);
  }, 300);
}

export function vicsek(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 16; i++) {
    const b = node("fx-sig fx-mote");
    b.style.left = `${at[0]}px`;
    b.style.top = `${at[1]}px`;
    const a0 = Math.random() * Math.PI * 2;
    const xs = Array.from({ length: 6 }, (_, k) => Math.cos(a0 + k * 0.4) * r.width * (0.3 + k * 0.08));
    const ys = Array.from({ length: 6 }, (_, k) => Math.sin(a0 + k * 0.4) * r.width * (0.3 + k * 0.08));
    done(animate(b, { x: xs, y: ys, opacity: [0, 1, 0] }, { duration: 1.2, delay: Math.random() * 0.2 }), b);
  }
}




export function grubber(r: DOMRect) {
  if (reduced()) return;
  rain(inset(r, 0, 0.5, 1, 0.5), 14, "#a3e635", false, 0.8);
  ring(center(r), "green", r.width * 1.2);
}




















export function aircheck(card: DOMRect) {
  if (reduced()) return;
  const mast = svgBox("fx-stroke geo", inset(card, 0.2, 0.15, 0.6, 0.7), '<path pathLength="1" d="M50 15 L30 95 M50 15 L70 95 M38 60 H62 M34 78 H66"/>');
  draw(mast, 0.4);
  fade(mast, 1.6);
  const top: Point = [card.left + card.width / 2, card.top + card.height * 0.15 + card.height * 0.7 * 0.15];
  for (let i = 0; i < 3; i++) {
    const arc = svgBox("fx-stroke geo", new DOMRect(top[0] - 30 - i * 22, top[1] - 30 - i * 22, 60 + i * 44, 60 + i * 44), '<path pathLength="1" d="M15 30 A40 40 0 0 1 15 70 M85 30 A40 40 0 0 0 85 70"/>');
    draw(arc, 0.3);
    done(animate(arc, { opacity: [0, 1, 0] }, { duration: 0.9, delay: 0.3 + i * 0.15 }), arc);
  }
  setTimeout(() => floater([card.left + card.width / 2, card.top], "4¢", "gold", 40, true), 700);
}





export function unleash(card: DOMRect) {
  if (reduced()) return;
  const [cx, cy] = center(card);
  for (const side of [-1, 1]) {
    const rope = box("fx-rope", new DOMRect(side < 0 ? card.left - 20 : cx, cy - 3, cx - card.left + 20, 6));
    rope.style.transformOrigin = side < 0 ? "0 50%" : "100% 50%";
    animate(rope, { scaleX: [1, 1.05, 0.4], rotate: [0, 0, side * 25], opacity: [1, 1, 0] }, { duration: 0.8, times: [0, 0.45, 1], ease: "easeOut" });
    setTimeout(() => rope.remove(), 820);
  }
  setTimeout(() => {
    burst([cx, cy], "red", 16, 60, { size: 4, shards: true, gravity: 30 });
    buzz([20, 80]);
  }, 360);
}

export function realloc(card: DOMRect) {
  if (reduced()) return;
  const grid = box("fx-memgrid", inset(card, 0.05, 0.25, 0.9, 0.5));
  const cells = Array.from({ length: 12 }, () => node("fx-memcell", grid));
  const [a, b] = [cells[2], cells[9]];
  a.classList.add("hot");
  b.classList.add("hot");
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  animate(a, { x: [0, rb.left - ra.left], y: [0, rb.top - ra.top] }, { duration: 0.5, delay: 0.3, ease: "easeInOut" });
  animate(b, { x: [0, ra.left - rb.left], y: [0, ra.top - rb.top] }, { duration: 0.5, delay: 0.3, ease: "easeInOut" });
  fade(grid, 1.4);
}



export function reanimationProtocol(card: DOMRect) {
  if (reduced()) return;
  const el = svgBox("fx-stroke ecg", inset(card, -0.1, 0.35, 1.2, 0.3), '<polyline pathLength="1" points="0,50 45,50 50,50 55,10 60,90 65,50 100,50"/>');
  el.querySelector("svg")!.setAttribute("preserveAspectRatio", "none");
  animate(el.querySelector("polyline")!, { strokeDashoffset: [1, 0] }, { duration: 0.7, ease: "linear" });
  fade(el, 1.4);
  setTimeout(() => {
    flash("cyan", 0.3, 0.25);
    buzz([10, 100]);
  }, 550);
}

export function vultureFund(card: DOMRect) {
  if (reduced()) return;
  const at = center(card);
  const bird = box("fx-vulture", new DOMRect(at[0] - 20, at[1] - 10, 40, 16));
  const xs = Array.from({ length: 13 }, (_, k) => Math.cos(k * 0.6) * card.width * 0.6);
  const ys = Array.from({ length: 13 }, (_, k) => Math.sin(k * 0.6) * card.width * 0.25 - card.height * 0.45);
  animate(bird, { x: xs, y: ys }, { duration: 1.6, ease: "linear" });
  fade(bird, 1.7);
  setTimeout(() => credits(center(card), 14, "corp"), 500);
}

export function hypeMachine(r: DOMRect) {
  if (reduced()) return;
  const meter = box("fx-hype", new DOMRect(r.right + 4, r.top, 12, r.height));
  const fill = node("fx-hype-fill", meter);
  animate(fill, { scaleY: [0, 1] }, { duration: 0.7, ease: [0.2, 0, 0.2, 1] });
  fade(meter, 1.4);
  setTimeout(() => {
    floater([r.right + 10, r.top], "HYPE", "red", 30, true);
    buzz([10, 10, 10, 60]);
  }, 700);
}

export function esca(r: DOMRect) {
  if (reduced()) return;
  const dark = node("fx-sig fx-shutdown");
  done(animate(dark, { opacity: [0, 0.7, 0.7, 0] }, { duration: 1.5, times: [0, 0.2, 0.75, 1] }), dark);
  const line = svgBox("fx-stroke lure", new DOMRect(r.left, r.top - r.height * 0.4, r.width, r.height * 0.6), '<path pathLength="1" d="M10 100 Q20 10 70 30"/>');
  draw(line, 0.4);
  fade(line, 1.5);
  const orb = disc("fx-orb", [r.left + r.width * 0.7, r.top - r.height * 0.4 + r.height * 0.18], 22);
  animate(orb, { x: [0, 4, -4, 0], y: [0, 3, -2, 0] }, { duration: 1.1, ease: "easeInOut" });
  fade(orb, 1.4);
  setTimeout(() => {
    flash("cyan", 0.4, 0.2);
    buzz([10, 120]);
  }, 1150);
}



export function eventHorizon(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const disk = disc("fx-accretion", at, r.width * 1.6);
  disk.style.height = `${r.width * 0.5}px`;
  disk.style.top = `${at[1] - r.width * 0.25}px`;
  animate(disk, { rotate: [-15, -15], scale: [0.3, 1] }, { duration: 0.6, ease: "easeOut" });
  fade(disk, 1.6);
  const core = disc("fx-blackcore", at, r.width * 0.5);
  animate(core, { scale: [0, 1] }, { duration: 0.5 });
  fade(core, 1.6);
}


export function shackleton(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 40; i++) {
    const flake = node("fx-sig fx-mote");
    flake.style.background = "#fff";
    flake.style.left = `${Math.random() * innerWidth}px`;
    flake.style.top = "-10px";
    done(animate(flake, { y: [0, innerHeight * (0.4 + Math.random() * 0.5)], x: [0, (Math.random() - 0.5) * 60], opacity: [0, 1, 0] }, { duration: 1.6, delay: Math.random() * 0.6, ease: "linear" }), flake);
  }
  const frost = box("fx-frost", inset(r, -0.05, -0.05, 1.1, 1.1));
  fade(frost, 1.4);
}






export function bumi(r: DOMRect) {
  if (reduced()) return;
  for (const dx of [-0.16, 0.16]) {
    const eye = disc("fx-eye", [r.left + r.width * (0.5 + dx), r.top + r.height * 0.35], 12);
    done(animate(eye, { scale: [0, 1.6, 1.2, 1.6, 0], opacity: [0, 1, 1, 1, 0] }, { duration: 1.3 }), eye);
  }
  setTimeout(() => {
    const wave = box("fx-shockline", new DOMRect(0, r.top + r.height * 0.35, innerWidth, 3));
    done(animate(wave, { scaleX: [0, 1], opacity: [1, 0] }, { duration: 0.6 }), wave);
    buzz(60);
  }, 400);
}

export function kpi(card: DOMRect) {
  if (reduced()) return;
  const gauge = svgBox("fx-stroke gauge", inset(card, 0.05, 0.3, 0.9, 0.45), '<path pathLength="1" d="M10 90 A40 40 0 0 1 90 90"/>');
  draw(gauge, 0.4);
  fade(gauge, 1.6);
  const needle = box("fx-needle", new DOMRect(card.left + card.width / 2 - 2, card.top + card.height * 0.3 + card.height * 0.45 * 0.5, 4, card.height * 0.45 * 0.4));
  animate(needle, { rotate: [-80, 70, 50] }, { duration: 0.9, delay: 0.3, ease: "easeOut" });
  fade(needle, 1.6);
}

export function offTheBooks(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 5; i++) {
    const page = box("fx-page", inset(card, 0.5, 0.25, 0.4, 0.5));
    animate(page, { rotateY: [0, -180], transformPerspective: 500 } as any, { duration: 0.4, delay: i * 0.12, ease: "easeInOut" });
    done(animate(page, { opacity: [1, 1, 0] }, { duration: 1.2, delay: i * 0.12 }), page);
  }
}






export function lethe(r: DOMRect) {
  if (reduced()) return;
  const word = box("fx-glyph", inset(r, -0.3, 0.35, 1.6, 0.3));
  word.style.fontSize = "20px";
  word.style.color = "#c792ff";
  word.style.display = "flex";
  word.style.justifyContent = "center";
  for (const ch of "MEMORY") {
    const span = node("fx-letter", word, "span");
    span.textContent = ch;
  }
  [...word.children].forEach((el, i) => animate(el, { opacity: [1, 0], filter: ["blur(0px)", "blur(6px)"], y: [0, 14] } as any, { duration: 0.5, delay: 0.3 + i * 0.12 }));
  setTimeout(() => word.remove(), 1500);
}







function flyCards(from: Point, to: Point, n: number, cls = "", delay = 0, gap = 0.12) {
  for (let i = 0; i < n; i++) {
    const c = box(`fx-mini-card ${cls}`, new DOMRect(from[0] - 11, from[1] - 15, 22, 30));
    const dx = to[0] - from[0] + (i - (n - 1) / 2) * 14;
    const dy = to[1] - from[1];
    done(animate(c, { x: [0, dx * 0.5, dx], y: [0, dy * 0.5 - 50, dy], rotate: [0, (i - 1.5) * 12, (i - 1.5) * 6], opacity: [0, 1, 1, 0] }, { duration: 0.7, delay: delay + i * gap, times: [0, 0.15, 0.85, 1], ease: [0.4, 0, 0.3, 1] }), c);
  }
}

export function vrcation(card: DOMRect) {
  if (reduced()) return;
  const world = node("fx-sig fx-vr");
  const floor = node("fx-vr-floor", world);
  const sky = node("fx-vr-sky", world);
  const sun = node("fx-vr-sun", sky);
  animate(world, { opacity: [0, 1] }, { duration: 0.25 });
  animate(floor, { rotateX: [90, 68], backgroundPositionY: ["0px", "-160px"] } as any, { duration: 1.6, ease: "linear" });
  animate(sun, { y: [80, 0] }, { duration: 0.8, ease: "easeOut" });
  setTimeout(() => {
    const stack = pointOf(anchor("runner-deck")) ?? [innerWidth / 2, innerHeight - 60];
    const hand = pointOf(anchor("runner-hand")) ?? [innerWidth / 2, innerHeight - 30];
    flyCards(stack, hand, 4, "vr", 0, 0.14);
    buzz([10, 20, 10, 20, 10, 20, 10]);
  }, 500);
  setTimeout(() => {
    const pip = [...document.querySelectorAll('[data-anchor="runner-clicks"] i.on')].pop();
    if (pip) animate(pip, { opacity: [1, 0.2, 1, 0.2], scale: [1, 1.6, 1] }, { duration: 0.5 });
    animate(world, { scaleY: [1, 0.01, 0.01], scaleX: [1, 1, 0], opacity: [1, 1, 0] }, { duration: 0.45, times: [0, 0.5, 1], ease: "easeIn" }).finished.then(() => world.remove(), () => world.remove());
    flash("white", 0.2, 0.25);
  }, 1500);
}

export function violetClearance(card: DOMRect) {
  if (reduced()) return;
  const reader = box("fx-reader", new DOMRect(card.right - 8, card.top + card.height * 0.3, 26, card.height * 0.4));
  const led = node("fx-reader-led", reader);
  const key = box("fx-keycard", new DOMRect(card.right + 40, card.top + card.height * 0.32, 46, 30));
  animate(reader, { x: [30, 0], opacity: [0, 1] }, { duration: 0.25, ease: "easeOut" });
  animate(key, { x: [80, -48, -40], opacity: [0, 1, 1] }, { duration: 0.6, delay: 0.2, times: [0, 0.7, 1], ease: "easeOut" });
  setTimeout(() => {
    led.classList.add("ok");
    ring([card.right + 5, card.top + card.height * 0.5], "violet", 60);
    buzz([15, 40, 15]);
    const split = box("fx-clear-light", inset(card, 0.48, 0, 0.04, 1));
    animate(split, { scaleX: [0, 24, 30], opacity: [1, 0.9, 0] }, { duration: 0.9, ease: "easeOut" });
    setTimeout(() => split.remove(), 950);
  }, 800);
  setTimeout(() => {
    const at = center(card);
    credits(at, 8, "corp");
    flyCards(at, pointOf(anchor("corp-hand")) ?? [innerWidth / 2, 40], 4, "violet", 0.3);
  }, 1000);
  for (const el of [reader, key]) done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.9, times: [0, 0.85, 1] }), el);
}

export function hardHittingNews(card: DOMRect) {
  if (reduced()) return;
  const sheets: HTMLElement[] = [];
  for (let i = 0; i < 4; i++) {
    const sheet = tag("fx-paper fx-press", inset(card, -0.2, 0.3, 1.4, 0.42), "<b>BREAKING</b><i></i><i></i><i></i>");
    sheets.push(sheet);
    animate(sheet, { x: [-innerWidth, 0], rotate: [0, (i - 1.5) * 3] }, { duration: 0.22, delay: i * 0.13, ease: "easeOut" });
    animate(sheet.querySelectorAll("b, i"), { clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"] } as any, { duration: 0.2, delay: i * 0.13 + 0.1 });
    buzz(8);
  }
  const target = pointOf(anchor("runner-panel")) ?? [innerWidth / 2, innerHeight - 100];
  setTimeout(() => {
    const top = sheets[sheets.length - 1];
    const r = top.getBoundingClientRect();
    const dx = target[0] - (r.left + r.width / 2);
    const dy = target[1] - (r.top + r.height / 2);
    animate(top, { x: [0, dx], y: [0, dy], rotate: [3, 380], scale: [1, 0.55] }, { duration: 0.45, ease: [0.5, 0, 0.8, 0.6] }).finished.then(() => {
      shake(0.6);
      buzz([70, 30, 70]);
      for (let i = 0; i < 4; i++) setTimeout(() => ring([target[0] + (i - 1.5) * 34, target[1]], "red", 50), i * 90);
      animate(top, { opacity: [1, 0] }, { duration: 0.4 }).finished.then(() => top.remove());
    });
    sheets.slice(0, -1).forEach((s, i) => done(animate(s, { opacity: [1, 0], x: [0, -20 - i * 10] }, { duration: 0.35, delay: i * 0.05 }), s));
  }, 750);
}

function spot(name: string, fallback: Point): Point {
  return pointOf(anchor(name)) ?? fallback;
}

function after(ms: number, fn: () => void) {
  setTimeout(fn, ms);
}

function travel(el: HTMLElement, from: Point, to: Point, duration: number, opts: { delay?: number; arc?: number; spin?: number; ease?: any } = {}) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const arc = opts.arc ?? 0;
  return animate(el, { x: [0, dx * 0.5, dx], y: [0, dy * 0.5 - arc, dy], rotate: [0, (opts.spin ?? 0) / 2, opts.spin ?? 0] }, { duration, delay: opts.delay ?? 0, ease: opts.ease ?? [0.4, 0, 0.3, 1] });
}

function chip(cls: string, at: Point, w: number, h: number) {
  return box(cls, new DOMRect(at[0] - w / 2, at[1] - h / 2, w, h));
}

function pathLine(cls: string, points: Point[], duration: number) {
  const el = box(`fx-stroke ${cls}`, new DOMRect(0, 0, innerWidth, innerHeight));
  el.innerHTML = `<svg viewBox="0 0 ${innerWidth} ${innerHeight}"><polyline pathLength="1" points="${points.map((p) => p.join(",")).join(" ")}"/></svg>`;
  animate(el.querySelector("polyline")!, { strokeDashoffset: [1, 0] }, { duration, ease: "easeInOut" });
  return el;
}

function spark(points: Point[], duration: number, tone = "#a5f3fc", delay = 0) {
  const s = node("fx-sig fx-mote");
  s.style.background = tone;
  s.style.boxShadow = `0 0 10px ${tone}, 0 0 20px ${tone}`;
  s.style.width = s.style.height = "8px";
  s.style.margin = "-4px 0 0 -4px";
  s.style.left = `${points[0][0]}px`;
  s.style.top = `${points[0][1]}px`;
  done(animate(s, { x: points.map((p) => p[0] - points[0][0]), y: points.map((p) => p[1] - points[0][1]), opacity: [0, ...points.slice(1, -1).map(() => 1), 1, 0].slice(0, points.length) }, { duration, delay, ease: "linear" }), s);
}

export function aboveTheLaw(card: DOMRect) {
  if (reduced()) return;
  const target = spot("runner-panel", [innerWidth / 2, innerHeight - 100]);
  const gavel = chip("fx-gavel", [target[0] + 40, target[1] - 90], 16, 90);
  node("fx-gavel-head", gavel);
  animate(gavel, { rotate: [-70, -80, 25, 18], opacity: [0, 1, 1, 1] }, { duration: 0.75, times: [0, 0.4, 0.75, 1], ease: "easeIn" });
  after(560, () => {
    shake(0.8);
    buzz([90, 30]);
    ring([target[0], target[1] - 10], "gold", 160);
    burst([target[0], target[1] - 10], "orange", 18, 70, { size: 6, shards: true, gravity: 60 });
    const crack = chip("fx-crackline", [target[0], target[1]], 140, 3);
    done(animate(crack, { scaleX: [0, 1], opacity: [1, 1, 0] }, { duration: 0.9, times: [0, 0.2, 1] }), crack);
  });
  done(animate(gavel, { opacity: [1, 1, 0] }, { duration: 1.5, times: [0, 0.8, 1] }), gavel);
}

export function aggressiveTrendsetting(card: DOMRect) {
  if (reduced()) return;
  const start: Point = [card.left, card.bottom - 10];
  const end = spot("corp-clicks", [innerWidth - 40, 40]);
  const pts: Point[] = [start];
  for (let i = 1; i <= 6; i++) {
    const k = i / 6;
    pts.push([start[0] + (end[0] - start[0]) * k + (i % 2 ? 18 : -10), start[1] + (end[1] - start[1]) * k + (i % 2 ? 14 : -6)]);
  }
  pts.push(end);
  const line = pathLine("trend", pts, 0.8);
  spark(pts, 0.8, "#ff6b5e");
  after(800, () => {
    const pips = [...document.querySelectorAll('[data-anchor="corp-clicks"] i')];
    const pip = pips[pips.length - 1];
    if (pip) animate(pip, { scale: [1, 2, 1], backgroundColor: ["#1e2227", "#f6e03a", "#1e2227"] } as any, { duration: 0.8 });
    burst(end, "gold", 14, 40, { size: 4, gravity: 0 });
    buzz([20, 40]);
  });
  done(animate(line, { opacity: [1, 1, 0] }, { duration: 1.8, times: [0, 0.75, 1] }), line);
}

function plates(r: DOMRect, n: number, tone: string) {
  for (let i = 0; i < n; i++) {
    const plate = box("fx-plate", new DOMRect(r.left - 4, r.top + (r.height * i) / n, r.width + 8, r.height / n - 2));
    plate.style.borderColor = tone;
    animate(plate, { x: [i % 2 ? r.width * 1.5 : -r.width * 1.5, 0] }, { duration: 0.22, delay: i * 0.09, ease: "easeOut" });
    done(animate(plate, { opacity: [1, 1, 0] }, { duration: 1.5, delay: i * 0.09, times: [0, 0.75, 1] }), plate);
    after(220 + i * 90, () => buzz(12));
  }
}

export function ansel(r: DOMRect) {
  if (reduced()) return;
  plates(r, 3, "#c792ff");
  after(450, () => {
    const visor = box("fx-visor", new DOMRect(r.left, r.top + r.height * 0.32, r.width, 6));
    animate(visor, { scaleX: [0, 1] }, { duration: 0.25 });
    done(animate(visor, { opacity: [1, 1, 0] }, { duration: 1, times: [0, 0.7, 1] }), visor);
  });
  after(750, () => {
    for (const dx of [-0.18, 0.18]) {
      const eye = disc("fx-eye", [r.left + r.width * (0.5 + dx), r.top + r.height * 0.35], 10);
      done(animate(eye, { scale: [0, 1.6, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }, { duration: 0.9 }), eye);
    }
    buzz([30, 30]);
  });
}

export function ansel2(r: DOMRect) {
  if (reduced()) return;
  plates(r, 4, "#e6d6ff");
  after(500, () => {
    for (const side of [-1, 1]) {
      const arm = box("fx-arm", new DOMRect(side < 0 ? r.left - r.width * 0.9 : r.right, r.top + r.height * 0.45, r.width * 0.9, 8));
      arm.style.transformOrigin = side < 0 ? "100% 50%" : "0 50%";
      animate(arm, { scaleX: [0, 1, 1], rotate: [0, 0, side * -25] }, { duration: 0.6, times: [0, 0.5, 1], ease: "easeOut" });
      done(animate(arm, { opacity: [1, 1, 0] }, { duration: 1.3, times: [0, 0.8, 1] }), arm);
    }
    buzz([40, 20, 40]);
  });
  after(1000, () => {
    const pips = [...document.querySelectorAll('[data-anchor="runner-clicks"] i.on')].slice(-2);
    pips.forEach((p, i) => animate(p, { opacity: [1, 0.15, 1], scale: [1, 1.5, 1] }, { duration: 0.4, delay: i * 0.12 }));
  });
}

export function azimat(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 2; i++) {
    const coin = disc("fx-coin-big", at, 18);
    const a0 = i * Math.PI;
    const xs = Array.from({ length: 13 }, (_, k) => Math.cos(a0 + k * 0.6) * r.width * 0.7 * (1 - k / 16));
    const ys = Array.from({ length: 13 }, (_, k) => Math.sin(a0 + k * 0.6) * r.width * 0.28 * (1 - k / 16) + (k > 10 ? (k - 10) * 6 : 0));
    animate(coin, { x: xs, y: ys, scale: [0.6, ...Array(11).fill(1), 0.8] }, { duration: 1.2, ease: "linear" });
    done(animate(coin, { opacity: [0, 1, 1, 0] }, { duration: 1.5, times: [0, 0.1, 0.85, 1] }), coin);
  }
  after(1200, () => {
    ring(at, "gold", r.width);
    buzz([10, 30, 10]);
  });
}

export function baker(r: DOMRect) {
  if (reduced()) return;
  const from = center(r);
  const archives = spot("corp-hand", [innerWidth * 0.7, 80]);
  const rd = spot("corp-deck", [innerWidth * 0.5, 80]);
  const mid: Point = [(from[0] + archives[0]) / 2 + 40, (from[1] + archives[1]) / 2];
  const pts: Point[] = [from, mid, [archives[0], archives[1] + 30], [(archives[0] + rd[0]) / 2, archives[1] + 50], rd];
  const line = pathLine("geo", pts, 1);
  spark(pts, 1.1, "#a5f3fc");
  after(500, () => {
    ring([archives[0], archives[1] + 30], "cyan", 60);
    buzz(20);
  });
  after(1100, () => {
    ring(rd, "cyan", 110);
    burst(rd, "cyan", 14, 50, { size: 4, gravity: 0 });
    buzz([20, 40]);
  });
  done(animate(line, { opacity: [1, 1, 0] }, { duration: 1.8, times: [0, 0.75, 1] }), line);
}

export function betaBuild(card: DOMRect) {
  if (reduced()) return;
  const grid = box("fx-blueprint", inset(card, 0.1, 0.15, 0.8, 0.7));
  animate(grid, { clipPath: ["inset(100% 0 0 0)", "inset(0% 0 0 0)"] } as any, { duration: 0.6, ease: "linear" });
  const rig = spot("runner-panel", [innerWidth / 2, innerHeight - 100]);
  after(650, () => {
    const r = grid.getBoundingClientRect();
    animate(grid, { x: [0, rig[0] - (r.left + r.width / 2)], y: [0, rig[1] - (r.top + r.height / 2)], scale: [1, 0.25] }, { duration: 0.45, ease: [0.5, 0, 0.7, 0.4] }).finished.then(() => {
      grid.remove();
      ring(rig, "cyan", 90);
      burst(rig, "cyan", 12, 40, { size: 3, gravity: 0 });
      buzz([10, 30]);
      const dash = chip("fx-dash", rig, 6, 70);
      done(animate(dash, { y: [0, -innerHeight * 0.6], opacity: [1, 0] }, { duration: 0.5, ease: "easeIn" }), dash);
    }, () => grid.remove());
  });
}

export function biawak(r: DOMRect) {
  if (reduced()) return;
  const from: Point = [r.left + r.width / 2, r.bottom - 6];
  const to = spot("runner-panel", [innerWidth / 2, innerHeight - 100]);
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const tongue = chip("fx-tongue", from, len, 6);
  tongue.style.left = `${from[0]}px`;
  tongue.style.top = `${from[1] - 3}px`;
  tongue.style.transformOrigin = "0 50%";
  const angle = (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
  animate(tongue, { scaleX: [0, 1, 1, 0], rotate: [angle, angle, angle, angle] }, { duration: 0.8, times: [0, 0.3, 0.45, 1], ease: "easeInOut" });
  after(820, () => tongue.remove());
  after(360, () => {
    const prey = box("fx-mini-card vr", new DOMRect(to[0] - 10, to[1] - 14, 20, 28));
    animate(prey, { x: [0, from[0] - to[0]], y: [0, from[1] - to[1]], rotate: [0, 200] }, { duration: 0.45, ease: "easeIn" }).finished.then(() => {
      prey.remove();
      burst(from, "green", 16, 50, { size: 5, shards: true, gravity: 40 });
      shake(0.4);
      buzz([40, 20, 60]);
    }, () => prey.remove());
  });
}

export function biggerPicture(card: DOMRect) {
  if (reduced()) return;
  const runner = spot("runner-panel", [innerWidth / 2, innerHeight - 100]);
  const frame = chip("fx-frame", runner, 80, 50);
  animate(frame, { scale: [1, 1, 6], opacity: [0, 1, 0] }, { duration: 1, times: [0, 0.3, 1], ease: "easeIn" });
  after(1000, () => frame.remove());
  after(500, () => {
    for (let i = 0; i < 3; i++) after(i * 150, () => ring(runner, "red", 70 + i * 40));
  });
  after(900, () => {
    const from = spot("runner-credits", runner);
    const to = spot("corp-credits", [40, 40]);
    coins(from, to, 5, "gold");
    buzz([20, 20, 20, 60]);
  });
}

export function buzzsaw(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const saw = disc("fx-saw", at, r.width * 0.9);
  animate(saw, { rotate: [0, 60, 1500, 1620] }, { duration: 1.5, times: [0, 0.2, 0.85, 1], ease: "linear" });
  animate(saw, { x: [0, 0, r.width * 0.35, r.width * 0.35, 0] }, { duration: 1.5, times: [0, 0.3, 0.45, 0.75, 1] });
  done(animate(saw, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.1, 0.85, 1] }), saw);
  for (let i = 0; i < 8; i++) after(500 + i * 50, () => burst([at[0] + r.width * 0.8, at[1]], i % 2 ? "gold" : "orange", 4, 50, { size: 3, gravity: 120 }));
  after(450, () => buzz([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]));
}

export function byte(r: DOMRect) {
  if (reduced()) return;
  const marks = [0, 1, 2].map((i) => {
    const m = disc("fx-bite", [r.right - 4, r.top + r.height * (0.25 + i * 0.18)], r.width * 0.35);
    animate(m, { scale: [0, 1.15, 1] }, { duration: 0.15, delay: i * 0.12 });
    after(i * 120, () => buzz(30));
    return m;
  });
  marks.forEach((m) => done(animate(m, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.8, 1] }), m));
  after(500, () => {
    const runner = spot("runner-panel", [innerWidth / 2, innerHeight - 100]);
    spark([center(r), runner], 0.35, "#c792ff");
    after(350, () => {
      ring(runner, "violet", 120);
      ring(runner, "red", 70, 0.15);
      shake(0.5);
      buzz([60, 30, 60]);
    });
  });
}

export function cacophony(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 4; i++) {
    const wave = disc("fx-speaker", at, r.width * (0.8 + i * 0.5));
    done(animate(wave, { scale: [0.4, 1.6], opacity: [0.9, 0] }, { duration: 0.6, delay: i * 0.1 }), wave);
  }
  after(350, () => {
    const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
    for (let i = 0; i < 3; i++) {
      const c = box("fx-mini-card blue", new DOMRect(hq[0] - 10 + (i - 1) * 24, hq[1] - 14, 20, 28));
      animate(c, { x: [0, -3, 3, -3, 0], rotate: [0, -8, 8, -4, 0] }, { duration: 0.35, delay: i * 0.05 });
      done(animate(c, { y: [0, 0, 120], rotate: [0, 0, (i - 1) * 60], opacity: [1, 1, 0] }, { duration: 1, delay: 0.35 + i * 0.08, times: [0, 0.2, 1], ease: "easeIn" }), c);
    }
    shake(0.4);
    buzz([20, 20, 20, 20, 60]);
  });
}

export function caveatEmptor(card: DOMRect) {
  if (reduced()) return;
  const receipt = box("fx-receipt", new DOMRect(card.left + card.width * 0.2, card.top + card.height * 0.15, card.width * 0.6, card.height * 0.7));
  for (let i = 0; i < 6; i++) node("fx-receipt-line", receipt);
  animate(receipt, { clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"] } as any, { duration: 0.6, ease: "linear" });
  after(80, () => buzz([5, 5, 5, 5, 5, 5, 5]));
  after(800, () => {
    animate(receipt, { scale: [1, 0.2], rotate: [0, 220], opacity: [1, 0] }, { duration: 0.35, ease: "easeIn" }).finished.then(() => receipt.remove(), () => receipt.remove());
    credits(center(card), 6, "corp");
    const pip = [...document.querySelectorAll('[data-anchor="runner-clicks"] i')].pop();
    if (pip) animate(pip, { opacity: [1, 0.1, 0.4], scale: [1, 1.6, 1] }, { duration: 0.6, delay: 0.3 });
  });
}

export function charmOffensive(card: DOMRect) {
  if (reduced()) return;
  const target = spot("corp-hand", [innerWidth * 0.7, 60]);
  const from = center(card);
  for (let i = 0; i < 5; i++) {
    const heart = chip("fx-heart", from, 16, 16);
    done(animate(heart, { x: [0, (target[0] - from[0]) * 0.5 + (i - 2) * 16, target[0] - from[0]], y: [0, (target[1] - from[1]) * 0.5 - 40, target[1] - from[1]], scale: [0.4, 1.2, 0.8], opacity: [0, 1, 0] }, { duration: 0.8, delay: i * 0.08, ease: "easeInOut" }), heart);
  }
  after(900, () => {
    ring(target, "red", 90);
    burst(target, "red", 20, 60, { size: 5, shards: true, gravity: 60 });
    buzz([20, 40, 80]);
  });
}

export function chromatophores(r: DOMRect) {
  if (reduced()) return;
  const skin = box("fx-chroma-skin", inset(r, -0.06, -0.06, 1.12, 1.12));
  animate(skin, { borderColor: ["#ff9f1c", "#7fb0ff", "#ff3b30", "#ff9f1c", "#7fb0ff", "#ff3b30"], boxShadow: ["0 0 18px #ff9f1c", "0 0 18px #7fb0ff", "0 0 18px #ff3b30", "0 0 18px #ff9f1c", "0 0 18px #7fb0ff", "0 0 18px #ff3b30"] } as any, { duration: 1.2, ease: "linear" });
  done(animate(skin, { opacity: [0, 1, 1, 0] }, { duration: 1.5, times: [0, 0.1, 0.85, 1] }), skin);
  after(1200, () => {
    (["orange", "blue", "red"] as const).forEach((tone, i) => ring(center(r), tone, r.width * (1.1 + i * 0.3), i * 0.08));
    buzz([10, 20, 10, 20, 40]);
  });
}

export function cleanGetaway(card: DOMRect) {
  if (reduced()) return;
  const runner = spot("runner-panel", [innerWidth / 2, innerHeight - 100]);
  const server = pointOf(document.querySelector(".server")) ?? [innerWidth / 2, innerHeight * 0.25];
  const dot = chip("fx-runner-dot", runner, 14, 14);
  animate(dot, { x: [0, server[0] - runner[0], server[0] - runner[0], 0], y: [0, server[1] - runner[1], server[1] - runner[1], 0], scale: [1, 1, 1.4, 1] }, { duration: 1.3, times: [0, 0.35, 0.5, 1], ease: "easeInOut" });
  done(animate(dot, { opacity: [0, 1, 1, 0] }, { duration: 1.4, times: [0, 0.05, 0.9, 1] }), dot);
  after(500, () => {
    ring(server, "cyan", 120);
    buzz(30);
  });
  after(700, () => {
    for (let i = 0; i < 6; i++) after(i * 60, () => coins(server, spot("runner-credits", runner), 1, "gold"));
    for (const dx of [-8, 8]) {
      const light = chip("fx-mote", [server[0] + dx, server[1]], 6, 6);
      light.style.background = "#ff3b30";
      light.style.boxShadow = "0 0 10px #ff3b30";
      done(animate(light, { x: [0, runner[0] - server[0]], y: [0, runner[1] - server[1]], opacity: [1, 0] }, { duration: 0.6, ease: "easeIn" }), light);
    }
  });
}

export function conduit(r: DOMRect) {
  if (reduced()) return;
  const from = spot("corp-deck", [innerWidth * 0.5, 60]);
  const to = center(r);
  const pts: Point[] = [from, [from[0], (from[1] + to[1]) / 2], [to[0], (from[1] + to[1]) / 2], to];
  const pipe = pathLine("pipe", pts, 0.5);
  for (let i = 0; i < 5; i++) spark(pts, 0.7, "#3ddc84", 0.4 + i * 0.12);
  after(1100, () => {
    ring(to, "green", r.width * 1.2);
    burst(to, "green", 10, 30, { size: 4, gravity: 0 });
    buzz([10, 10, 30]);
  });
  done(animate(pipe, { opacity: [1, 1, 0] }, { duration: 1.8, times: [0, 0.75, 1] }), pipe);
}

export function cookbook(r: DOMRect) {
  if (reduced()) return;
  const book = tag("fx-book", inset(r, -0.1, 0.3, 1.2, 0.45), "<i></i><i></i>");
  for (const [i, page] of [...book.children].entries()) animate(page, { rotateY: [i ? -90 : 90, 0], transformPerspective: 400 } as any, { duration: 0.35, ease: "easeOut" });
  for (let k = 0; k < 3; k++) {
    const leaf = box("fx-page", inset(r, 0.5, 0.32, 0.55, 0.4));
    animate(leaf, { rotateY: [0, -180], transformPerspective: 500 } as any, { duration: 0.3, delay: 0.35 + k * 0.12 });
    done(animate(leaf, { opacity: [1, 1, 0] }, { duration: 0.7, delay: 0.35 + k * 0.12 }), leaf);
  }
  after(800, () => {
    const at: Point = [r.left + r.width / 2, r.top + r.height * 0.45];
    for (let i = 0; i < 6; i++) {
      const wisp = node("fx-sig fx-drop");
      wisp.style.left = `${at[0]}px`;
      wisp.style.top = `${at[1]}px`;
      done(animate(wisp, { x: [0, (i - 2.5) * 20, (i - 2.5) * 50], y: [0, -40, -10], opacity: [0, 1, 0], scale: [0.5, 1.2, 0.6] }, { duration: 0.9, delay: i * 0.05, ease: "easeOut" }), wisp);
    }
    buzz([10, 20, 10]);
  });
  done(animate(book, { opacity: [1, 1, 0] }, { duration: 1.7, times: [0, 0.8, 1] }), book);
}

export function corsair(r: DOMRect) {
  if (reduced()) return;
  const ice = document.querySelector<HTMLElement>('.tile[data-cid] ');
  const barrier = [...document.querySelectorAll<HTMLElement>(".server .tile[data-cid]")][0] ?? ice;
  const target = pointOf(barrier) ?? center(r);
  const blade = svgBox("fx-stroke cutlass", new DOMRect(target[0] - 70, target[1] - 70, 140, 140), '<path pathLength="1" d="M10 90 Q 30 20 90 10"/>');
  draw(blade, 0.25);
  done(animate(blade, { opacity: [1, 1, 0], rotate: [-30, 10, 10] }, { duration: 0.8, times: [0, 0.3, 1] }), blade);
  after(250, () => {
    if (barrier) animate(barrier, { scale: [1, 0.8, 0.88, 0.85, 1] }, { duration: 1.2, times: [0, 0.2, 0.4, 0.8, 1] });
    burst(target, "orange", 14, 60, { size: 5, shards: true, gravity: 40 });
    floater([target[0], target[1] - 30], "−3 str", "orange", 40, true);
    buzz([40, 20]);
  });
  for (let i = 0; i < 6; i++) {
    const puff = disc("fx-steam", [r.left + Math.random() * r.width, r.top + r.height * 0.8], 20);
    done(animate(puff, { y: [0, -30], scale: [0.5, 1.4], opacity: [0, 0.6, 0] }, { duration: 1, delay: 0.3 + i * 0.06 }), puff);
  }
}

export function cultivate(card: DOMRect) {
  if (reduced()) return;
  const rd = spot("corp-deck", [innerWidth * 0.5, 60]);
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  const fan = [0, 1, 2, 3, 4].map((i) => {
    const c = box("fx-mini-card blue", new DOMRect(rd[0] - 11, rd[1] - 15, 22, 30));
    animate(c, { x: [0, (i - 2) * 30], y: [0, 60], rotate: [0, (i - 2) * 10] }, { duration: 0.35, delay: i * 0.05, ease: "easeOut" });
    return c;
  });
  after(650, () => {
    animate(fan[0], { y: [60, 160], rotate: [-20, -90], opacity: [1, 0] }, { duration: 0.5, ease: "easeIn" });
    burst([rd[0] - 60, rd[1] + 60], "red", 10, 30, { size: 4, gravity: 60 });
    animate(fan[4], { x: [60, hq[0] - rd[0]], y: [60, hq[1] - rd[1]], rotate: [20, 0] }, { duration: 0.5, ease: "easeInOut" });
    buzz([20, 20]);
  });
  after(1150, () => {
    [fan[1], fan[2], fan[3]].forEach((c, i) => animate(c, { x: [(i - 1) * 30, 0], y: [60, 0], rotate: [(i - 1) * 10, 0] }, { duration: 0.35, delay: i * 0.06, ease: "easeIn" }));
    ring(rd, "blue", 70, 0.3);
  });
  after(1700, () => fan.forEach((c) => c.remove()));
}

const RUNNER: Point = [innerWidth / 2, innerHeight - 100];

function iceTiles(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(".ices .tile[data-cid], .fxlab-server .tile[data-cid]")].filter((el) => el.closest(".tile-wrap"));
}

function bolt(from: Point, to: Point, tone: "red" | "violet" | "cyan" | "gold" | "green", onHit?: () => void, delay = 0) {
  const colors = { red: "#ff3b30", violet: "#c792ff", cyan: "#22d3ee", gold: "#f6e03a", green: "#3ddc84" };
  after(delay * 1000, () => {
    spark([from, to], 0.35, colors[tone]);
    after(350, () => {
      ring(to, tone, 90);
      burst(to, tone, 10, 40, { size: 4, gravity: 0 });
      onHit?.();
    });
  });
}

export function dzmz(r: DOMRect) {
  if (reduced()) return;
  const chipEl = box("fx-chip", inset(r, 0.2, 0.3, 0.6, 0.4));
  animate(chipEl, { y: [-r.height, 0], rotate: [-20, 0] }, { duration: 0.35, ease: "easeIn" });
  after(350, () => {
    shake(0.2);
    buzz(30);
    for (let i = 0; i < 6; i++) {
      const pin = disc("fx-orb", [r.left + r.width * (0.25 + (i % 3) * 0.25), r.top + r.height * (i < 3 ? 0.27 : 0.73)], 6);
      done(animate(pin, { opacity: [0, 1, 0] }, { duration: 0.5, delay: i * 0.06 }), pin);
    }
  });
  after(800, () => {
    const coin = disc("fx-coin-big", center(r), 18);
    travel(coin, center(r), spot("runner-credits", RUNNER), 0.6, { arc: 60, spin: 360 }).finished.then(() => coin.remove(), () => coin.remove());
  });
  done(animate(chipEl, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.8, 1] }), chipEl);
}

export function detente(r: DOMRect) {
  if (reduced()) return;
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  const card = box("fx-mini-card blue", new DOMRect(hq[0] - 11, hq[1] - 15, 22, 30));
  const to: Point = [r.left + r.width / 2, r.top + r.height * 0.3];
  travel(card, hq, to, 0.7, { arc: 70, spin: 360 }).finished.then(() => {
    ring(to, "cyan", 70);
    burst(to, "cyan", 10, 30, { size: 3, gravity: 0 });
    buzz([10, 30]);
  });
  done(animate(card, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.1, 0.8, 1] }), card);
}

export function devadatta(r: DOMRect) {
  if (reduced()) return;
  const rd = spot("corp-deck", [innerWidth / 2, 60]);
  const home: Point = [r.left + r.width / 2, r.top];
  const drone = chip("fx-drone", home, 32, 14);
  animate(drone, { x: [0, rd[0] - home[0], rd[0] - home[0], 0], y: [0, rd[1] + 30 - home[1], rd[1] + 30 - home[1], 0], rotate: [0, 10, -5, 0] }, { duration: 1.8, times: [0, 0.35, 0.7, 1], ease: "easeInOut" });
  done(animate(drone, { opacity: [0, 1, 1, 0] }, { duration: 1.9, times: [0, 0.05, 0.9, 1] }), drone);
  after(650, () => {
    const beam = box("fx-spotlight", new DOMRect(rd[0] - 30, rd[1] - 10, 60, 50));
    beam.style.transform = "scaleY(-1)";
    done(animate(beam, { opacity: [0, 1, 1, 0] }, { duration: 0.6 }), beam);
    flyCards(rd, [rd[0], rd[1] + 50], 2, "blue", 0.1, 0.15);
    buzz([10, 10, 10, 10]);
  });
}

export function diviner(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const orb = disc("fx-crystal", at, r.width * 0.75);
  const mist = disc("fx-hypno", at, r.width * 0.6);
  animate(orb, { scale: [0.2, 1.1, 1] }, { duration: 0.5, ease: "easeOut" });
  animate(mist, { rotate: [0, 540], scale: [0.2, 1] }, { duration: 1, ease: "easeOut" });
  done(animate(orb, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.1, 0.8, 1] }), orb);
  done(animate(mist, { opacity: [0, 0.7, 0.7, 0] }, { duration: 1.6, times: [0, 0.1, 0.8, 1] }), mist);
  after(900, () => {
    const hand = spot("runner-hand", RUNNER);
    bolt(at, hand, "violet", () => {
      const c = box("fx-mini-card vr", new DOMRect(hand[0] - 10, hand[1] - 14, 20, 28));
      done(animate(c, { y: [0, -30, 40], rotate: [0, 20, 90], opacity: [1, 1, 0], filter: ["brightness(1)", "brightness(3)", "brightness(0.2)"] } as any, { duration: 0.7 }), c);
      buzz([40, 20, 40]);
    });
  });
}

export function docklandsPass(r: DOMRect) {
  if (reduced()) return;
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  for (const side of [-1, 1]) {
    const bar = box("fx-brace", new DOMRect(side < 0 ? hq[0] - 44 : hq[0], hq[1] + 30, 44, 6));
    bar.style.transformOrigin = side < 0 ? "0 50%" : "100% 50%";
    animate(bar, { rotate: [0, side * -80] }, { duration: 0.4, delay: 0.2, ease: "easeOut" });
    done(animate(bar, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.1, 0.8, 1] }), bar);
  }
  const from: Point = [r.left + r.width / 2, r.top];
  for (let i = 0; i < 2; i++) {
    const dot = chip("fx-runner-dot", from, 12, 12);
    travel(dot, from, [hq[0], hq[1] + 10], 0.6, { delay: 0.5 + i * 0.25, arc: 40 }).finished.then(() => {
      dot.remove();
      ring(hq, "blue", 60 + i * 30);
      buzz(20);
    }, () => dot.remove());
  }
}

export function doomscroll(r: DOMRect) {
  if (reduced()) return;
  const feed = box("fx-feed", inset(r, -0.1, -0.05, 1.2, 1.1));
  const strip = node("fx-feed-strip", feed);
  for (let i = 0; i < 14; i++) node("fx-feed-line", strip);
  animate(strip, { y: [0, -r.height * 1.5] }, { duration: 1.4, ease: [0.3, 0, 0.7, 1] });
  done(animate(feed, { opacity: [0, 1, 1, 0] }, { duration: 1.5, times: [0, 0.1, 0.85, 1] }), feed);
  const at = center(r);
  const runner = spot("runner-panel", RUNNER);
  bolt(at, runner, "red", () => buzz(30), 0.4);
  bolt(at, runner, "violet", () => buzz(40), 0.75);
  bolt(at, runner, "violet", () => {
    shake(0.5);
    buzz([60, 30, 60]);
  }, 1.1);
}

export function echelon(r: DOMRect) {
  if (reduced()) return;
  const breakers = [...document.querySelectorAll<HTMLElement>('.rig-cards .tile[data-cid], .fxlab-rig .tile[data-cid]')].slice(0, 4);
  const to = center(r);
  breakers.forEach((b, i) => {
    const from = pointOf(b);
    if (from) spark([from, to], 0.4, "#22d3ee", i * 0.15);
    after(400 + i * 150, () => {
      const ch = box("fx-chevron", new DOMRect(r.left + r.width * 0.2, r.bottom - (i + 1) * r.height * 0.2, r.width * 0.6, r.height * 0.15));
      done(animate(ch, { scale: [1.5, 1], opacity: [0, 1, 1, 0] }, { duration: 1.4 - i * 0.15, times: [0, 0.15, 0.85, 1] }), ch);
      buzz(10);
    });
  });
}

export function embeddedReporting(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 6; i++)
    after(i * 120, () => {
      const p: Point = [card.left + Math.random() * card.width, card.top + Math.random() * card.height * 0.6];
      const f = disc("fx-camflash", p, 30);
      done(animate(f, { scale: [0.3, 1.6], opacity: [1, 0] }, { duration: 0.3 }), f);
      buzz(8);
    });
  after(900, () => {
    const rd = spot("corp-deck", [innerWidth / 2, 60]);
    const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
    flyCards(rd, hq, 1, "blue");
    ring(rd, "blue", 70);
  });
}

export function empiricist(r: DOMRect) {
  if (reduced()) return;
  const rd = spot("corp-deck", [innerWidth / 2, 60]);
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  const flask = box("fx-flask", inset(r, 0.25, 0.2, 0.5, 0.6));
  done(animate(flask, { opacity: [0, 1, 1, 0], rotate: [0, -8, 8, 0] }, { duration: 1.6, times: [0, 0.2, 0.8, 1] }), flask);
  rain(inset(r, 0.3, 0.2, 0.4, 0.5), 10, "#3ddc84", true);
  after(400, () => flyCards(rd, hq, 1, "blue"));
  after(1000, () => {
    flyCards(hq, rd, 1, "blue");
    after(700, () => ring(rd, "green", 60));
  });
}

export function flagship(r: DOMRect) {
  if (reduced()) return;
  const pole = box("fx-pole", new DOMRect(r.left + r.width * 0.2, r.top - r.height * 0.3, 3, r.height * 1.2));
  const flag = box("fx-flag", new DOMRect(r.left + r.width * 0.2 + 3, r.top - r.height * 0.3, r.width * 0.55, r.height * 0.28));
  animate(flag, { y: [r.height * 0.9, 0], skewY: [0, 6, -4, 6, -4, 0] }, { duration: 1.2, ease: "easeOut" });
  for (const el of [pole, flag]) done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: 1.9, times: [0, 0.1, 0.85, 1] }), el);
  const runner = spot("runner-panel", RUNNER);
  const dot = chip("fx-runner-dot", runner, 12, 12);
  const gate: Point = [r.left + r.width / 2, r.bottom + 10];
  animate(dot, { x: [0, gate[0] - runner[0], (gate[0] - runner[0]) * 0.7], y: [0, gate[1] - runner[1], (gate[1] - runner[1]) * 0.7] }, { duration: 0.9, delay: 0.7, times: [0, 0.6, 1], ease: "easeOut" });
  after(1250, () => {
    ring(gate, "blue", 70);
    buzz([40, 20]);
  });
  done(animate(dot, { opacity: [0, 1, 1, 0] }, { duration: 1.2, delay: 0.7, times: [0, 0.1, 0.8, 1] }), dot);
}

export function floodTheMarket(card: DOMRect) {
  if (reduced()) return;
  const tiles = iceTiles().slice(-3);
  const row = tiles.length ? tiles.map((t) => t.getBoundingClientRect()) : [card];
  const top = Math.min(...row.map((t) => t.top));
  const bottom = Math.max(...row.map((t) => t.bottom));
  const wave = box("fx-tide", new DOMRect(0, top - 10, innerWidth, bottom - top + 20));
  wave.style.filter = "hue-rotate(-150deg)";
  animate(wave, { clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)", "inset(0 0 0 100%)"] } as any, { duration: 1.1, ease: "easeInOut" });
  done(animate(wave, { opacity: [0.8, 0.8, 0] }, { duration: 1.2, times: [0, 0.8, 1] }), wave);
  row.forEach((t, i) =>
    after(500 + i * 150, () => {
      const token = chip("fx-advtoken", [t.left + t.width / 2, t.top - 20], 14, 14);
      done(animate(token, { y: [-30, 18, 14], opacity: [0, 1, 1, 0] }, { duration: 1, times: [0, 0.4, 0.8, 1] }), token);
      buzz(15);
    }),
  );
}

export function flyswatter(r: DOMRect) {
  if (reduced()) return;
  const sw = box("fx-swatter", inset(r, -0.2, -0.2, 1.4, 1.4));
  animate(sw, { rotateX: [75, 0], transformPerspective: 400 } as any, { duration: 0.22, delay: 0.2, ease: "easeIn" });
  done(animate(sw, { opacity: [0, 1, 1, 0] }, { duration: 1, delay: 0.2, times: [0, 0.2, 0.7, 1] }), sw);
  after(420, () => {
    shake(0.6);
    buzz(80);
    for (const b of [...document.querySelectorAll<HTMLElement>('.rig-cards .tile[data-cid], .fxlab-rig .tile[data-cid]')].slice(0, 4)) {
      const p = pointOf(b);
      if (!p) continue;
      for (let i = 0; i < 4; i++) {
        const v = disc("fx-orb", [p[0] + (Math.random() - 0.5) * 20, p[1] + (Math.random() - 0.5) * 30], 8);
        v.style.filter = "hue-rotate(-90deg)";
        done(animate(v, { y: [0, -30], scale: [1, 0], opacity: [1, 0] }, { duration: 0.6, delay: Math.random() * 0.2 }), v);
      }
    }
  });
}

export function flywheel(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const wheel = disc("fx-flywheel", at, r.width * 1.1);
  animate(wheel, { rotate: [0, 1800] }, { duration: 1.6, ease: [0.5, 0, 0.3, 1] });
  done(animate(wheel, { opacity: [0, 1, 1, 0] }, { duration: 1.7, times: [0, 0.1, 0.85, 1] }), wheel);
  for (let k = 0; k < 2; k++)
    after(500 + k * 450, () => {
      credits(at, 1, "corp");
      flyCards(at, spot("corp-hand", [innerWidth * 0.7, 60]), 1, "blue");
      burst([at[0] + r.width * 0.55, at[1]], "cyan", 8, 40, { size: 3, gravity: 40 });
      buzz(20);
    });
}

export function fransofia(r: DOMRect) {
  if (reduced()) return;
  iceTiles().forEach((t, i) => {
    const rr = t.getBoundingClientRect();
    const tagEl = box("fx-pricetag", new DOMRect(rr.right - 12, rr.top + 4, 34, 18));
    tagEl.textContent = "+1";
    animate(tagEl, { rotate: [-60, 20, -10, 0], y: [-20, 0] }, { duration: 0.6, delay: 0.2 + i * 0.12, ease: "easeOut" });
    done(animate(tagEl, { opacity: [0, 1, 1, 0] }, { duration: 1.6, delay: 0.2 + i * 0.12, times: [0, 0.1, 0.8, 1] }), tagEl);
    after(300 + i * 120, () => buzz(10));
  });
}

export function governmentSubsidy(card: DOMRect) {
  if (reduced()) return;
  const cheque = box("fx-cheque", inset(card, -0.15, 0.35, 1.3, 0.3));
  animate(cheque, { x: [-innerWidth, 0], rotate: [-6, -3] }, { duration: 0.35, ease: "easeOut" });
  const sig = svgBox("fx-stroke ink", inset(card, 0.35, 0.48, 0.55, 0.12), '<path pathLength="1" d="M0 70 C15 10 25 90 40 40 S60 20 70 60 S90 30 100 50"/>');
  sig.querySelector("svg")!.setAttribute("preserveAspectRatio", "none");
  after(350, () => draw(sig, 0.4));
  after(850, () => {
    const to = spot("corp-credits", [40, 40]);
    const r = cheque.getBoundingClientRect();
    animate(cheque, { scale: [1, 0.2], opacity: [1, 0] }, { duration: 0.35 }).finished.then(() => cheque.remove(), () => cheque.remove());
    sig.remove();
    for (let i = 0; i < 5; i++) after(i * 70, () => coins([r.left + Math.random() * r.width, r.top + r.height / 2], to, 3, "gold"));
    buzz([20, 20, 20, 20, 80]);
  });
}

export function hackerspace(r: DOMRect) {
  if (reduced()) return;
  const el = svgBox("fx-stroke circuit", inset(r, -0.05, 0, 1.1, 1), '<path pathLength="1" d="M5 20 H40 V50 H70 V85 M95 15 H75 V40 H50 M10 80 H30 V60 H55"/>');
  draw(el, 0.6);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.7, times: [0, 0.8, 1] }), el);
  const hand = spot("runner-hand", RUNNER);
  for (let i = 0; i < 2; i++) {
    const c = box("fx-mini-card", new DOMRect(hand[0] - 10, hand[1] - 14, 20, 28));
    const to: Point = [r.left + r.width * (0.3 + i * 0.4), r.top + r.height * 0.15];
    travel(c, hand, to, 0.6, { delay: 0.5 + i * 0.2, arc: 50 }).finished.then(() => {
      ring(to, "green", 40);
      buzz(15);
    });
    done(animate(c, { opacity: [0, 1, 1, 0] }, { duration: 1.4, delay: 0.5 + i * 0.2, times: [0, 0.1, 0.8, 1] }), c);
  }
}

export function hanseiReview(card: DOMRect) {
  if (reduced()) return;
  const at = center(card);
  for (let i = 0; i < 3; i++) {
    const breath = disc("fx-breath", at, card.width * 1.2);
    done(animate(breath, { scale: [0.6, 1.4], opacity: [0, 0.6, 0] }, { duration: 1.2, delay: i * 0.35, ease: "easeInOut" }), breath);
  }
  after(500, () => {
    const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
    const c = box("fx-mini-card blue", new DOMRect(hq[0] - 11, hq[1] - 15, 22, 30));
    done(animate(c, { y: [0, 50, 70], opacity: [1, 1, 0], filter: ["brightness(1)", "brightness(3) sepia(1)", "brightness(0)"] } as any, { duration: 0.8 }), c);
    after(500, () => burst([hq[0], hq[1] + 60], "orange", 12, 30, { size: 4, gravity: -40 }));
  });
  after(1000, () => {
    credits(at, 10, "corp");
    buzz([20, 60]);
  });
}

export function hantu(r: DOMRect) {
  if (reduced()) return;
  const ghost = box("fx-phantom", r);
  ghost.style.borderColor = "#c792ff";
  ghost.style.background = "rgb(199 146 255 / 0.25)";
  ghost.style.borderRadius = "40% 40% 10% 10%";
  animate(ghost, { y: [0, -r.height * 0.6, -r.height * 0.6, 0], x: [0, 10, -10, 0], scale: [1, 1.1, 1.1, 1] }, { duration: 1.6, times: [0, 0.3, 0.7, 1], ease: "easeInOut" });
  done(animate(ghost, { opacity: [0, 0.9, 0.9, 0] }, { duration: 1.6, times: [0, 0.2, 0.85, 1] }), ghost);
  const c: Point = [r.left + r.width / 2, r.top - r.height * 0.1];
  for (let i = 0; i < 2; i++) {
    const v = disc("fx-orb", c, 12);
    v.style.filter = "hue-rotate(-90deg)";
    const a0 = i * Math.PI;
    const xs = Array.from({ length: 11 }, (_, k) => Math.cos(a0 + k * 0.7) * r.width * 0.6);
    const ys = Array.from({ length: 11 }, (_, k) => Math.sin(a0 + k * 0.7) * r.width * 0.25);
    animate(v, { x: xs, y: ys }, { duration: 1.1, delay: 0.4, ease: "linear" });
    done(animate(v, { opacity: [0, 1, 1, 0] }, { duration: 1.2, delay: 0.4, times: [0, 0.1, 0.8, 1] }), v);
  }
  after(1500, () => floater([r.left + r.width / 2, r.top], "+2 str", "violet", 30, true));
}

export function humanoidResources(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 3; i++) {
    const fig = box("fx-figure", new DOMRect(r.left + r.width / 2 - 10, r.top + r.height * 0.3, 20, 40));
    animate(fig, { x: [0, (i - 1) * r.width * 0.9], y: [0, -10, 0, -10, 0] }, { duration: 1, delay: i * 0.1, ease: "linear" });
    done(animate(fig, { opacity: [0, 1, 1, 0] }, { duration: 1.4, delay: i * 0.1, times: [0, 0.1, 0.8, 1] }), fig);
  }
  after(900, () => {
    const at = center(r);
    credits(at, 4, "corp");
    flyCards(at, spot("corp-hand", [innerWidth * 0.7, 60]), 3, "blue", 0.1);
    burst(at, "blue", 16, 50, { size: 5, shards: true, gravity: 50 });
    buzz([20, 20, 60]);
  });
}

export function ipEnforcement(card: DOMRect) {
  if (reduced()) return;
  const runner = spot("runner-panel", RUNNER);
  for (let i = 0; i < 3; i++) {
    const tagRing = disc("fx-speaker", [runner[0] + (i - 1) * 40, runner[1]], 44);
    done(animate(tagRing, { scale: [1.2, 0], opacity: [1, 0] }, { duration: 0.5, delay: i * 0.12, ease: "easeIn" }), tagRing);
  }
  after(500, () => {
    const scored = spot("runner-points", runner);
    const server = pointOf(document.querySelector(".server")) ?? [innerWidth / 2, innerHeight * 0.25];
    const agenda = chip("fx-mini-card violet", scored, 22, 30);
    travel(agenda, scored, server, 0.7, { arc: 80, spin: -360 }).finished.then(() => {
      agenda.remove();
      ring(server, "blue", 120);
      burst(server, "blue", 14, 50, { size: 4, gravity: 0 });
      shake(0.4);
      buzz([60, 30, 60]);
    }, () => agenda.remove());
  });
}

function drain(from: Point, to: Point, n: number, delay = 0) {
  after(delay * 1000, () => coins(from, to, n, "gold"));
}

function pips(anchorName: string, n: number, color: string, delay = 0) {
  const all = [...document.querySelectorAll<HTMLElement>(`[data-anchor="${anchorName}"] i`)];
  all.slice(-n).forEach((p, i) => animate(p, { scale: [1, 1.9, 1], backgroundColor: ["#1e2227", color, color, "#1e2227"] } as any, { duration: 0.9, delay: delay + i * 0.15 }));
}

function burn(at: Point, delay = 0) {
  const c = box("fx-mini-card blue", new DOMRect(at[0] - 11, at[1] - 15, 22, 30));
  done(animate(c, { y: [0, 30], opacity: [1, 1, 0], filter: ["brightness(1)", "brightness(3) sepia(1) hue-rotate(-30deg)", "brightness(0)"] } as any, { duration: 0.7, delay }), c);
  after(delay * 1000 + 400, () => burst([at[0], at[1] + 30], "orange", 10, 30, { size: 4, gravity: -50 }));
}

export function idiosyncresis(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const corp = spot("corp-credits", [40, 40]);
  const runner = spot("runner-credits", RUNNER);
  for (let i = 0; i < 3; i++) {
    const t = chip("fx-advtoken", [r.left + r.width * (0.25 + i * 0.25), r.top + r.height * 0.2], 14, 14);
    done(animate(t, { y: [0, -30], scale: [1, 1.4, 0], opacity: [1, 1, 0] }, { duration: 0.5, delay: 0.2 + i * 0.3 }), t);
    drain(at, corp, 3, 0.5 + i * 0.3);
    drain(runner, corp, 2, 0.6 + i * 0.3);
    after(500 + i * 300, () => buzz(20));
  }
  after(1400, () => {
    burst(at, "green", 18, 60, { size: 5, shards: true, gravity: 50 });
    ring(at, "green", r.width * 1.4);
  });
}

export function knowledgeSeeker(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 3; i++) {
    const v = disc("fx-orb", [r.left - 20, r.top + r.height * (0.3 + i * 0.2)], 12);
    v.style.filter = "hue-rotate(-90deg)";
    animate(v, { x: [0, r.width * (0.3 + i * 0.2) + 20] }, { duration: 0.4, delay: i * 0.25, ease: "easeOut" });
    done(animate(v, { opacity: [0, 1, 1, 0] }, { duration: 1.3, delay: i * 0.25, times: [0, 0.2, 0.75, 1] }), v);
    after(400 + i * 250, () => buzz(15));
  }
  after(1100, () => {
    flash("violet", 0.25, 0.4);
    ring(at, "violet", r.width * 2);
    const el = [...document.querySelectorAll<HTMLElement>(".tile[data-cid]")].find((t) => {
      const rr = t.getBoundingClientRect();
      return Math.abs(rr.left - r.left) < 2 && Math.abs(rr.top - r.top) < 2;
    });
    if (el) animate(el, { filter: ["brightness(1)", "brightness(0.4)", "brightness(1)"] } as any, { duration: 0.8 });
  });
}

export function kompromat(card: DOMRect) {
  if (reduced()) return;
  const server = pointOf(document.querySelector(".server")) ?? [innerWidth / 2, innerHeight * 0.25];
  after(200, () => {
    const f = disc("fx-camflash", server, 120);
    done(animate(f, { scale: [0.3, 1.5], opacity: [1, 0] }, { duration: 0.35 }), f);
    buzz(30);
  });
  const photo = chip("fx-polaroid", server, 40, 48);
  const corp = spot("corp-panel", [innerWidth / 2, 40]);
  animate(photo, { y: [0, 20], rotate: [0, -8], scale: [0.4, 1] }, { duration: 0.35, delay: 0.3, ease: "easeOut" });
  after(800, () => {
    travel(photo, [server[0], server[1] + 20], corp, 0.5, { arc: 40, spin: 180 }).finished.then(() => {
      photo.remove();
      vignette("violet", 0.4);
      ring(corp, "violet", 140);
      buzz([40, 40]);
    }, () => photo.remove());
  });
  done(animate(photo, { opacity: [0, 1, 1, 1] }, { duration: 1.3, delay: 0.3 }), photo);
}

export function lamplighter(r: DOMRect) {
  if (reduced()) return;
  const lampAt: Point = [r.left + r.width * 0.58, r.top + r.height * 0.38];
  const flame = disc("fx-sun", lampAt, r.width * 0.5);
  done(animate(flame, { opacity: [0, 1, 0.7, 1, 0], scale: [0.3, 1, 0.9, 1, 1] }, { duration: 1.8 }), flame);
  const runner = spot("runner-panel", RUNNER);
  const len = Math.hypot(runner[0] - lampAt[0], runner[1] - lampAt[1]) + 60;
  const cone = box("fx-lightcone", new DOMRect(lampAt[0] - 60, lampAt[1], 120, len));
  cone.style.transformOrigin = "50% 0";
  const angle = (Math.atan2(runner[1] - lampAt[1], runner[0] - lampAt[0]) * 180) / Math.PI - 90;
  animate(cone, { rotate: [angle - 50, angle + 10, angle] }, { duration: 1.1, delay: 0.3, ease: "easeInOut" });
  done(animate(cone, { opacity: [0, 0.9, 0.9, 0] }, { duration: 1.5, delay: 0.3, times: [0, 0.2, 0.8, 1] }), cone);
  after(1150, () => {
    ring(runner, "red", 110);
    buzz([30, 30, 30]);
  });
}

export function lieLow(card: DOMRect) {
  if (reduced()) return;
  const dim = node("fx-sig fx-shutdown");
  done(animate(dim, { opacity: [0, 0.6, 0.6, 0] }, { duration: 1.6, times: [0, 0.2, 0.8, 1] }), dim);
  const runner = spot("runner-panel", RUNNER);
  for (let i = 0; i < 2; i++) {
    const t = disc("fx-speaker", [runner[0] + (i - 0.5) * 50, runner[1]], 44);
    done(animate(t, { scale: [1, 0.2], opacity: [1, 0] }, { duration: 0.6, delay: 0.3 + i * 0.15, ease: "easeIn" }), t);
  }
  after(800, () => flyCards(spot("runner-deck", runner), spot("runner-hand", runner), 4, "", 0, 0.1));
}

export function longevitySerum(card: DOMRect) {
  if (reduced()) return;
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  const rd = spot("corp-deck", [innerWidth / 2, 60]);
  burn(hq, 0.1);
  burn([hq[0] + 26, hq[1]], 0.2);
  const archives: Point = [rd[0] - 60, rd[1] + 40];
  after(700, () => {
    for (let i = 0; i < 3; i++) {
      const c = box("fx-mini-card serum", new DOMRect(archives[0] - 11, archives[1] - 15, 22, 30));
      travel(c, archives, rd, 0.6, { delay: i * 0.12, arc: 40, spin: 360 });
      done(animate(c, { opacity: [0, 1, 1, 0] }, { duration: 0.7, delay: i * 0.12, times: [0, 0.1, 0.85, 1] }), c);
    }
  });
  after(1400, () => {
    ring(rd, "green", 90);
    buzz([20, 40]);
  });
}

export function lotusHaze(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 4; i++) {
    const band = box("fx-haze", new DOMRect(card.left - card.width * 0.5, card.top + card.height * (0.15 + i * 0.2), card.width * 2, card.height * 0.18));
    done(animate(band, { x: [i % 2 ? 40 : -40, i % 2 ? -40 : 40], opacity: [0, 0.8, 0] }, { duration: 1.8, delay: i * 0.1 }), band);
  }
  for (let i = 0; i < 3; i++) {
    const t = chip("fx-advtoken violet", [card.left + card.width * (0.3 + i * 0.2), card.top - 20], 16, 16);
    done(animate(t, { y: [-40, card.height * 0.5], opacity: [0, 1, 1, 0] }, { duration: 1.2, delay: 0.4 + i * 0.15, times: [0, 0.3, 0.8, 1], ease: "easeIn" }), t);
    after(700 + i * 150, () => buzz(12));
  }
}

export function luanaCampos(r: DOMRect) {
  if (reduced()) return;
  const cone = box("fx-spotlight", new DOMRect(r.left - r.width * 0.3, 0, r.width * 1.6, r.bottom));
  done(animate(cone, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.15, 0.8, 1] }), cone);
  const corp = spot("corp-panel", [innerWidth / 2, 40]);
  const orb = disc("fx-orb", corp, 18);
  orb.style.filter = "hue-rotate(120deg)";
  travel(orb, corp, center(r), 0.6, { delay: 0.3, arc: 40 }).finished.then(() => {
    orb.remove();
    ring(center(r), "violet", 70);
    credits(center(r), 3, "corp");
    flyCards(center(r), spot("corp-hand", [innerWidth * 0.7, 60]), 1, "blue");
    buzz([20, 40]);
  }, () => orb.remove());
}

export function luminal(card: DOMRect) {
  if (reduced()) return;
  const pillar = box("fx-pillar", inset(card, 0.3, -0.6, 0.4, 1.6));
  done(animate(pillar, { opacity: [0, 1, 1, 0], scaleX: [0.2, 1, 1, 0.2] }, { duration: 1.7, times: [0, 0.2, 0.8, 1] }), pillar);
  const clicks = spot("corp-clicks", [innerWidth - 40, 40]);
  for (let i = 0; i < 3; i++) {
    const orb = disc("fx-orb", center(card), 14);
    orb.style.filter = "hue-rotate(160deg) saturate(3)";
    travel(orb, center(card), [clicks[0] + (i - 1) * 12, clicks[1]], 0.6, { delay: 0.4 + i * 0.15, arc: 60 }).finished.then(() => orb.remove(), () => orb.remove());
  }
  pips("corp-clicks", 3, "#f6e03a", 0.9);
}

export function madani(r: DOMRect) {
  if (reduced()) return;
  const lid = box("fx-lid", inset(r, -0.05, 0.3, 1.1, 0.15));
  animate(lid, { rotate: [0, -40, -40, 0], y: [0, -14, -14, 0] }, { duration: 1.4, times: [0, 0.2, 0.7, 1], ease: "easeOut" });
  done(animate(lid, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.85, 1] }), lid);
  const hand = spot("runner-hand", RUNNER);
  const slot: Point = [r.left + r.width / 2, r.top + r.height * 0.4];
  for (let i = 0; i < 2; i++) {
    const c = box("fx-mini-card", new DOMRect(hand[0] - 10, hand[1] - 14, 20, 28));
    travel(c, hand, slot, 0.5, { delay: 0.2 + i * 0.15, arc: 50 });
    done(animate(c, { opacity: [0, 1, 1, 0], scale: [1, 1, 0.5] }, { duration: 0.6, delay: 0.2 + i * 0.15, times: [0, 0.1, 0.9, 1] }), c);
  }
  after(1100, () => {
    const out = box("fx-mini-card vr", new DOMRect(slot[0] - 10, slot[1] - 14, 20, 28));
    done(animate(out, { y: [0, -50], scale: [0.6, 1.2], opacity: [0, 1, 0] }, { duration: 0.6 }), out);
    ring(slot, "cyan", 60);
    buzz([10, 30]);
  });
}

export function magistrate(r: DOMRect) {
  if (reduced()) return;
  const at: Point = [r.left + r.width / 2, r.top + r.height * 0.4];
  const gavel = chip("fx-gavel", [at[0] + 20, at[1] - 50], 10, 54);
  node("fx-gavel-head", gavel);
  animate(gavel, { rotate: [-60, 20, -30, 20] }, { duration: 0.7, times: [0, 0.35, 0.6, 1], ease: "easeIn" });
  done(animate(gavel, { opacity: [0, 1, 1, 0] }, { duration: 1.2, times: [0, 0.1, 0.8, 1] }), gavel);
  after(250, () => (ring(at, "gold", 50), buzz(40)));
  after(700, () => {
    ring(at, "gold", 70);
    buzz(40);
    coins(spot("runner-credits", RUNNER), spot("corp-credits", [40, 40]), 3, "gold");
  });
}

export function maglectric(r: DOMRect) {
  if (reduced()) return;
  const target = iceTiles()[0];
  const to = pointOf(target) ?? [innerWidth / 2, innerHeight * 0.25];
  const from = center(r);
  const pts: Point[] = [from];
  for (let i = 1; i < 6; i++) pts.push([from[0] + ((to[0] - from[0]) * i) / 6 + (Math.random() - 0.5) * 40, from[1] + ((to[1] - from[1]) * i) / 6]);
  pts.push(to);
  const zap = pathLine("zap", pts, 0.2);
  done(animate(zap, { opacity: [1, 0.3, 1, 0] }, { duration: 0.6, delay: 0.2 }), zap);
  after(300, () => {
    flash("cyan", 0.2, 0.25);
    if (target) animate(target, { rotateY: [0, 180, 0], filter: ["brightness(1)", "brightness(0.3)", "brightness(0.6)", "brightness(1)"] } as any, { duration: 1 });
    burst(to, "cyan", 14, 50, { size: 4, gravity: 0 });
    burst(from, "orange", 12, 40, { size: 5, shards: true, gravity: 60 });
    buzz([20, 60]);
  });
}

export function mahkotaLangit(r: DOMRect) {
  if (reduced()) return;
  const crown = box("fx-crown", inset(r, 0.15, 0.1, 0.7, 0.3));
  animate(crown, { y: [-40, 0], rotate: [-10, 0] }, { duration: 0.45, ease: "easeOut" });
  done(animate(crown, { opacity: [0, 1, 1, 0] }, { duration: 1.7, times: [0, 0.15, 0.8, 1] }), crown);
  for (let i = 0; i < 2; i++) {
    const coin = disc("fx-coin-big", [r.left + r.width * (0.3 + i * 0.4), r.top - 40], 16);
    done(animate(coin, { y: [0, r.height * 0.7], rotateY: [0, 720], opacity: [0, 1, 1, 0] } as any, { duration: 0.8, delay: 0.5 + i * 0.15, ease: "easeIn" }), coin);
    after(1200 + i * 150, () => (ring([r.left + r.width * (0.3 + i * 0.4), r.top + r.height * 0.6], "gold", 40), buzz(15)));
  }
}

export function maintenanceAccess(card: DOMRect) {
  if (reduced()) return;
  const runner = spot("runner-panel", RUNNER);
  const rd = spot("corp-deck", [innerWidth / 2, 60]);
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  const archives: Point = [rd[0] - 60, rd[1] + 40];
  const door = box("fx-hazard", new DOMRect(archives[0] - 24, archives[1] - 6, 48, 12));
  done(animate(door, { opacity: [0, 1, 1, 0], scaleX: [1, 1, 0.1, 0.1] }, { duration: 1.4, times: [0, 0.3, 0.45, 1] }), door);
  const pts: Point[] = [runner, [archives[0], archives[1] + 30], archives, [(archives[0] + hq[0]) / 2, archives[1] - 20], hq];
  const line = pathLine("geo", pts, 1.1);
  spark(pts, 1.2, "#f6e03a");
  done(animate(line, { opacity: [1, 1, 0] }, { duration: 1.8, times: [0, 0.8, 1] }), line);
  after(1200, () => (ring(hq, "gold", 90), buzz([20, 40])));
}

export function malapert(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const vault = disc("fx-vault blue", at, r.width * 1.1);
  animate(vault, { rotate: [0, -200] }, { duration: 0.8, ease: "easeInOut" });
  animate(vault, { scaleX: [1, 1, 0.1] }, { duration: 1.2, times: [0, 0.7, 1] });
  done(animate(vault, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.1, 0.85, 1] }), vault);
  after(1000, () => {
    const rd = spot("corp-deck", [innerWidth / 2, 60]);
    const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
    ring(rd, "blue", 60);
    flyCards(rd, hq, 1, "blue");
    buzz([20, 20]);
  });
}

export function measuredResponse(card: DOMRect) {
  if (reduced()) return;
  const beam = box("fx-balance", inset(card, 0.05, 0.3, 0.9, 0.04));
  const left = box("fx-pan", inset(card, 0.02, 0.36, 0.3, 0.12));
  const right = box("fx-pan meat", inset(card, 0.68, 0.36, 0.3, 0.12));
  for (const el of [beam, left, right]) {
    animate(el, { rotate: [0, -8, 6, -4, 14] }, { duration: 1.2, ease: "easeInOut" });
    done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.1, 0.85, 1] }), el);
  }
  after(1200, () => {
    const runner = spot("runner-panel", RUNNER);
    spark([center(card), runner], 0.3, "#ff3b30");
    after(300, () => {
      ring(runner, "red", 140);
      burst(runner, "red", 18, 70, { size: 5, shards: true, gravity: 40 });
      shake(0.7);
      buzz([80, 30, 80]);
    });
  });
}

export function meliesLuxury(card: DOMRect) {
  if (reduced()) return;
  const track = box("fx-track", new DOMRect(0, card.top + card.height * 0.55, innerWidth, 6));
  done(animate(track, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.1, 0.8, 1] }), track);
  const train = box("fx-train", new DOMRect(-card.width * 1.4, card.top + card.height * 0.42, card.width * 1.4, card.height * 0.13));
  animate(train, { x: [0, innerWidth + card.width * 2.8] }, { duration: 1.1, delay: 0.2, ease: [0.3, 0, 0.7, 1] });
  after(1350, () => train.remove());
  after(900, () => {
    pips("corp-clicks", 1, "#f6e03a");
    buzz([20, 40]);
  });
}

export function methuselah(r: DOMRect) {
  if (reduced()) return;
  const hand = spot("runner-hand", RUNNER);
  const c = box("fx-mini-card", new DOMRect(hand[0] - 10, hand[1] - 14, 20, 28));
  const at = center(r);
  travel(c, hand, at, 0.5, { arc: 40 }).finished.then(() => {
    c.remove();
    burst(at, "orange", 14, 40, { size: 4, shards: true, gravity: 40 });
    for (let i = 0; i < 2; i++) {
      const coin = disc("fx-coin-big", [at[0] + (i - 0.5) * 20, at[1] - 30], 16);
      done(animate(coin, { y: [0, 30], rotateY: [0, 540], opacity: [0, 1, 1, 0] } as any, { duration: 0.7, delay: 0.1 + i * 0.1 }), coin);
    }
    buzz([20, 30]);
  }, () => c.remove());
}

export function mitraAman(r: DOMRect) {
  if (reduced()) return;
  for (const side of [-1, 1]) {
    const guard = box("fx-guard", new DOMRect(side < 0 ? r.left - 16 : r.right + 4, r.top + r.height * 0.1, 12, r.height * 0.8));
    animate(guard, { x: [side * 40, 0] }, { duration: 0.35, ease: "easeOut" });
    done(animate(guard, { opacity: [0, 1, 1, 0] }, { duration: 1.5, times: [0, 0.1, 0.8, 1] }), guard);
  }
  const ices = iceTiles();
  if (ices.length) {
    const a = ices[0].getBoundingClientRect();
    const archives: Point = [a.left + a.width / 2, a.top - 60];
    const out = box("fx-mini-card blue", new DOMRect(a.left + a.width / 2 - 11, a.top + a.height / 2 - 15, 22, 30));
    const inn = box("fx-mini-card blue", new DOMRect(archives[0] - 11, archives[1] - 15, 22, 30));
    animate(out, { y: [0, -60], x: [0, 20] }, { duration: 0.5, delay: 0.5, ease: "easeInOut" });
    animate(inn, { y: [0, 60], x: [0, -10] }, { duration: 0.5, delay: 0.5, ease: "easeInOut" });
    for (const el of [out, inn]) done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: 1.2, delay: 0.4, times: [0, 0.1, 0.85, 1] }), el);
  }
  after(1000, () => (credits(center(r), 3, "corp"), burst(center(r), "blue", 14, 40, { size: 4, shards: true, gravity: 40 })));
}

export function mutualFavor(card: DOMRect) {
  if (reduced()) return;
  const [cx, cy] = center(card);
  for (const side of [-1, 1]) {
    const orb = disc("fx-orb", [cx + side * card.width * 0.6, cy], 30);
    done(animate(orb, { x: [0, -side * card.width * 0.6], opacity: [0, 1, 0] }, { duration: 0.6, ease: "easeIn" }), orb);
  }
  after(550, () => (ring([cx, cy], "cyan", card.width * 1.2), buzz(30)));
  after(700, () => {
    const stack = spot("runner-deck", RUNNER);
    const rig = spot("runner-panel", RUNNER);
    const c = box("fx-mini-card vr", new DOMRect(stack[0] - 11, stack[1] - 15, 22, 30));
    animate(c, { y: [0, -60, -60], scale: [1, 1.6, 1.6], rotateY: [0, 0, 360] } as any, { duration: 0.7, ease: "easeOut" });
    after(700, () => {
      travel(c, [stack[0], stack[1] - 60], [rig[0], rig[1] - 40], 0.45).finished.then(() => {
        c.remove();
        ring([rig[0], rig[1] - 40], "cyan", 70);
        buzz([10, 30]);
      }, () => c.remove());
    });
  });
}

function tokens(r: DOMRect, n: number, cls = "", delay = 0) {
  for (let i = 0; i < n; i++) {
    const t = chip(`fx-advtoken ${cls}`, [r.left + r.width * ((i + 1) / (n + 1)), r.top - 30], 14, 14);
    done(animate(t, { y: [0, 30 + r.height * 0.2, 26 + r.height * 0.2], opacity: [0, 1, 1, 0] }, { duration: 1.2, delay: delay + i * 0.12, times: [0, 0.35, 0.8, 1], ease: "easeIn" }), t);
    after((delay + i * 0.12) * 1000 + 400, () => buzz(10));
  }
}

function hqFan(n: number, faceup = true) {
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  return Array.from({ length: n }, (_, i) => {
    const c = box(`fx-mini-card ${faceup ? "faceup" : "blue"}`, new DOMRect(hq[0] - 11, hq[1] - 15, 22, 30));
    animate(c, { x: [0, (i - (n - 1) / 2) * 28], y: [0, 50], rotate: [0, (i - (n - 1) / 2) * 8], rotateY: [180, 0] } as any, { duration: 0.4, delay: i * 0.05, ease: "easeOut" });
    return c;
  });
}

export function mycoweb(r: DOMRect) {
  if (reduced()) return;
  const el = svgBox("fx-stroke myco", inset(r, -0.6, -0.3, 2.2, 1.6), '<path pathLength="1" d="M50 50 L20 20 L5 10 M50 50 L80 25 L95 5 M50 50 L15 70 M50 50 L85 75 L98 90 M30 30 L22 45 M70 30 L80 42 M20 20 L12 30"/>');
  draw(el, 0.8);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.8, times: [0, 0.8, 1] }), el);
  rain(inset(r, -0.3, 0, 1.6, 1), 14, "#a7f3c4", true, 0.6);
  after(800, () => {
    const from: Point = [r.left - r.width * 0.5, r.top - r.height * 0.2];
    const ice = box("fx-mini-card blue", new DOMRect(from[0] - 11, from[1] - 15, 22, 30));
    travel(ice, from, [r.left - 14, r.top + r.height / 2], 0.5, { spin: 90 }).finished.then(() => {
      ring([r.left - 14, r.top + r.height / 2], "green", 60);
      buzz([10, 30]);
    });
    done(animate(ice, { opacity: [0, 1, 1, 0] }, { duration: 1, times: [0, 0.1, 0.8, 1] }), ice);
  });
}

export function myoshu(card: DOMRect) {
  if (reduced()) return;
  strokes(inset(card, 0.1, 0.15, 0.8, 0.6), "torii", "M5 20 Q50 8 95 20 M15 34 H85 M28 20 V95 M72 20 V95", 0.6);
  for (let i = 0; i < 10; i++) {
    const p = box("fx-petal-fall", new DOMRect(card.left + Math.random() * card.width, card.top, 8, 6));
    done(animate(p, { y: [0, card.height], x: [0, 20, -10], rotate: [0, 200], opacity: [0, 1, 0] }, { duration: 1.5, delay: 0.3 + i * 0.06 }), p);
  }
  after(900, () => {
    const pts = spot("corp-points", [innerWidth - 60, 40]);
    const c = box("fx-mini-card violet", new DOMRect(card.left + card.width / 2 - 11, card.top + card.height / 2 - 15, 22, 30));
    travel(c, center(card), pts, 0.6, { arc: 60, spin: 360 }).finished.then(() => {
      c.remove();
      pips("corp-points", 2, "#f6e03a");
      burst(pts, "gold", 14, 40, { size: 4, gravity: 0 });
      buzz([20, 40, 80]);
    }, () => c.remove());
  });
}

export function nPot(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 10; i++) {
    const puff = disc("fx-steam", [r.left + r.width * (0.3 + Math.random() * 0.4), r.top], 16 + Math.random() * 14);
    done(animate(puff, { y: [0, -60], scale: [0.5, 1.5], opacity: [0, 0.7, 0] }, { duration: 1, delay: i * 0.08 }), puff);
  }
  const lid = box("fx-lid", inset(r, 0.05, -0.05, 0.9, 0.12));
  animate(lid, { y: [0, -8, 0, -10, 0, -14, 0], rotate: [0, -6, 4, -8, 6, -10, 0] }, { duration: 1, ease: "linear" });
  done(animate(lid, { opacity: [0, 1, 1, 0] }, { duration: 1.4, times: [0, 0.1, 0.8, 1] }), lid);
  after(300, () => buzz([10, 10, 10, 10, 10, 10]));
  after(1100, () => (ring(center(r), "orange", r.width * 1.6), shake(0.3), buzz(60)));
}

export function nanomanagement(card: DOMRect) {
  if (reduced()) return;
  const at = center(card);
  const face = disc("fx-clockface", at, card.width * 0.7);
  const hand = box("fx-needle", new DOMRect(at[0] - 2, at[1] - card.width * 0.3, 4, card.width * 0.3));
  animate(hand, { rotate: [0, 1080] }, { duration: 1, ease: "easeInOut" });
  for (const el of [face, hand]) done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.1, 0.8, 1] }), el);
  const clicks = spot("corp-clicks", [innerWidth - 40, 40]);
  for (let i = 0; i < 2; i++) {
    const orb = disc("fx-orb", at, 14);
    orb.style.filter = "hue-rotate(160deg) saturate(3)";
    travel(orb, at, [clicks[0] + (i - 0.5) * 12, clicks[1]], 0.5, { delay: 1 + i * 0.12, arc: 50 }).finished.then(() => orb.remove(), () => orb.remove());
  }
  pips("corp-clicks", 2, "#7fb0ff", 1.5);
}

export function nextBigThing(card: DOMRect) {
  if (reduced()) return;
  for (const side of [-1, 1]) {
    const cone = box("fx-lightcone", new DOMRect(card.left + card.width / 2 + side * innerWidth * 0.4 - 60, innerHeight, 120, innerHeight * 0.9));
    cone.style.transformOrigin = "50% 0";
    animate(cone, { rotate: [180 + side * 30, 180 - side * 20, 180 + side * 10] }, { duration: 1.4, ease: "easeInOut" });
    done(animate(cone, { opacity: [0, 0.8, 0.8, 0] }, { duration: 1.5, times: [0, 0.15, 0.8, 1] }), cone);
  }
  for (let i = 0; i < 16; i++) after(200 + i * 60, () => burst([card.left + Math.random() * card.width, card.top + Math.random() * card.height], "gold", 3, 20, { size: 3, gravity: 30 }));
  tokens(card, 1, "violet", 1);
}

export function nicoCampaign(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 9; i++) {
    const coin = box("fx-coin-flat", new DOMRect(r.left + r.width * 0.3, r.bottom - 10 - i * 7, r.width * 0.4, 8));
    done(animate(coin, { y: [-40, 0], opacity: [0, 1, 1, 0] }, { duration: 1.6, delay: i * 0.05, times: [0, 0.15, 0.8, 1], ease: "easeIn" }), coin);
  }
  after(900, () => credits(center(r), 3, "corp"));
}

export function nihilo(r: DOMRect) {
  if (reduced()) return;
  tokens(r, 3, "violet");
  after(900, () => {
    const runner = spot("runner-panel", RUNNER);
    spark([center(r), runner], 0.4, "#ff3b30");
    after(400, () => (ring(runner, "red", 90), buzz([30, 30])));
  });
}

export function nurseHanh(r: DOMRect) {
  if (reduced()) return;
  const rd = spot("corp-deck", [innerWidth / 2, 60]);
  const archives: Point = [rd[0] - 60, rd[1] + 40];
  for (let i = 0; i < 2; i++) {
    const c = box("fx-mini-card blue", new DOMRect(archives[0] - 11 + i * 26, archives[1] - 15, 22, 30));
    animate(c, { rotateY: [0, 180], transformPerspective: 300 } as any, { duration: 0.4, delay: 0.1 + i * 0.12 });
    after(300 + i * 120, () => c.classList.replace("blue", "faceup"));
    done(animate(c, { opacity: [0, 1, 1, 0] }, { duration: 1.2, times: [0, 0.1, 0.8, 1] }), c);
  }
  after(700, () => {
    ring(center(r), "green", r.width * 1.3);
    ring(center(r), "green", r.width * 0.8, 0.15);
    flyCards(center(r), spot("runner-hand", RUNNER), 2);
    buzz([20, 30]);
  });
}

export function openMarket(r: DOMRect) {
  if (reduced()) return;
  const awning = box("fx-awning", inset(r, -0.1, 0.05, 1.2, 0.25));
  animate(awning, { scaleY: [0, 1] }, { duration: 0.3, ease: "easeOut" });
  done(animate(awning, { opacity: [1, 1, 0] }, { duration: 1.7, times: [0, 0.8, 1] }), awning);
  for (let i = 0; i < 6; i++) {
    const coin = disc("fx-coin-big", [r.left + r.width * (0.2 + (i % 3) * 0.3), r.top - 20], 14);
    done(animate(coin, { y: [0, r.height * (0.4 + Math.floor(i / 3) * 0.2)], opacity: [0, 1, 1, 0] }, { duration: 0.9, delay: 0.3 + i * 0.07, times: [0, 0.2, 0.8, 1], ease: "easeIn" }), coin);
  }
  after(1200, () => credits(center(r), 1, "runner"));
}

export function ottoCampaign(r: DOMRect) {
  if (reduced()) return;
  const board = box("fx-billboard", inset(r, -0.15, 0.2, 1.3, 0.4));
  board.textContent = "OTTO";
  animate(board, { scaleY: [0, 1], y: [20, 0] }, { duration: 0.4, ease: "easeOut" });
  done(animate(board, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.8, 1] }), board);
  for (let i = 0; i < 6; i++) {
    const coin = box("fx-coin-flat", new DOMRect(r.left + r.width * 0.3, r.bottom - 10 - i * 7, r.width * 0.4, 8));
    done(animate(coin, { y: [-40, 0], opacity: [0, 1, 1, 0] }, { duration: 1.4, delay: 0.4 + i * 0.05, times: [0, 0.15, 0.8, 1], ease: "easeIn" }), coin);
  }
  after(1100, () => credits(center(r), 2, "corp"));
}

export function palisade(r: DOMRect) {
  if (reduced()) return;
  const el = box("fx-stakes", new DOMRect(r.left - 6, r.top - r.height * 0.15, r.width + 12, r.height * 1.15));
  for (let i = 0; i < 6; i++) {
    const stake = node("fx-stake", el);
    stake.style.height = `${82 + ((i * 37) % 18)}%`;
    animate(stake, { scaleY: [0, 1.08, 1] }, { duration: 0.35, delay: 0.05 * i, ease: "easeOut" });
  }
  after(320, () => {
    burst([r.left + r.width / 2, r.bottom], "orange", 16, 60, { size: 5, gravity: -20 });
    shake(0.5);
    buzz([20, 20, 20, 20, 40]);
  });
  after(800, () => {
    animate(el, { scaleY: [1, 1.25, 1.18] }, { duration: 0.4, ease: "easeOut" });
    floater([r.left + r.width / 2, r.top - 10], "+2 str", "orange", 30, true);
  });
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.8, 1] }), el);
}

export function pantograph(r: DOMRect) {
  if (reduced()) return;
  const el = svgBox("fx-stroke silver", inset(r, 0, 0.2, 1, 0.6), '<polyline pathLength="1" points="5,90 25,10 45,90 65,10 85,90 95,50"/>');
  draw(el, 0.4);
  animate(el, { scaleX: [0.3, 1.6, 1] }, { duration: 1, ease: "easeInOut" });
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.5, times: [0, 0.8, 1] }), el);
  after(500, () => credits(center(r), 1, "runner"));
  after(800, () => {
    const hand = spot("runner-hand", RUNNER);
    const c = box("fx-mini-card", new DOMRect(hand[0] - 10, hand[1] - 14, 20, 28));
    travel(c, hand, [r.right + 20, r.top + r.height / 2], 0.5, { arc: 40 }).finished.then(() => (c.remove(), ring([r.right + 20, r.top + r.height / 2], "cyan", 50)), () => c.remove());
  });
}

export function paywall(r: DOMRect) {
  if (reduced()) return;
  for (let row = 0; row < 4; row++) {
    const bricks = box("fx-bricks", new DOMRect(r.left - 6, r.bottom - (row + 1) * r.height * 0.18, r.width + 12, r.height * 0.17));
    animate(bricks, { y: [-30, 0], opacity: [0, 1] }, { duration: 0.2, delay: row * 0.12, ease: "easeIn" });
    done(animate(bricks, { opacity: [1, 1, 0] }, { duration: 1.6, delay: row * 0.12, times: [0, 0.8, 1] }), bricks);
    after(200 + row * 120, () => buzz(15));
  }
  after(700, () => {
    const from = spot("runner-credits", RUNNER);
    const coin = disc("fx-coin-big", from, 18);
    const hit: Point = [r.left + r.width / 2, r.bottom + 6];
    travel(coin, from, hit, 0.45, { arc: 50, spin: 360 }).finished.then(() => {
      animate(coin, { y: [hit[1] - from[1], hit[1] - from[1] + 40], opacity: [1, 0] }, { duration: 0.4, ease: "easeIn" }).finished.then(() => coin.remove(), () => coin.remove());
      ring(hit, "gold", 50);
      buzz(40);
    }, () => coin.remove());
  });
}

export function peerReview(card: DOMRect) {
  if (reduced()) return;
  const fan = hqFan(4);
  fan.forEach((c, i) => {
    const r = c.getBoundingClientRect();
    after(450 + i * 80, () => {
      const eye = disc("fx-eye", [r.left + r.width / 2 + (i - 1.5) * 28, r.top - 6 + 50], 10);
      done(animate(eye, { scale: [0, 1.4, 1, 0], opacity: [0, 1, 1, 0] }, { duration: 0.8 }), eye);
    });
  });
  after(900, () => credits(center(card), 7, "corp"));
  after(1200, () => {
    const server = pointOf(document.querySelector(".server")) ?? [innerWidth / 2, innerHeight * 0.25];
    const last = fan[3];
    const r = last.getBoundingClientRect();
    travel(last, [r.left, r.top], server, 0.5, { arc: 40 });
    fan.slice(0, 3).forEach((c) => animate(c, { opacity: [1, 0] }, { duration: 0.4 }));
  });
  after(1900, () => fan.forEach((c) => c.remove()));
}

export function pennyshaver(r: DOMRect) {
  if (reduced()) return;
  const slot = box("fx-slot", new DOMRect(r.left + r.width * 0.3, r.top + r.height * 0.15, r.width * 0.4, 5));
  done(animate(slot, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.1, 0.85, 1] }), slot);
  const coin = disc("fx-coin-big", [r.left + r.width / 2, r.top - 40], 18);
  animate(coin, { y: [0, 40 + r.height * 0.15], rotateY: [0, 360], scaleX: [1, 1, 0.2] } as any, { duration: 0.5, ease: "easeIn" });
  done(animate(coin, { opacity: [1, 1, 0] }, { duration: 0.55 }), coin);
  after(550, () => (ring([r.left + r.width / 2, r.top + r.height * 0.15], "gold", 40), buzz(20)));
  after(900, () => {
    const at = center(r);
    animate(document.querySelector(".fx-slot") ?? slot, { scaleX: [1, 1.4, 1] }, { duration: 0.3 });
    coins(at, spot("runner-credits", RUNNER), 4, "gold");
    buzz([10, 10, 10, 30]);
  });
}

export function perfectRecall(r: DOMRect) {
  if (reduced()) return;
  const film = box("fx-film", inset(r, -0.1, 0.25, 1.2, 0.5));
  const strip = node("fx-film-strip", film);
  for (let i = 0; i < 8; i++) node("fx-film-frame", strip);
  animate(strip, { x: [0, -r.width * 1.5] }, { duration: 1, ease: "easeOut" });
  done(animate(film, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.1, 0.8, 1] }), film);
  tokens(r, 1, "violet", 0.6);
  after(1100, () => {
    const fan = hqFan(1);
    after(900, () => fan.forEach((c) => c.remove()));
    buzz([10, 30]);
  });
}

export function pharos(r: DOMRect) {
  if (reduced()) return;
  const beam = disc("fx-beacon", [r.left + r.width / 2, r.top + r.height * 0.3], Math.max(innerWidth, innerHeight));
  animate(beam, { rotate: [0, 540] }, { duration: 1.6, ease: "linear" });
  done(animate(beam, { opacity: [0, 1, 1, 0] }, { duration: 1.7, times: [0, 0.15, 0.8, 1] }), beam);
  tokens(r, 3, "", 0.3);
  after(1000, () => {
    const el = [...document.querySelectorAll<HTMLElement>(".tile[data-cid]")].find((t) => Math.abs(t.getBoundingClientRect().left - r.left) < 2 && Math.abs(t.getBoundingClientRect().top - r.top) < 2);
    if (el) animate(el, { scale: [1, 1.35, 1.15, 1] }, { duration: 0.7 });
    floater([r.left + r.width / 2, r.top - 10], "+5 str", "gold", 30, true);
    buzz([30, 30, 80]);
  });
}

export function phatGioan(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 3; i++) {
    const smoke = svgBox("fx-stroke smoke", new DOMRect(r.left + r.width * (0.2 + i * 0.25), r.top - r.height * 0.4, r.width * 0.2, r.height), '<path pathLength="1" d="M50 100 C10 80, 90 60, 50 40 S10 10, 50 0"/>');
    draw(smoke, 1);
    done(animate(smoke, { opacity: [0, 0.8, 0], y: [0, -20] }, { duration: 1.6, delay: i * 0.12 }), smoke);
  }
  after(900, () => {
    const runner = spot("runner-panel", RUNNER);
    spark([center(r), runner], 0.4, "#c792ff");
    after(400, () => (ring(runner, "violet", 100), buzz([30, 30])));
  });
}

export function plutus(r: DOMRect) {
  if (reduced()) return;
  const pts = spot("corp-points", [innerWidth - 60, 40]);
  const agenda = box("fx-mini-card violet", new DOMRect(pts[0] - 11, pts[1] - 15, 22, 30));
  const at = center(r);
  travel(agenda, pts, at, 0.6, { arc: 50, spin: 360 }).finished.then(() => {
    agenda.remove();
    burst(at, "violet", 18, 50, { size: 5, shards: true, gravity: 40 });
    const coin = disc("fx-coin-big", at, r.width * 0.9);
    animate(coin, { rotateY: [0, 720], scale: [0.2, 1.1, 1], transformPerspective: 400 } as any, { duration: 0.9 });
    done(animate(coin, { opacity: [0, 1, 1, 0] }, { duration: 1.2, times: [0, 0.1, 0.8, 1] }), coin);
    rays(at, "gold", r.width * 2.4, 1);
    buzz([40, 60]);
  }, () => agenda.remove());
}

export function predictivePlanogram(card: DOMRect) {
  if (reduced()) return;
  const shelf = box("fx-shelf", inset(card, -0.05, 0.2, 1.1, 0.6));
  done(animate(shelf, { opacity: [0, 1, 1, 0] }, { duration: 1.7, times: [0, 0.1, 0.85, 1] }), shelf);
  for (let i = 0; i < 6; i++) {
    const item = box(i < 3 ? "fx-coin-flat" : "fx-mini-card blue", new DOMRect(card.left + card.width * (0.08 + (i % 3) * 0.32), card.top + card.height * (i < 3 ? 0.3 : 0.55), card.width * 0.22, i < 3 ? 10 : card.height * 0.18));
    animate(item, { x: [-innerWidth, 0] }, { duration: 0.3, delay: 0.2 + i * 0.08, ease: "easeOut" });
    done(animate(item, { opacity: [1, 1, 0] }, { duration: 1.5, delay: 0.2 + i * 0.08, times: [0, 0.8, 1] }), item);
  }
  after(1100, () => {
    credits(center(card), 3, "corp");
    flyCards(center(card), spot("corp-hand", [innerWidth * 0.7, 60]), 3, "blue");
    buzz([20, 20, 40]);
  });
}

function breakerPoints(): Point[] {
  return [...document.querySelectorAll<HTMLElement>(".rig-cards .tile[data-cid], .fxlab-rig .tile[data-cid]")].map((b) => pointOf(b)).filter((p): p is Point => !!p);
}

function archivesPoint(): Point {
  const rd = spot("corp-deck", [innerWidth / 2, 60]);
  return [rd[0] - 60, rd[1] + 40];
}

function heapPoint(): Point {
  const stack = spot("runner-deck", RUNNER);
  return [stack[0] - 50, stack[1]];
}

export function principia(r: DOMRect) {
  if (reduced()) return;
  strokes(inset(r, 0, 0.15, 1, 0.7), "geo", "M50 5 L95 85 L5 85 Z M50 50 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0", 0.6);
  const at = center(r);
  breakerPoints()
    .filter((p) => Math.hypot(p[0] - at[0], p[1] - at[1]) > 10)
    .slice(0, 3)
    .forEach((p, i) => {
      spark([p, at], 0.35, "#a5f3fc", 0.6 + i * 0.15);
      after(950 + i * 150, () => {
        const coin = disc("fx-coin-big", at, 14);
        travel(coin, at, spot("runner-credits", RUNNER), 0.5, { arc: 40 }).finished.then(() => coin.remove(), () => coin.remove());
        buzz(10);
      });
    });
}

export function projectIngatan(card: DOMRect) {
  if (reduced()) return;
  const gems = [0, 1, 2, 3, 4].map((i) => {
    const g = disc("fx-diamond", [card.left + card.width * (0.1 + i * 0.2), card.top + card.height * (0.4 - Math.sin((i / 4) * Math.PI) * 0.15)], 20);
    animate(g, { rotate: [45, 45], scale: [0, 1.2, 1] }, { duration: 0.3, delay: i * 0.08 });
    return g;
  });
  after(700, () => {
    const g = gems[2];
    const p = pointOf(g)!;
    animate(g, { scale: [1, 2, 0], opacity: [1, 1, 0] }, { duration: 0.4 });
    burst(p, "cyan", 14, 50, { size: 4, shards: true, gravity: 30 });
    const archives = archivesPoint();
    spark([p, archives], 0.35, "#a5f3fc");
    after(400, () => flyCards(archives, spot("corp-hand", [innerWidth * 0.7, 60]), 1, "blue"));
  });
  gems.forEach((g) => done(animate(g, { opacity: [1, 1, 0] }, { duration: 1.7, times: [0, 0.8, 1] }), g));
}

export function proprionegation(card: DOMRect) {
  if (reduced()) return;
  const runner = spot("runner-panel", RUNNER);
  const archives = archivesPoint();
  const dot = chip("fx-runner-dot", runner, 14, 14);
  animate(dot, { x: [0, (archives[0] - runner[0]) * 0.2, archives[0] - runner[0]], y: [0, (archives[1] - runner[1]) * 0.2, archives[1] + 40 - runner[1]], scale: [1, 0.6, 1] }, { duration: 0.8, delay: 0.3, ease: [0.6, 0, 0.3, 1] });
  done(animate(dot, { opacity: [0, 1, 1, 0] }, { duration: 1.6, delay: 0.2, times: [0, 0.1, 0.85, 1] }), dot);
  const tether = pathLine("trend", [archives, [runner[0], runner[1]]], 0.3);
  done(animate(tether, { opacity: [1, 1, 0] }, { duration: 1.1, times: [0, 0.7, 1] }), tether);
  after(1100, () => {
    ring([archives[0], archives[1] + 40], "red", 80);
    shake(0.4);
    buzz([30, 60]);
  });
}

export function readWriteShare(r: DOMRect) {
  if (reduced()) return;
  const hand = spot("runner-hand", RUNNER);
  const c = box("fx-mini-card", new DOMRect(hand[0] - 10, hand[1] - 14, 20, 28));
  travel(c, hand, center(r), 0.55, { arc: 50, spin: 180 }).finished.then(() => {
    c.remove();
    ring(center(r), "cyan", 60);
    buzz(20);
    flyCards(spot("runner-deck", RUNNER), hand, 1);
  }, () => c.remove());
}

export function retirementPlan(card: DOMRect) {
  if (reduced()) return;
  const sun = box("fx-sun", inset(card, 0, 0.1, 1, card.width / card.height));
  animate(sun, { y: [0, card.height * 0.4] }, { duration: 1.2, ease: "easeIn" });
  done(animate(sun, { opacity: [0, 1, 1, 0] }, { duration: 1.4, times: [0, 0.2, 0.8, 1] }), sun);
  const archives = archivesPoint();
  const server = pointOf(document.querySelector(".server")) ?? [innerWidth / 2, innerHeight * 0.25];
  const ghost = box("fx-mini-card blue", new DOMRect(archives[0] - 11, archives[1] - 15, 22, 30));
  animate(ghost, { y: [20, -20], opacity: [0, 0.6] }, { duration: 0.5, delay: 0.3 });
  after(800, () => {
    travel(ghost, [archives[0], archives[1] - 20], server, 0.5, { arc: 40 }).finished.then(() => {
      ghost.remove();
      ring(server, "blue", 100);
      buzz([20, 40]);
    }, () => ghost.remove());
  });
}

export function risingTide(r: DOMRect) {
  if (reduced()) return;
  const wave = box("fx-tide", inset(r, -0.1, 0, 1.2, 1));
  animate(wave, { clipPath: ["inset(100% 0 0 0)", "inset(0% 0 0 0)"] } as any, { duration: 0.9, ease: "easeOut" });
  done(animate(wave, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.8, 1] }), wave);
  const heap = heapPoint();
  for (let i = 0; i < 2; i++) {
    const c = box("fx-mini-card", new DOMRect(heap[0] - 10, heap[1] - 14, 20, 28));
    travel(c, heap, [r.left + r.width / 2, r.bottom - 10], 0.7, { delay: 0.2 + i * 0.2, arc: 60 });
    done(animate(c, { opacity: [0, 1, 1, 0], scale: [1, 1, 0.4] }, { duration: 0.75, delay: 0.2 + i * 0.2 }), c);
  }
  after(1100, () => floater([r.left + r.width / 2, r.top], "+2 str", "cyan", 30, true));
}

export function rotary(r: DOMRect) {
  if (reduced()) return;
  const dial = disc("fx-dial", center(r), r.width * 0.85);
  animate(dial, { rotate: [0, 60, 60, 120, 120, 180, 0] }, { duration: 1.2, times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1] });
  done(animate(dial, { opacity: [0, 1, 1, 0] }, { duration: 1.4, times: [0, 0.1, 0.85, 1] }), dial);
  for (let i = 0; i < 3; i++) after(150 + i * 360, () => buzz(15));
  after(1000, () => {
    const rd = spot("corp-deck", [innerWidth / 2, 60]);
    flyCards(rd, [rd[0], rd[1] + 60], 1, "blue");
    const runner = spot("runner-panel", RUNNER);
    ring(runner, "red", 80, 0.3);
  });
}

export function sacrificeZone(card: DOMRect) {
  if (reduced()) return;
  strokes(inset(card, 0, 0.5 - 0.5 * (card.width / card.height), 1, card.width / card.height), "scale", "M50 5 A45 45 0 1 1 49.9 5 M50 5 L77 85 L5 35 H95 L23 85 Z", 0.9);
  for (let i = 0; i < 12; i++) after(400 + i * 60, () => burst([card.left + card.width * (0.2 + Math.random() * 0.6), card.top + card.height * (0.3 + Math.random() * 0.4)], "red", 3, 20, { size: 4, gravity: -80 }));
  after(1000, () => credits(center(card), 3, "corp"));
}

export function sangKancil(r: DOMRect) {
  if (reduced()) return;
  const ices = iceTiles().slice(0, 3).map((t) => t.getBoundingClientRect());
  const start = spot("runner-panel", RUNNER);
  const pts: Point[] = [start, ...ices.map((t) => [t.left + t.width / 2, t.top - 10] as Point)];
  const dot = chip("fx-runner-dot", start, 12, 12);
  dot.style.filter = "hue-rotate(-80deg)";
  const xs = [0];
  const ys = [0];
  for (let i = 1; i < pts.length; i++) {
    xs.push((pts[i - 1][0] + pts[i][0]) / 2 - start[0], pts[i][0] - start[0]);
    ys.push(Math.min(pts[i - 1][1], pts[i][1]) - 50 - start[1], pts[i][1] - start[1]);
  }
  animate(dot, { x: xs, y: ys }, { duration: 1.4, ease: "linear" });
  done(animate(dot, { opacity: [0, 1, 1, 0] }, { duration: 1.5, times: [0, 0.05, 0.9, 1] }), dot);
  pts.slice(1).forEach((p, i) => after(((i + 1) * 1400) / pts.length, () => (burst(p, "green", 6, 20, { size: 3, gravity: 30 }), buzz(10))));
}

export function scapegoat(card: DOMRect) {
  if (reduced()) return;
  const rig = breakerPoints();
  const from = rig[rig.length - 1] ?? spot("runner-panel", RUNNER);
  ring(from, "red", 70);
  const c = box("fx-mini-card vr", new DOMRect(from[0] - 11, from[1] - 15, 22, 30));
  animate(c, { y: [0, -40] }, { duration: 0.3, delay: 0.3, ease: "easeOut" });
  after(650, () => {
    travel(c, [from[0], from[1] - 40], spot("runner-deck", RUNNER), 0.5, { spin: 540 }).finished.then(() => {
      c.remove();
      ring(spot("runner-deck", RUNNER), "red", 60);
      buzz([30, 30]);
    }, () => c.remove());
  });
}

export function scrounge(card: DOMRect) {
  if (reduced()) return;
  const heap = heapPoint();
  for (let i = 0; i < 14; i++) {
    const d = node("fx-sig fx-mote");
    d.style.background = "#bfa98a";
    d.style.left = `${heap[0]}px`;
    d.style.top = `${heap[1]}px`;
    done(animate(d, { x: [0, (Math.random() - 0.5) * 60], y: [0, -30 - Math.random() * 30, 10], opacity: [1, 1, 0] }, { duration: 0.6, delay: Math.random() * 0.4 }), d);
  }
  after(150, () => buzz([10, 10, 10, 10]));
  after(600, () => {
    const c = box("fx-mini-card vr", new DOMRect(heap[0] - 11, heap[1] - 15, 22, 30));
    const rig = spot("runner-panel", RUNNER);
    animate(c, { y: [10, -30] }, { duration: 0.3, ease: "easeOut" });
    after(300, () => travel(c, [heap[0], heap[1] - 30], [rig[0], rig[1] - 40], 0.5, { arc: 30 }).finished.then(() => (c.remove(), ring([rig[0], rig[1] - 40], "cyan", 60)), () => c.remove()));
  });
}

export function sellOut(card: DOMRect) {
  if (reduced()) return;
  const rig = breakerPoints();
  const from = rig[rig.length - 1] ?? spot("runner-panel", RUNNER);
  const c = box("fx-mini-card", new DOMRect(from[0] - 11, from[1] - 15, 22, 30));
  const mid: Point = [innerWidth / 2, innerHeight * 0.45];
  travel(c, from, mid, 0.5, { arc: 40 }).finished.then(() => {
    animate(c, { scale: [1, 0], rotate: [0, 180] }, { duration: 0.25 }).finished.then(() => c.remove(), () => c.remove());
    burst(mid, "gold", 18, 50, { size: 4, gravity: 20 });
    coins(mid, spot("runner-credits", RUNNER), 4, "gold");
    buzz([20, 20, 40]);
    after(600, () => flyCards(spot("runner-deck", RUNNER), spot("runner-hand", RUNNER), 2));
  }, () => c.remove());
}

export function sericulture(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 6; i++) strokes(inset(card, 0, 0.1 + i * 0.13, 1, 0.12), "silk", "M0 50 C25 0, 75 100, 100 50", 0.4 + i * 0.08);
  const cocoon = disc("fx-cocoon", center(card), card.width * 0.5);
  cocoon.style.height = `${card.width * 0.7}px`;
  cocoon.style.top = `${center(card)[1] - card.width * 0.35}px`;
  animate(cocoon, { scale: [0, 1, 1.05, 1, 1.1] }, { duration: 1.2, delay: 0.5 });
  after(1400, () => {
    animate(cocoon, { scale: [1.1, 1.6], opacity: [1, 0] }, { duration: 0.3 }).finished.then(() => cocoon.remove(), () => cocoon.remove());
    burst(center(card), "gold", 20, 60, { size: 4, gravity: 0 });
    buzz([20, 60]);
  });
}

export function shred(card: DOMRect) {
  if (reduced()) return;
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  const mouth = box("fx-shredder", new DOMRect(hq[0] - 40, hq[1] + 40, 80, 10));
  done(animate(mouth, { opacity: [0, 1, 1, 0] }, { duration: 1.8, times: [0, 0.1, 0.85, 1] }), mouth);
  for (let k = 0; k < 2; k++) {
    const c = box("fx-mini-card faceup", new DOMRect(hq[0] - 11, hq[1] - 15, 22, 30));
    done(animate(c, { y: [0, 50], clipPath: ["inset(0 0 0 0)", "inset(0 0 0 0)", "inset(0 0 100% 0)"] } as any, { duration: 0.6, delay: 0.3 + k * 0.4, times: [0, 0.5, 1] }), c);
    for (let i = 0; i < 6; i++) {
      const strip = box("fx-strip", new DOMRect(hq[0] - 12 + i * 4, hq[1] + 50, 3, 30));
      done(animate(strip, { y: [0, 60 + Math.random() * 30], rotate: [0, (Math.random() - 0.5) * 50], opacity: [1, 0] }, { duration: 0.8, delay: 0.55 + k * 0.4 + i * 0.03, ease: "easeIn" }), strip);
    }
    after(550 + k * 400, () => buzz([5, 5, 5, 5, 5, 5]));
  }
}

export function sideHustle(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 6; i++) {
    const coin = box("fx-coin-flat", new DOMRect(r.left + r.width * 0.3, r.bottom - 10 - i * 7, r.width * 0.4, 8));
    animate(coin, { y: [-50, 0], rotateX: [0, 720] } as any, { duration: 0.35, delay: i * 0.12, ease: "easeIn" });
    done(animate(coin, { opacity: [0, 1, 1, 0] }, { duration: 1.4, delay: i * 0.12, times: [0, 0.1, 0.85, 1] }), coin);
    after(350 + i * 120, () => buzz(8));
  }
  after(1200, () => {
    burst(center(r), "gold", 14, 40, { size: 4, gravity: 0 });
    credits(center(r), 6, "runner");
  });
}

export function sleipnir(r: DOMRect) {
  if (reduced()) return;
  const from: Point = [r.left + r.width / 2, r.bottom];
  const to = spot("runner-panel", RUNNER);
  for (let i = 0; i < 8; i++) {
    const k = (i + 1) / 9;
    const p: Point = [from[0] + (to[0] - from[0]) * k + (i % 2 ? 10 : -10), from[1] + (to[1] - from[1]) * k];
    const shoe = chip("fx-horseshoe", p, 16, 14);
    done(animate(shoe, { scale: [1.8, 1], opacity: [0, 1, 1, 0] }, { duration: 0.9, delay: i * 0.08, times: [0, 0.15, 0.7, 1] }), shoe);
    after(i * 80, () => buzz(8));
  }
  after(800, () => {
    ring(to, "orange", 120);
    shake(0.3);
  });
}

export function smartware(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 3; i++) {
    const coin = disc("fx-coin-big", [r.left + r.width * (0.25 + i * 0.25), r.top - 30], 16);
    done(animate(coin, { y: [0, 30 + r.height * 0.3], opacity: [0, 1, 1, 0] }, { duration: 0.8, delay: i * 0.12, times: [0, 0.2, 0.8, 1], ease: "easeIn" }), coin);
    after(500 + i * 120, () => buzz(10));
  }
  after(1000, () => credits(center(r), 1, "runner"));
}

export function spinDoctor(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 6; i++) {
    const c = box("fx-mini-card blue", new DOMRect(at[0] - 10, at[1] - 14, 20, 28));
    const a0 = (i / 6) * Math.PI * 2;
    const xs = Array.from({ length: 9 }, (_, k) => Math.cos(a0 + k * 0.8) * r.width * 0.6);
    const ys = Array.from({ length: 9 }, (_, k) => Math.sin(a0 + k * 0.8) * r.width * 0.6);
    done(animate(c, { x: xs, y: ys, rotate: [0, 540], opacity: [0, 1, 1, 0] }, { duration: 1, ease: "linear" }), c);
  }
  after(900, () => {
    flyCards(at, spot("corp-hand", [innerWidth * 0.7, 60]), 2, "blue");
    flyCards(archivesPoint(), spot("corp-deck", [innerWidth / 2, 60]), 2, "blue", 0.3);
    buzz([10, 20, 10, 20]);
  });
}

export function stowaway(r: DOMRect) {
  if (reduced()) return;
  for (const dx of [-0.12, 0.12]) {
    const eye = disc("fx-eye", [r.left + r.width * (0.5 + dx), r.top + r.height * 0.75], 10);
    done(animate(eye, { scaleY: [0, 1, 1, 0.1, 1, 0], opacity: [0, 1, 1, 1, 1, 0] }, { duration: 1.2 }), eye);
  }
  after(900, () => {
    for (let i = 0; i < 2; i++) {
      const coin = disc("fx-coin-big", [r.left + r.width / 2, r.bottom - 6], 14);
      travel(coin, [r.left + r.width / 2, r.bottom - 6], spot("runner-credits", RUNNER), 0.6, { delay: i * 0.15, arc: 20 }).finished.then(() => coin.remove(), () => coin.remove());
    }
    buzz([10, 10]);
  });
}

export function superconductingHub(card: DOMRect) {
  if (reduced()) return;
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  const fan = hqFan(4, false);
  after(450, () => {
    const pts = fan.map((c) => pointOf(c)!).filter(Boolean);
    for (let i = 0; i < pts.length - 1; i++) {
      const arc = pathLine("zap", [pts[i], [(pts[i][0] + pts[i + 1][0]) / 2, pts[i][1] - 14], pts[i + 1]], 0.15);
      done(animate(arc, { opacity: [1, 0.2, 1, 0] }, { duration: 0.6, delay: i * 0.08 }), arc);
    }
    buzz([5, 5, 5, 5, 20]);
  });
  after(1000, () => {
    fan.forEach((c) => animate(c, { opacity: [1, 0] }, { duration: 0.3 }));
    flyCards(spot("corp-deck", [innerWidth / 2, 60]), hq, 2, "blue");
  });
  after(1500, () => fan.forEach((c) => c.remove()));
}

function runTo(target: Point, duration = 0.6, delay = 0) {
  const runner = spot("runner-panel", RUNNER);
  const dot = chip("fx-runner-dot", runner, 12, 12);
  travel(dot, runner, target, duration, { delay, arc: 30 });
  done(animate(dot, { opacity: [0, 1, 1, 0] }, { duration: duration + 0.1, delay, times: [0, 0.1, 0.85, 1] }), dot);
}

function tagRunner(n: number, delay = 0) {
  const runner = spot("runner-panel", RUNNER);
  for (let i = 0; i < n; i++) after((delay + i * 0.12) * 1000, () => (ring([runner[0] + (i - (n - 1) / 2) * 36, runner[1]], "red", 54), buzz(20)));
}

function badPub(from: Point, delay = 0) {
  const corp = spot("corp-panel", [innerWidth / 2, 40]);
  const orb = disc("fx-orb", from, 18);
  orb.style.filter = "hue-rotate(120deg)";
  travel(orb, from, corp, 0.6, { delay, arc: 50 }).finished.then(() => {
    orb.remove();
    vignette("violet", 0.35);
    ring(corp, "violet", 120);
    buzz([30, 30]);
  }, () => orb.remove());
}

export function syailendra(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 4; i++) {
    const tier = box("fx-tier", new DOMRect(r.left + r.width * (0.05 + i * 0.1), r.bottom - (i + 1) * r.height * 0.18, r.width * (0.9 - i * 0.2), r.height * 0.16));
    done(animate(tier, { scaleX: [0, 1], opacity: [0, 1, 1, 0] }, { duration: 1.6, delay: i * 0.1, times: [0, 0.2, 0.8, 1] }), tier);
  }
  tokens(r, 3, "", 0.4);
  after(1200, () => {
    const other = iceTiles().map((t) => t.getBoundingClientRect()).find((t) => Math.abs(t.left - r.left) > 5);
    if (!other) return;
    const t = chip("fx-advtoken", [r.left + r.width / 2, r.top + r.height * 0.2], 14, 14);
    travel(t, [r.left + r.width / 2, r.top + r.height * 0.2], [other.left + other.width / 2, other.top + other.height * 0.2], 0.5, { arc: 40 }).finished.then(() => (t.remove(), ring([other.left + other.width / 2, other.top + other.height * 0.2], "blue", 50)), () => t.remove());
  });
}

export function t400(r: DOMRect) {
  if (reduced()) return;
  const gem = disc("fx-diamond", center(r), r.width * 0.6);
  animate(gem, { rotate: [45, 405], scale: [0.2, 1.1, 1] }, { duration: 0.9, ease: "easeOut" });
  done(animate(gem, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.1, 0.8, 1] }), gem);
  after(800, () => {
    const hand = spot("runner-hand", RUNNER);
    const slot = chip("fx-handslot", [hand[0] + 80, hand[1]], 26, 36);
    done(animate(slot, { scale: [0.3, 1.1, 1], opacity: [0, 1, 1, 0] }, { duration: 1.2, times: [0, 0.2, 0.8, 1] }), slot);
    spark([center(r), [hand[0] + 80, hand[1]]], 0.35, "#a5f3fc");
    buzz([10, 30]);
  });
}

export function tailgate(card: DOMRect) {
  if (reduced()) return;
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  runTo(hq, 0.6, 0.1);
  runTo(hq, 0.6, 0.3);
  after(800, () => {
    for (let i = 0; i < 3; i++) after(i * 150, () => (ring([hq[0] + (i - 1) * 26, hq[1]], "cyan", 40), buzz(15)));
  });
}

export function takeADive(card: DOMRect) {
  if (reduced()) return;
  const rd = spot("corp-deck", [innerWidth / 2, 60]);
  const runner = spot("runner-panel", RUNNER);
  const dot = chip("fx-runner-dot", runner, 12, 12);
  animate(dot, { x: [0, (rd[0] - runner[0]) * 0.5, rd[0] - runner[0]], y: [0, (rd[1] - runner[1]) * 0.5 - 60, rd[1] - runner[1]], scale: [1, 1.2, 0] }, { duration: 0.8, ease: "easeIn" });
  done(animate(dot, { opacity: [0, 1, 1] }, { duration: 0.8 }), dot);
  after(800, () => {
    for (let i = 0; i < 3; i++) ring(rd, "blue", 50 + i * 30, i * 0.1);
    buzz(40);
  });
  badPub(rd, 1.1);
}

export function teleworkContract(r: DOMRect) {
  if (reduced()) return;
  const screen = box("fx-laptop", inset(r, 0, 0.2, 1, 0.5));
  for (let i = 0; i < 5; i++) {
    const bar = node("fx-tv-bar", screen);
    bar.style.left = `${10 + i * 17}%`;
    animate(bar, { scaleY: [0.2, 0.8, 0.3, 0.9, 0.4] }, { duration: 1, delay: i * 0.05, ease: "linear" });
  }
  done(animate(screen, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.1, 0.85, 1] }), screen);
  after(700, () => {
    floater([r.left + r.width / 2, r.top], "9¢", "gold", 30, true);
    credits(center(r), 3, "runner");
  });
}

export function redRoom(r: DOMRect) {
  if (reduced()) return;
  const room = box("fx-redroom", inset(r, -0.05, -0.05, 1.1, 1.1));
  done(animate(room, { opacity: [0, 0.8, 0.4, 0.8, 0] }, { duration: 1.4 }), room);
  tokens(r, 1, "red", 0.3);
  after(900, () => {
    const runner = spot("runner-panel", RUNNER);
    spark([center(r), runner], 0.3, "#ff3b30");
    after(300, () => (ring(runner, "red", 140), shake(0.5), buzz([50, 30, 50])));
  });
}

export function tungstenTailor(r: DOMRect) {
  if (reduced()) return;
  const tape = box("fx-tape", new DOMRect(r.left - 10, r.top + r.height * 0.45, r.width + 20, 14));
  animate(tape, { scaleX: [0, 1] }, { duration: 0.5, ease: "easeOut" });
  done(animate(tape, { opacity: [1, 1, 0] }, { duration: 1.3, times: [0, 0.8, 1] }), tape);
  iceTiles().forEach((t, i) =>
    after(500 + i * 120, () => {
      animate(t, { scale: [1, 0.86, 0.94, 1] }, { duration: 0.6 });
      const p = pointOf(t);
      if (p) floater([p[0], p[1] - 20], "−1", "cyan", 20, false);
      buzz(8);
    }),
  );
}

export function tocsin(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 4; i++) ring(center(r), "orange", r.width * (1 + i * 0.25), i * 0.15);
  after(0, () => buzz([40, 40, 40, 40]));
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  after(500, () => burn(hq));
  after(900, () => flyCards(spot("corp-deck", [innerWidth / 2, 60]), hq, 2, "blue"));
}

export function tomorrowsHeadline(card: DOMRect) {
  if (reduced()) return;
  const paper = tag("fx-paper", inset(card, -0.2, 0.3, 1.4, 0.4), "<b>TOMORROW</b><i></i><i></i><i></i>");
  animate(paper, { rotate: [540, -4], scale: [0.1, 1] }, { duration: 0.5, ease: "easeOut" });
  const runner = spot("runner-panel", RUNNER);
  after(800, () => {
    const r = paper.getBoundingClientRect();
    animate(paper, { x: [0, runner[0] - (r.left + r.width / 2)], y: [0, runner[1] - (r.top + r.height / 2)], scale: [1, 0.4], rotate: [-4, 20] }, { duration: 0.4, ease: "easeIn" }).finished.then(() => {
      paper.remove();
      shake(0.4);
      tagRunner(1);
    }, () => paper.remove());
  });
}

export function topDownSolutions(card: DOMRect) {
  if (reduced()) return;
  const rd = spot("corp-deck", [innerWidth / 2, 60]);
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  flyCards(rd, hq, 2, "blue");
  const server = pointOf(document.querySelector(".server")) ?? [innerWidth / 2, innerHeight * 0.25];
  after(800, () => {
    for (let i = 0; i < 2; i++) {
      const c = box("fx-mini-card blue", new DOMRect(hq[0] - 11, hq[1] - 15, 22, 30));
      travel(c, hq, [server[0] + (i - 0.5) * 40, server[1]], 0.5, { delay: i * 0.2, arc: -30 }).finished.then(() => (c.remove(), ring([server[0] + (i - 0.5) * 40, server[1]], "blue", 50), buzz(15)), () => c.remove());
    }
  });
}

export function touchUps(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 2; i++) after(i * 200, () => strokes(inset(card, 0.05, 0.3 + i * 0.2, 0.9, 0.15), "paint", "M0 50 C30 10, 70 90, 100 40", 0.35));
  after(600, () => {
    const target = [...document.querySelectorAll<HTMLElement>(".server .tile[data-cid]")].pop();
    const r = target?.getBoundingClientRect() ?? card;
    tokens(r, 2);
    after(800, () => {
      const fan = hqFan(1);
      after(800, () => fan.forEach((c) => c.remove()));
    });
  });
}

export function touchstone(r: DOMRect) {
  if (reduced()) return;
  const stone = disc("fx-touchstone", center(r), r.width * 0.6);
  animate(stone, { scale: [0.4, 1.1, 1], filter: ["brightness(1)", "brightness(1)", "brightness(2)", "brightness(1)"] } as any, { duration: 1 });
  done(animate(stone, { opacity: [0, 1, 1, 0] }, { duration: 1.5, times: [0, 0.1, 0.8, 1] }), stone);
  after(600, () => {
    const coin = disc("fx-coin-big", [r.left + r.width / 2, r.top - 40], 16);
    done(animate(coin, { y: [0, 40 + r.height * 0.3], opacity: [0, 1, 1, 0] }, { duration: 0.6, ease: "easeIn" }), coin);
    after(600, () => (ring(center(r), "gold", 50), buzz(20)));
  });
}

export function tranquilizer(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 3; i++) {
    const z = box("fx-zzz", new DOMRect(r.left + r.width * (0.4 + i * 0.12), r.top + r.height * 0.3, 30, 30));
    z.textContent = "z";
    z.style.fontSize = `${16 + i * 6}px`;
    done(animate(z, { y: [0, -r.height * 0.6], x: [0, 12], opacity: [0, 1, 0] }, { duration: 1.4, delay: i * 0.25, ease: "easeOut" }), z);
  }
  const ice = iceTiles()[0];
  const to = pointOf(ice) ?? center(r);
  const dart = disc("fx-orb", center(r), 10);
  dart.style.filter = "hue-rotate(-90deg)";
  travel(dart, center(r), to, 0.4, { delay: 0.3 }).finished.then(() => {
    dart.remove();
    ring(to, "green", 60);
    if (ice) animate(ice, { filter: ["brightness(1)", "brightness(0.5)", "brightness(0.8)", "brightness(1)"] } as any, { duration: 1.2 });
  }, () => dart.remove());
}

export function transferOfWealth(card: DOMRect) {
  if (reduced()) return;
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  runTo(hq, 0.6);
  after(650, () => {
    ring(hq, "cyan", 80);
    const corp = spot("corp-credits", [40, 40]);
    const runner = spot("runner-credits", RUNNER);
    coins(corp, runner, 6, "gold");
    tagRunner(1, 0.5);
  });
}

export function underdome(r: DOMRect) {
  if (reduced()) return;
  for (const side of [-1, 1]) {
    const cone = disc("fx-beacon", [r.left + r.width / 2 + side * r.width, r.top - 20], r.width * 3);
    animate(cone, { rotate: [side * 60, side * -20, side * 30] }, { duration: 1.2 });
    done(animate(cone, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.15, 0.8, 1] }), cone);
  }
  after(900, () => flyCards(spot("runner-deck", RUNNER), spot("runner-hand", RUNNER), 2));
}

export function unity(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  breakerPoints()
    .filter((p) => Math.hypot(p[0] - at[0], p[1] - at[1]) > 10)
    .slice(0, 3)
    .forEach((p, i) => spark([p, at], 0.4, ["#ff3b30", "#22d3ee", "#f6e03a"][i], i * 0.12));
  after(500, () => {
    ["#ff3b30", "#22d3ee", "#f6e03a"].forEach((c, i) => {
      const a = (i / 3) * Math.PI * 2;
      const o = disc("fx-unity", [at[0] + Math.cos(a) * 30, at[1] + Math.sin(a) * 30], r.width * 0.55);
      o.style.borderColor = c;
      o.style.boxShadow = `0 0 12px ${c}`;
      done(animate(o, { x: [0, -Math.cos(a) * 24], y: [0, -Math.sin(a) * 24], opacity: [0, 1, 1, 0] }, { duration: 1, times: [0, 0.3, 0.8, 1] }), o);
    });
    buzz([10, 20, 30]);
  });
  after(1300, () => floater([at[0], r.top], "+3 str", "cyan", 30, true));
}

export function verbalPlasticity(r: DOMRect) {
  if (reduced()) return;
  const stack = spot("runner-deck", RUNNER);
  const hand = spot("runner-hand", RUNNER);
  const c = box("fx-mini-card", new DOMRect(stack[0] - 11, stack[1] - 15, 22, 30));
  const mid: Point = [(stack[0] + hand[0]) / 2, Math.min(stack[1], hand[1]) - 60];
  travel(c, stack, mid, 0.4).finished.then(() => {
    c.remove();
    ring(mid, "cyan", 40);
    buzz([10, 10]);
    for (const dx of [-14, 14]) {
      const half = box("fx-mini-card", new DOMRect(mid[0] - 11, mid[1] - 15, 22, 30));
      travel(half, mid, [hand[0] + dx, hand[1]], 0.45, { spin: dx * 2 }).finished.then(() => half.remove(), () => half.remove());
    }
  }, () => c.remove());
}

export function vertigo(r: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 5; i++) {
    const sq = box("fx-tunnel", r);
    done(animate(sq, { scale: [1.6, 0.1], rotate: [0, 90], opacity: [0, 0.9, 0] }, { duration: 1, delay: i * 0.12, ease: "easeIn" }), sq);
  }
  after(900, () => {
    const pip = [...document.querySelectorAll('[data-anchor="runner-clicks"] i.on')].pop();
    if (pip) animate(pip, { rotate: [0, 360], scale: [1, 0.3, 1], opacity: [1, 0.2, 0.4] }, { duration: 0.6 });
    buzz([20, 40]);
  });
}

export function whitespace(r: DOMRect) {
  if (reduced()) return;
  const white = box("fx-whiteout", inset(r, -0.1, -0.1, 1.2, 1.2));
  done(animate(white, { opacity: [0, 1, 0] }, { duration: 0.6 }), white);
  const runner = spot("runner-credits", RUNNER);
  after(400, () => {
    const wave = box("fx-whiteout", new DOMRect(runner[0] - 40, runner[1] - 20, 80, 40));
    animate(wave, { scaleX: [0, 1.4], opacity: [0.9, 0] }, { duration: 0.6 }).finished.then(() => wave.remove(), () => wave.remove());
    for (let i = 0; i < 3; i++) {
      const coin = disc("fx-coin-big", [runner[0] + (i - 1) * 16, runner[1]], 14);
      done(animate(coin, { y: [0, -30], filter: ["brightness(1)", "brightness(5)"], opacity: [1, 0] } as any, { duration: 0.6, delay: i * 0.08 }), coin);
    }
    buzz([30, 30]);
  });
}

export function witchHunt(card: DOMRect) {
  if (reduced()) return;
  for (const x of [0.1, 0.9]) for (let k = 0; k < 10; k++) after(k * 60, () => burst([card.left + card.width * x, card.bottom - 10], k % 2 ? "orange" : "red", 3, 20, { size: 6, gravity: -150 }));
  badPub(center(card), 0.5);
  tagRunner(3, 1.1);
}

export function ezam(r: DOMRect) {
  if (reduced()) return;
  strokes(inset(r, -0.05, 0.1, 1.1, 0.8), "geo", "M5 5 H95 V95 H5 V20 H80 V80 H20 V35 H65 V65 H35 V50 H50", 0.6);
  const m = inset(r, -0.05, 0.1, 1.1, 0.8);
  const p = (x: number, y: number): Point => [m.left + (m.width * x) / 100, m.top + (m.height * y) / 100];
  spark([p(5, 5), p(95, 5), p(95, 95), p(5, 95), p(5, 20), p(80, 20), p(80, 80), p(20, 80), p(20, 35), p(65, 35), p(65, 65), p(35, 65), p(35, 50), p(50, 50)], 1.4, "#fff", 0.4);
  after(1800, () => (ring(p(50, 50), "cyan", 50), buzz(30)));
}

export function mercia(r: DOMRect) {
  if (reduced()) return;
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  const slot: Point = [r.left - 20, r.top + r.height / 2];
  const ice = box("fx-mini-card blue", new DOMRect(hq[0] - 11, hq[1] - 15, 22, 30));
  travel(ice, hq, slot, 0.6, { delay: 0.3, arc: 40, spin: 90 }).finished.then(() => {
    ring(slot, "blue", 70);
    burst(slot, "blue", 10, 30, { size: 3, gravity: 0 });
    buzz([20, 30]);
    const coin = disc("fx-coin-big", spot("corp-credits", [40, 40]), 14);
    travel(coin, spot("corp-credits", [40, 40]), slot, 0.4).finished.then(() => coin.remove(), () => coin.remove());
  });
  done(animate(ice, { opacity: [0, 1, 1, 0] }, { duration: 1.4, delay: 0.3, times: [0, 0.1, 0.85, 1] }), ice);
}

function rigCard(i = -1): HTMLElement | undefined {
  const all = [...document.querySelectorAll<HTMLElement>(".rig-cards .tile[data-cid], .fxlab-rig .tile[data-cid]")];
  return i < 0 ? all[all.length + i] : all[i];
}

function trashRig(el: HTMLElement | undefined, delay = 0) {
  const p = pointOf(el) ?? spot("runner-panel", RUNNER);
  after(delay * 1000, () => {
    if (el) animate(el, { filter: ["brightness(1)", "brightness(3) sepia(1) hue-rotate(-30deg)", "brightness(1)"], x: [0, -3, 3, 0] } as any, { duration: 0.5 });
    burst(p, "orange", 14, 40, { size: 5, shards: true, gravity: 60 });
    buzz(40);
  });
}

function trace(at: Point, delay = 0) {
  const corpBar = box("fx-tracebar corp", new DOMRect(at[0] - 50, at[1] - 30, 100, 8));
  const runBar = box("fx-tracebar runner", new DOMRect(at[0] - 50, at[1] - 18, 100, 8));
  animate(corpBar, { scaleX: [0, 0.9] }, { duration: 0.6, delay, ease: "easeOut" });
  animate(runBar, { scaleX: [0, 0.55] }, { duration: 0.6, delay, ease: "easeOut" });
  for (const b of [corpBar, runBar]) done(animate(b, { opacity: [0, 1, 1, 0] }, { duration: 1.4, delay, times: [0, 0.1, 0.8, 1] }), b);
}

export function archangel(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (const side of [-1, 1]) {
    const wing = box(`fx-wing ${side < 0 ? "left" : "right"}`, new DOMRect(side < 0 ? at[0] - r.width * 1.1 : at[0], at[1] - r.height * 0.5, r.width * 1.1, r.height * 0.8));
    animate(wing, { scaleX: [0, 1], rotate: [side * 30, 0] }, { duration: 0.5, ease: "easeOut" });
    done(animate(wing, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.15, 0.8, 1] }), wing);
  }
  after(600, () => {
    const target = rigCard();
    const p = pointOf(target) ?? spot("runner-panel", RUNNER);
    const beam = box("fx-pillar", new DOMRect(p[0] - 20, 0, 40, p[1]));
    done(animate(beam, { opacity: [0, 1, 0] }, { duration: 0.8 }), beam);
    if (target) animate(target, { y: [0, -24, 0], opacity: [1, 0.4, 1] }, { duration: 0.8 });
    after(500, () => flyCards(p, spot("runner-hand", RUNNER), 1, "vr"));
    buzz([20, 60]);
  });
}

export function architect(r: DOMRect) {
  if (reduced()) return;
  const grid = box("fx-blueprint", new DOMRect(r.left - 8, r.top - 8, r.width + 16, r.height + 16));
  animate(grid, { clipPath: ["inset(0 100% 0 0)", "inset(0 0% 0 0)"] } as any, { duration: 0.5, ease: "easeOut" });
  done(animate(grid, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.85, 1] }), grid);
  const rd = spot("corp-deck", [innerWidth / 2, 60]);
  const fan = [0, 1, 2, 3, 4].map((i) => {
    const c = box("fx-mini-card blue", new DOMRect(rd[0] - 11, rd[1] - 15, 22, 30));
    animate(c, { x: [0, (i - 2) * 28], y: [0, 50] }, { duration: 0.3, delay: 0.3 + i * 0.05 });
    return c;
  });
  after(1000, () => {
    const pick = fan[2];
    const from: Point = [rd[0], rd[1] + 50];
    travel(pick, [rd[0], rd[1]], [r.left - 20, r.top + r.height / 2], 0.5, { arc: 30 }).finished.then(() => (ring([r.left - 20, r.top + r.height / 2], "blue", 60), buzz([20, 30])), () => {});
    void from;
    fan.filter((c) => c !== pick).forEach((c) => animate(c, { x: 0, y: 0, opacity: [1, 0] }, { duration: 0.35 }));
  });
  after(1800, () => fan.forEach((c) => c.remove()));
}

export function astrolabe(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (let i = 0; i < 3; i++) {
    const size = r.width * (0.8 + i * 0.35);
    const orbit = disc("fx-orbit", at, size);
    orbit.style.height = `${size * 0.4}px`;
    orbit.style.top = `${at[1] - size * 0.2}px`;
    animate(orbit, { rotate: [i * 60, i * 60 + 180] }, { duration: 1.3, ease: "easeInOut" });
    done(animate(orbit, { opacity: [0, 1, 1, 0] }, { duration: 1.4, delay: i * 0.08, times: [0, 0.15, 0.8, 1] }), orbit);
  }
  after(800, () => {
    const server = pointOf([...document.querySelectorAll(".server")].pop() ?? null) ?? [innerWidth * 0.7, innerHeight * 0.25];
    ring(server, "gold", 90);
    spark([server, at], 0.35, "#f6e03a");
    after(400, () => flyCards(at, spot("runner-hand", RUNNER), 1));
  });
}

export function cloneChip(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (const dx of [-1, 1]) {
    const ghost = box("fx-phantom", r);
    done(animate(ghost, { x: [0, dx * r.width * 0.6], opacity: [0.9, 0] }, { duration: 0.5, ease: "easeOut" }), ghost);
  }
  after(400, () => {
    burst(at, "cyan", 18, 50, { size: 4, shards: true, gravity: 50 });
    buzz(40);
    const heap = heapPoint();
    const c = box("fx-mini-card vr", new DOMRect(heap[0] - 11, heap[1] - 15, 22, 30));
    travel(c, heap, at, 0.6, { arc: 60, spin: 360 }).finished.then(() => (c.remove(), ring(at, "cyan", 70), buzz([10, 30])), () => c.remove());
  });
}

export function cobra(r: DOMRect) {
  if (reduced()) return;
  const el = svgBox("fx-stroke venom", new DOMRect(r.left - r.width * 0.3, r.top - r.height * 0.1, r.width * 1.6, r.height * 1.2), '<path pathLength="1" d="M10 95 C 40 80, 10 60, 40 50 S 70 30, 45 15 L 60 5"/>');
  draw(el, 0.35);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 0.9, times: [0, 0.7, 1] }), el);
  const target = rigCard(0);
  const p = pointOf(target) ?? spot("runner-panel", RUNNER);
  after(400, () => {
    spark([center(r), p], 0.25, "#3ddc84");
    trashRig(target, 0.25);
  });
  after(900, () => {
    const runner = spot("runner-panel", RUNNER);
    spark([center(r), runner], 0.3, "#c792ff");
    after(300, () => (ring(runner, "violet", 100), buzz([40, 20, 40])));
  });
}

export function commercialBankers(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const vault = disc("fx-vault", at, r.width * 1.1);
  animate(vault, { rotate: [0, -180] }, { duration: 0.8, ease: "easeInOut" });
  animate(vault, { scaleX: [1, 1, 0.1] }, { duration: 1.1, times: [0, 0.7, 1] });
  done(animate(vault, { opacity: [0, 1, 1, 0] }, { duration: 1.2, times: [0, 0.1, 0.85, 1] }), vault);
  after(1000, () => (credits(at, 3, "corp"), buzz([20, 20, 40])));
}

export function cyberdex(r: DOMRect) {
  if (reduced()) return;
  const rig = spot("runner-panel", RUNNER);
  const scan = box("fx-scan green", new DOMRect(0, r.top, innerWidth, 6));
  animate(scan, { y: [0, rig[1] - r.top] }, { duration: 0.8, ease: "easeInOut" });
  done(animate(scan, { opacity: [0, 1, 1, 0] }, { duration: 0.9, times: [0, 0.1, 0.85, 1] }), scan);
  after(800, () => {
    for (const p of breakerPoints()) {
      for (let i = 0; i < 3; i++) {
        const v = disc("fx-orb", [p[0] + (Math.random() - 0.5) * 20, p[1] + (Math.random() - 0.5) * 30], 8);
        v.style.filter = "hue-rotate(-90deg)";
        done(animate(v, { scale: [1, 0], opacity: [1, 0] }, { duration: 0.5, delay: Math.random() * 0.2 }), v);
      }
    }
    flash("violet", 0.15, 0.3);
    buzz([20, 20, 20]);
  });
}

export function dataRaven(r: DOMRect) {
  if (reduced()) return;
  const runner = spot("runner-panel", RUNNER);
  const bird = chip("fx-vulture", [r.left + r.width / 2, r.top], 34, 14);
  const xs = Array.from({ length: 13 }, (_, k) => (runner[0] - r.left - r.width / 2) * (k / 12) + Math.cos(k * 0.9) * 30);
  const ys = Array.from({ length: 13 }, (_, k) => (runner[1] - r.top) * (k / 12) + Math.sin(k * 0.9) * 20);
  animate(bird, { x: xs, y: ys }, { duration: 1.2, ease: "linear" });
  done(animate(bird, { opacity: [0, 1, 1, 0] }, { duration: 1.3, times: [0, 0.1, 0.85, 1] }), bird);
  for (let i = 0; i < 6; i++) {
    const f = box("fx-feather", new DOMRect(r.left + Math.random() * r.width, r.top, 8, 18));
    done(animate(f, { y: [0, r.height], rotate: [0, 160], opacity: [0, 1, 0] }, { duration: 1.2, delay: i * 0.08 }), f);
  }
  after(1200, () => tagRunner(1));
  tokens(r, 1, "red", 1.3);
}

export function datasucker(r: DOMRect) {
  if (reduced()) return;
  const [cx] = center(r);
  for (const side of [-1, 1]) {
    const fang = box("fx-fang", new DOMRect(cx + side * r.width * 0.15 - 7, r.top - 10, 14, 26));
    done(animate(fang, { y: [-20, r.height * 0.35, r.height * 0.3], opacity: [0, 1, 1, 0] }, { duration: 0.8, times: [0, 0.3, 0.7, 1], ease: "easeIn" }), fang);
  }
  after(300, () => buzz([30, 20]));
  tokens(r, 1, "", 0.4);
  after(1000, () => {
    const ice = iceTiles()[0];
    const p = pointOf(ice);
    if (!ice || !p) return;
    spark([center(r), p], 0.35, "#3ddc84");
    after(350, () => {
      animate(ice, { scale: [1, 0.85, 0.92] }, { duration: 0.5 });
      floater([p[0], p[1] - 20], "−1", "green", 24);
      after(600, () => animate(ice, { scale: [0.92, 1] }, { duration: 0.3 }));
    });
  });
}

export function dejaVu(card: DOMRect) {
  if (reduced()) return;
  for (let i = 1; i <= 3; i++) {
    const ghost = box("fx-phantom", card);
    ghost.style.borderColor = "#c792ff";
    done(animate(ghost, { x: [0, -i * 22], y: [0, i * 10], opacity: [0, 0.7 / i, 0] }, { duration: 1, delay: i * 0.12, ease: "easeOut" }), ghost);
  }
  after(800, () => {
    const heap = heapPoint();
    for (let i = 0; i < 2; i++) {
      const c = box("fx-mini-card violet", new DOMRect(heap[0] - 11, heap[1] - 15, 22, 30));
      travel(c, heap, spot("runner-hand", RUNNER), 0.6, { delay: i * 0.15, arc: 50, spin: -360 }).finished.then(() => c.remove(), () => c.remove());
    }
    buzz([10, 30, 10]);
  });
}

export function desperado(r: DOMRect) {
  if (reduced()) return;
  const star = box("fx-star", new DOMRect(r.left + r.width / 2 - 24, r.top + r.height / 2 - 24, 48, 48));
  animate(star, { rotate: [-180, 0], scale: [0.2, 1.2, 1] }, { duration: 0.5, ease: "easeOut" });
  done(animate(star, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.1, 0.85, 1] }), star);
  const server = pointOf(document.querySelector(".server")) ?? [innerWidth / 2, innerHeight * 0.25];
  runTo(server, 0.5, 0.5);
  after(1050, () => {
    ring(server, "cyan", 70);
    const coin = disc("fx-coin-big", server, 16);
    travel(coin, server, spot("runner-credits", RUNNER), 0.6, { arc: 40, spin: 360 }).finished.then(() => coin.remove(), () => coin.remove());
    buzz([20, 30]);
  });
}

export function earthrise(r: DOMRect) {
  if (reduced()) return;
  const sun = box("fx-sun", new DOMRect(r.left - r.width * 0.2, r.top + r.height * 0.3, r.width * 1.4, r.width * 1.4));
  animate(sun, { y: [r.height * 0.5, -r.height * 0.1] }, { duration: 1, ease: "easeOut" });
  done(animate(sun, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.2, 0.75, 1] }), sun);
  tokens(r, 3, "violet", 0.3);
  after(1100, () => flyCards(spot("runner-deck", RUNNER), spot("runner-hand", RUNNER), 2));
}

export function efficiencyCommittee(card: DOMRect) {
  if (reduced()) return;
  const [cx, cy] = center(card);
  [[-0.25, -0.1, 0.5, 1], [0.22, 0.12, 0.4, -1], [-0.05, 0.3, 0.32, 1]].forEach(([dx, dy, sz, dir], i) => {
    const g = disc("fx-gear", [cx + dx * card.width, cy + dy * card.height], card.width * sz);
    animate(g, { rotate: [0, dir * 270] }, { duration: 1.4, ease: "easeInOut" });
    done(animate(g, { opacity: [0, 1, 1, 0] }, { duration: 1.5, delay: i * 0.08, times: [0, 0.15, 0.8, 1] }), g);
  });
  tokens(card, 3, "violet", 0.3);
  pips("corp-clicks", 2, "#7fb0ff", 1.2);
}

export function eli(r: DOMRect) {
  if (reduced()) return;
  for (const [i, side] of [[0, -1], [1, 1]] as const) {
    const bar = box("fx-brace", new DOMRect(r.left - 8, r.top + r.height * (0.3 + i * 0.3), r.width + 16, 10));
    animate(bar, { x: [side * innerWidth, 0] }, { duration: 0.3, delay: i * 0.25, ease: "easeIn" });
    done(animate(bar, { opacity: [1, 1, 0] }, { duration: 1.4, delay: i * 0.25, times: [0, 0.8, 1] }), bar);
    after(300 + i * 250, () => {
      shake(0.4);
      ring(center(r), "red", r.width * 1.4);
      buzz(50);
    });
  }
}

export function exchangeOfInformation(card: DOMRect) {
  if (reduced()) return;
  const corp = spot("corp-points", [innerWidth - 60, 40]);
  const runner = spot("runner-points", RUNNER);
  const a = box("fx-mini-card violet", new DOMRect(corp[0] - 11, corp[1] - 15, 22, 30));
  const b = box("fx-mini-card vr", new DOMRect(runner[0] - 11, runner[1] - 15, 22, 30));
  travel(a, corp, runner, 0.9, { delay: 0.2, arc: 80, spin: 360 });
  travel(b, runner, corp, 0.9, { delay: 0.2, arc: -80, spin: -360 });
  for (const el of [a, b]) done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: 1.3, delay: 0.1, times: [0, 0.1, 0.85, 1] }), el);
  after(1100, () => {
    ring(corp, "violet", 70);
    ring(runner, "cyan", 70);
    buzz([20, 40, 20]);
  });
}

export function femmeFatale(r: DOMRect) {
  if (reduced()) return;
  const ice = iceTiles()[0];
  const p = pointOf(ice) ?? [innerWidth / 2, innerHeight * 0.25];
  const thread = pathLine("silk", [center(r), [(center(r)[0] + p[0]) / 2, Math.min(center(r)[1], p[1]) - 40], p], 0.5);
  done(animate(thread, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.8, 1] }), thread);
  after(500, () => {
    const sight = node("fx-sig fx-reticle");
    sight.style.left = `${p[0]}px`;
    sight.style.top = `${p[1]}px`;
    sight.style.filter = "hue-rotate(-30deg) saturate(2)";
    animate(sight, { scale: [2, 0.6], rotate: [90, 0] }, { duration: 0.4, ease: "easeOut" });
    done(animate(sight, { opacity: [0, 1, 1, 0] }, { duration: 1, times: [0, 0.2, 0.8, 1] }), sight);
    if (ice) animate(ice, { filter: ["brightness(1)", "brightness(1.6) hue-rotate(-40deg)", "brightness(1)"] } as any, { duration: 0.8, delay: 0.3 });
    buzz([10, 40]);
  });
}

export function hostileTakeover(card: DOMRect) {
  if (reduced()) return;
  const at = center(card);
  const corp = spot("corp-credits", [40, 40]);
  for (let i = 0; i < 7; i++) after(i * 70, () => coins([card.left + Math.random() * card.width, at[1]], corp, 1, "gold"));
  after(300, () => buzz([20, 20, 20, 20, 20]));
  badPub(at, 0.8);
}

export function ipBlock(r: DOMRect) {
  if (reduced()) return;
  trace([r.left + r.width / 2, r.top - 10], 0.1);
  after(800, () => {
    ring(center(r), "blue", r.width * 1.3);
    tagRunner(1);
  });
  after(1200, () => (ring(center(r), "blue", r.width * 1.8), shake(0.3)));
}

export function iceWall(r: DOMRect) {
  if (reduced()) return;
  const frost = box("fx-frost", new DOMRect(r.left - 6, r.top - 6, r.width + 12, r.height + 12));
  animate(frost, { clipPath: ["inset(100% 0 0 0)", "inset(0% 0 0 0)"] } as any, { duration: 0.6, ease: "easeOut" });
  done(animate(frost, { opacity: [1, 1, 0] }, { duration: 1.5, times: [0, 0.8, 1] }), frost);
  for (let i = 0; i < 8; i++) after(150 + i * 60, () => slash([r.left + Math.random() * r.width, r.top + r.height * (1 - i / 8)], "cyan", 20, 60 + Math.random() * 60));
  tokens(r, 1, "", 0.8);
  after(1300, () => floater([r.left + r.width / 2, r.top - 10], "+1 str", "cyan", 24, true));
}

export function ichi(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const targets = [rigCard(0), rigCard(1)];
  targets.forEach((t, i) => {
    const p = pointOf(t) ?? spot("runner-panel", RUNNER);
    after(200 + i * 350, () => {
      slash(at, "red", r.width * 1.2, i ? 30 : -30);
      spark([at, p], 0.25, "#ff3b30");
      trashRig(t, 0.25);
    });
  });
  after(1000, () => trace([at[0], r.top - 10]));
  after(1600, () => {
    const runner = spot("runner-panel", RUNNER);
    ring(runner, "red", 80);
    flash("white", 0.2, 0.3);
    buzz([60, 30, 60]);
  });
}

export function insideJob(card: DOMRect) {
  if (reduced()) return;
  const ices = iceTiles();
  const server = pointOf(document.querySelector(".server")) ?? [innerWidth / 2, innerHeight * 0.25];
  const first = ices[ices.length - 1];
  const fp = pointOf(first) ?? server;
  const runner = spot("runner-panel", RUNNER);
  const dot = chip("fx-runner-dot", runner, 14, 14);
  animate(dot, { x: [0, fp[0] - runner[0], server[0] - runner[0]], y: [0, fp[1] - runner[1], server[1] - 40 - runner[1]], opacity: [0, 1, 0.3, 1, 0] }, { duration: 1.2, delay: 0.3, ease: "easeInOut" });
  after(1550, () => dot.remove());
  after(800, () => {
    if (first) animate(first, { opacity: [1, 0.25, 1], filter: ["blur(0px)", "blur(2px)", "blur(0px)"] } as any, { duration: 0.6 });
    buzz([10, 60]);
  });
}

export function jeeves(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  const gear = disc("fx-gear", at, r.width * 0.9);
  animate(gear, { rotate: [0, 360] }, { duration: 1.4, ease: "easeInOut" });
  done(animate(gear, { opacity: [0, 1, 1, 0] }, { duration: 1.5, times: [0, 0.1, 0.85, 1] }), gear);
  const clicks = spot("corp-clicks", [innerWidth - 40, 40]);
  for (let i = 0; i < 3; i++) {
    const orb = disc("fx-orb", [clicks[0] + (i - 1) * 12, clicks[1]], 10);
    orb.style.filter = "hue-rotate(160deg) saturate(3)";
    travel(orb, [clicks[0] + (i - 1) * 12, clicks[1]], at, 0.5, { delay: 0.2 + i * 0.12, arc: 30 }).finished.then(() => orb.remove(), () => orb.remove());
  }
  after(1000, () => {
    const orb = disc("fx-orb", at, 14);
    orb.style.filter = "hue-rotate(160deg) saturate(3)";
    travel(orb, at, clicks, 0.5, { arc: 50 }).finished.then(() => orb.remove(), () => orb.remove());
    pips("corp-clicks", 1, "#7fb0ff", 0.5);
    buzz([20, 40]);
  });
}

export function liberatedAccount(r: DOMRect) {
  if (reduced()) return;
  const at = center(r);
  for (const side of [-1, 1]) {
    const link = box("fx-link", new DOMRect(at[0] - 14 + side * 10, at[1] - 8, 28, 16));
    done(animate(link, { x: [0, side * 50], rotate: [0, side * 50], opacity: [1, 1, 0] }, { duration: 0.6, delay: 0.2, ease: "easeOut" }), link);
  }
  after(250, () => buzz([20, 40]));
  for (let i = 0; i < 8; i++) {
    const coin = box("fx-coin-flat", new DOMRect(r.left + r.width * 0.3, r.bottom - 10 - i * 7, r.width * 0.4, 8));
    done(animate(coin, { y: [-40, 0], opacity: [0, 1, 1, 0] }, { duration: 1.3, delay: 0.4 + i * 0.05, times: [0, 0.15, 0.8, 1], ease: "easeIn" }), coin);
  }
  after(1200, () => credits(at, 4, "runner"));
}

export function mimic(r: DOMRect) {
  if (reduced()) return;
  const sentry = iceTiles()[iceTiles().length - 1];
  const sr = sentry?.getBoundingClientRect();
  if (sr) {
    const copy = box("fx-phantom", sr);
    copy.style.borderColor = "#ff8a80";
    copy.style.background = "rgb(255 59 48 / 0.18)";
    travel(copy, center(sr), center(r), 0.6, { arc: -30 });
    animate(copy, { rotateY: [0, 180, 360], transformPerspective: 500 } as any, { duration: 0.6 });
    done(animate(copy, { opacity: [0, 0.9, 0] }, { duration: 0.8 }), copy);
  }
  after(700, () => {
    animate(document.querySelector<HTMLElement>(`.tile[data-cid="subject"]`) ?? document.body, { filter: ["brightness(1)", "brightness(1.6) hue-rotate(-20deg)", "brightness(1)"] } as any, { duration: 0.5 });
    if (sr) after(300, () => (slash(center(sr), "red", sr.width * 1.4, -35), burst(center(sr), "red", 12, 40, { size: 4, shards: true, gravity: 30 }), buzz([20, 40])));
  });
}

export function napdContract(card: DOMRect) {
  if (reduced()) return;
  const doc = tag("fx-paper", inset(card, 0.05, 0.2, 0.9, 0.55), "<i></i><i></i><i></i><i></i>");
  done(animate(doc, { opacity: [0, 1, 1, 0], y: [20, 0, 0, 0] }, { duration: 1.7, times: [0, 0.15, 0.85, 1] }), doc);
  const seal = disc("fx-seal", [card.left + card.width * 0.72, card.top + card.height * 0.65], card.width * 0.3);
  animate(seal, { scale: [3, 0.9, 1], opacity: [0, 1, 1] }, { duration: 0.35, delay: 0.6, ease: "easeIn" });
  done(animate(seal, { opacity: [0, 1, 1, 0] }, { duration: 1.2, delay: 0.6, times: [0, 0.1, 0.85, 1] }), seal);
  after(950, () => (shake(0.3), buzz(60)));
}

export function paperclip(r: DOMRect) {
  if (reduced()) return;
  const heap = heapPoint();
  const at = center(r);
  const c = box("fx-mini-card vr", new DOMRect(heap[0] - 11, heap[1] - 15, 22, 30));
  travel(c, heap, at, 0.5, { arc: 50, spin: 180 }).finished.then(() => c.remove(), () => c.remove());
  after(500, () => {
    const el = svgBox("fx-stroke silver", new DOMRect(r.left + r.width * 0.2, r.top + r.height * 0.1, r.width * 0.6, r.height * 0.8), '<path pathLength="1" d="M30 85 V20 a15 15 0 0 1 30 0 V75 a10 10 0 0 1 -20 0 V30"/>');
    draw(el, 0.5);
    animate(el, { scaleY: [1, 1.3, 1.15] }, { duration: 0.6, delay: 0.5 });
    done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.4, times: [0, 0.8, 1] }), el);
  });
  after(1200, () => (floater([at[0], r.top], "+X str", "cyan", 24, true), buzz([10, 10, 30])));
}

export function beale(card: DOMRect) {
  if (reduced()) return;
  for (let i = 0; i < 5; i++) {
    const col = box("fx-tv-bar", new DOMRect(card.left + card.width * (0.1 + i * 0.17), card.top + card.height * 0.2, card.width * 0.12, card.height * 0.6));
    animate(col, { scaleY: [0, 0.3 + i * 0.17] }, { duration: 0.5, delay: i * 0.1, ease: "easeOut" });
    done(animate(col, { opacity: [1, 1, 0] }, { duration: 1.8, times: [0, 0.8, 1] }), col);
  }
  tokens(card, 2, "violet", 0.7);
  pips("corp-points", 1, "#f6e03a", 1.4);
}

export function vitruvius(card: DOMRect) {
  if (reduced()) return;
  const el = box("fx-sig fx-vitruvius", new DOMRect(card.left - card.width * 0.15, card.top + card.height / 2 - card.width * 0.65, card.width * 1.3, card.width * 1.3));
  el.innerHTML = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" pathLength="1"/><rect x="14" y="14" width="72" height="72" pathLength="1"/></svg>';
  for (const shape of el.querySelectorAll("circle, rect")) animate(shape, { strokeDashoffset: [1, 0] }, { duration: 0.7, ease: "easeInOut" });
  animate(el, { rotate: [-20, 0] }, { duration: 0.7 });
  done(animate(el, { opacity: [0, 1, 1, 0] }, { duration: 1.6, times: [0, 0.15, 0.8, 1] }), el);
  after(900, () => flyCards(archivesPoint(), spot("corp-hand", [innerWidth * 0.7, 60]), 1, "blue"));
}

export function resistor(r: DOMRect) {
  if (reduced()) return;
  const el = svgBox("fx-stroke resist", new DOMRect(r.left - 10, r.top + r.height * 0.3, r.width + 20, r.height * 0.4), '<polyline pathLength="1" points="0,50 18,50 24,15 34,85 44,15 54,85 64,15 74,85 80,50 100,50"/>');
  draw(el, 0.45);
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.8, 1] }), el);
  const runner = spot("runner-panel", RUNNER);
  spark([runner, center(r)], 0.4, "#ff3b30", 0.4);
  after(800, () => (floater([r.left + r.width / 2, r.top], "+1 str", "orange", 24, true), buzz(20)));
  trace([r.left + r.width / 2, r.top - 10], 1);
}

export function sameOldThing(r: DOMRect) {
  if (reduced()) return;
  const el = svgBox("fx-stroke recycle", new DOMRect(r.left - 4, r.top + r.height / 2 - r.width / 2 - 4, r.width + 8, r.width + 8), '<path pathLength="1" d="M50 10 A40 40 0 1 1 15 30 M15 30 L12 12 M15 30 L32 28"/>');
  draw(el, 0.5);
  animate(el, { rotate: [0, 360] }, { duration: 1 });
  done(animate(el, { opacity: [1, 1, 0] }, { duration: 1.2, times: [0, 0.8, 1] }), el);
  after(700, () => {
    const heap = heapPoint();
    const c = box("fx-mini-card faceup", new DOMRect(heap[0] - 11, heap[1] - 15, 22, 30));
    const up: Point = [innerWidth / 2, innerHeight * 0.45];
    travel(c, heap, up, 0.5, { arc: 40 }).finished.then(() => {
      animate(c, { scale: [1, 3], opacity: [1, 0] }, { duration: 0.35 }).finished.then(() => c.remove(), () => c.remove());
      ring(up, "red", 120);
      buzz([20, 40]);
    }, () => c.remove());
  });
}

export function selfModifyingCode(r: DOMRect) {
  if (reduced()) return;
  const el = box("fx-code", r);
  const spans = Array.from({ length: 24 }, () => node("fx-code-char", el, "span"));
  let n = 0;
  const tick = setInterval(() => {
    for (const s of spans) s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    if (++n > 10) clearInterval(tick);
  }, 60);
  after(650, () => {
    animate(el, { scale: [1, 0.2], opacity: [1, 0], filter: ["brightness(1)", "brightness(3)"] } as any, { duration: 0.3 }).finished.then(() => el.remove(), () => el.remove());
    burst(center(r), "cyan", 16, 50, { size: 4, shards: true, gravity: 40 });
    const stack = spot("runner-deck", RUNNER);
    const c = box("fx-mini-card vr", new DOMRect(stack[0] - 11, stack[1] - 15, 22, 30));
    travel(c, stack, center(r), 0.6, { delay: 0.2, arc: 50, spin: 360 }).finished.then(() => (c.remove(), ring(center(r), "cyan", 70), buzz([10, 30])), () => c.remove());
  });
}

export function sneakdoor(r: DOMRect) {
  if (reduced()) return;
  const frame = box("fx-doorframe", new DOMRect(r.left + r.width * 0.2, r.top + r.height * 0.1, r.width * 0.6, r.height * 0.8));
  const door = node("fx-door", frame);
  animate(door, { rotateY: [0, -75], transformPerspective: 400 } as any, { duration: 0.5, delay: 0.1, ease: "easeOut" });
  done(animate(frame, { opacity: [0, 1, 1, 0] }, { duration: 1.2, times: [0, 0.1, 0.8, 1] }), frame);
  const runner = spot("runner-panel", RUNNER);
  const archives = archivesPoint();
  const hq = spot("corp-hand", [innerWidth * 0.7, 60]);
  const pts: Point[] = [runner, [archives[0], archives[1] + 30], archives, [(archives[0] + hq[0]) / 2, archives[1] - 30], hq];
  const line = pathLine("geo", pts, 1);
  spark(pts, 1.1, "#a5f3fc", 0.4);
  done(animate(line, { opacity: [1, 1, 0] }, { duration: 1.9, times: [0, 0.8, 1] }), line);
  after(1500, () => (ring(hq, "cyan", 90), buzz([20, 40])));
}

export function streetPeddler(r: DOMRect) {
  if (reduced()) return;
  const stack = spot("runner-deck", RUNNER);
  const cards = [0, 1, 2].map((i) => {
    const c = box("fx-mini-card", new DOMRect(stack[0] - 11, stack[1] - 15, 22, 30));
    const to: Point = [r.left + r.width / 2 + (i - 1) * 16, r.top + r.height * 0.3];
    travel(c, stack, to, 0.5, { delay: i * 0.12, arc: 40, spin: (i - 1) * 15 });
    return c;
  });
  after(1000, () => {
    const pick = cards[1];
    animate(pick, { y: [pick.getBoundingClientRect().top - (stack[1] - 15), pick.getBoundingClientRect().top - (stack[1] - 15) - 40], rotateY: [0, 180] } as any, { duration: 0.4 });
    ring([r.left + r.width / 2, r.top], "red", 50, 0.3);
    buzz([10, 30]);
  });
  after(1700, () => cards.forEach((c) => c.remove()));
}

export function tollbooth(r: DOMRect) {
  if (reduced()) return;
  const arm = box("fx-toll", new DOMRect(r.left - 10, r.top + r.height * 0.45, r.width + 20, 12));
  animate(arm, { rotate: [-80, 6, 0] }, { duration: 0.5, ease: "easeOut" });
  done(animate(arm, { opacity: [1, 1, 0] }, { duration: 1.7, times: [0, 0.85, 1] }), arm);
  after(450, () => (shake(0.4), buzz(50)));
  after(700, () => {
    const from = spot("runner-credits", RUNNER);
    for (let i = 0; i < 3; i++) {
      const coin = disc("fx-coin-big", from, 16);
      travel(coin, from, [r.left + r.width / 2, r.top + r.height * 0.45], 0.5, { delay: i * 0.12, arc: 40, spin: 360 }).finished.then(() => (coin.remove(), buzz(10)), () => coin.remove());
    }
  });
  after(1300, () => animate(arm, { rotate: [0, -80] }, { duration: 0.35, ease: "easeIn" }));
}

export function turnpike(r: DOMRect) {
  if (reduced()) return;
  const spikes = box("fx-spikes", new DOMRect(r.left - 10, r.bottom - 16, r.width + 20, 16));
  animate(spikes, { scaleY: [0, 1.2, 1] }, { duration: 0.3, ease: "easeOut" });
  done(animate(spikes, { opacity: [1, 1, 0] }, { duration: 1.6, times: [0, 0.8, 1] }), spikes);
  after(300, () => {
    const from = spot("runner-credits", RUNNER);
    const coin = disc("fx-coin-big", from, 16);
    travel(coin, from, center(r), 0.5, { arc: 40 }).finished.then(() => coin.remove(), () => coin.remove());
  });
  trace([r.left + r.width / 2, r.top - 10], 0.7);
  after(1400, () => tagRunner(1));
}

export function turntable(r: DOMRect) {
  if (reduced()) return;
  const rec = disc("fx-vinyl", center(r), r.width * 0.95);
  animate(rec, { rotate: [0, 540, 480, 720] }, { duration: 1.3, times: [0, 0.5, 0.65, 1], ease: "easeInOut" });
  done(animate(rec, { opacity: [0, 1, 1, 0] }, { duration: 1.4, times: [0, 0.1, 0.85, 1] }), rec);
  after(650, () => buzz([5, 5, 5, 5, 5, 5, 5, 5]));
  after(900, () => {
    const corp = spot("corp-points", [innerWidth - 60, 40]);
    const runner = spot("runner-points", RUNNER);
    const a = box("fx-mini-card violet", new DOMRect(corp[0] - 11, corp[1] - 15, 22, 30));
    const b = box("fx-mini-card vr", new DOMRect(runner[0] - 11, runner[1] - 15, 22, 30));
    travel(a, corp, runner, 0.7, { arc: 60, spin: 360 }).finished.then(() => a.remove(), () => a.remove());
    travel(b, runner, corp, 0.7, { arc: -60, spin: -360 }).finished.then(() => b.remove(), () => b.remove());
  });
}

export function wallOfStatic(r: DOMRect) {
  if (reduced()) return;
  const el = box("fx-static", new DOMRect(r.left - 6, r.top - 6, r.width + 12, r.height + 12));
  animate(el, { clipPath: ["inset(100% 0 0 0)", "inset(0% 0 0 0)"], backgroundPosition: ["0px 0px", "0px 80px"] } as any, { duration: 0.8, ease: "easeOut" });
  done(animate(el, { opacity: [0.95, 0.95, 0] }, { duration: 1.3, times: [0, 0.8, 1] }), el);
  after(100, () => buzz([5, 5, 5, 5, 5, 5, 5, 5, 5]));
  after(900, () => (ring(center(r), "cyan", r.width * 1.6), shake(0.4), buzz(60)));
}

export function yog(r: DOMRect) {
  if (reduced()) return;
  const gate = iceTiles().find((t) => t !== null);
  const gr = gate?.getBoundingClientRect() ?? r;
  for (let i = 0; i < 12; i++) {
    const bit = box("fx-zzz", new DOMRect(gr.left + Math.random() * gr.width, gr.top - 10, 12, 14));
    bit.textContent = i % 2 ? "0" : "1";
    bit.style.fontSize = "12px";
    done(animate(bit, { y: [0, gr.height + 10], opacity: [0, 1, 0] }, { duration: 0.8, delay: i * 0.05, ease: "linear" }), bit);
  }
  after(800, () => {
    ring(center(gr), "blue", gr.width * 1.2);
    ring(center(gr), "cyan", gr.width * 0.7, 0.12);
    if (gate) animate(gate, { scale: [1, 1.08, 1] }, { duration: 0.4 });
    buzz([10, 40]);
  });
}

export const SCORE: Record<string, (r: DOMRect) => void> = {
  "Breaking News": breakingNews,
  "Global Food Initiative": globalFood,
  "Project Vitruvius": vitruvius,
  "AstroScript Pilot Program": astroscript,
  "Project Beale": beale,
  "Offworld Office": offworldOffice,
  "Hostile Takeover": hostileTakeover,
  "NAPD Contract": napdContract,
  "Efficiency Committee": efficiencyCommittee,
  "Luminal Transubstantiation": luminal,
  "Longevity Serum": longevitySerum,
  "Tomorrow's Headline": tomorrowsHeadline,
  "Above the Law": aboveTheLaw,
  "Superconducting Hub": superconductingHub,
  "Aggressive Trendsetting": aggressiveTrendsetting,
  "Project Ingatan": projectIngatan,
  "Proprionegation": proprionegation,
  "Sericulture Expansion": sericulture,
  "Embedded Reporting": embeddedReporting,
  "Next Big Thing": nextBigThing,
  "Greenmail": greenmail,
  "Off the Books": offTheBooks,
  "Melies City Luxury Line": meliesLuxury,
  "Lotus Haze": lotusHaze,
  "Witch Hunt": witchHunt,
  "Sacrifice Zone Expansion": sacrificeZone,
};

export function scoreSignature(title: string | undefined, card: DOMRect) {
  SCORE[plain(title)]?.(card);
}

export const REZ: Record<string, (r: DOMRect) => void> = {
  "Border Control": borderControl,
  "Palisade": palisade,
  "Bran 1.0": bran,
  "Funhouse": funhouse,
  "Enigma": enigma,
  "Tollbooth": tollbooth,
  "Pop-up Window": popUpWindow,
  "Wraparound": wraparound,
  "Eli 1.0": eli,
  "Architect": architect,
  "Ice Wall": iceWall,
  "PAD Campaign": padCampaign,
  "SanSan City Grid": sansan,
  "Spin Doctor": spinDoctor,
  "Cyberdex Virus Suite": cyberdex,
  "Turnpike": turnpike,
  "Ichi 1.0": ichi,
  "Cobra": cobra,
  "Archangel": archangel,
  "Rashida Jaheem": rashida,
  "Jackson Howard": jacksonHoward,
  "Jeeves Model Bioroids": jeeves,
  "Commercial Bankers Group": commercialBankers,
  "Resistor": resistor,
  "IP Block": ipBlock,
  "Wall of Static": wallOfStatic,
  "Archer": archer,
  "Data Raven": dataRaven,
  "Vanilla": vanilla,
  "Nico Campaign": nicoCampaign,
  "Ansel 1.0": ansel,
  "Manegarm Skunkworks": manegarm,
  "Diviner": diviner,
  "Ping": ping,
  "AMAZE Amusements": amaze,
  "Clearinghouse": clearinghouse,
  "Ballista": ballista,
  "Pharos": pharos,
  "Malapert Data Vault": malapert,
  "Whitespace": whitespace,
  "Humanoid Resources": humanoidResources,
  "Otto Campaign": ottoCampaign,
  "Byte!": byte,
  "Phat Gioan Baotixita": phatGioan,
  "Idiosyncresis": idiosyncresis,
  "Public Access Plaza": publicAccessPlaza,
  "Anthill Excavation Contract": anthill,
  "Plutus": plutus,
  "Bumi 1.0": bumi,
  "Scatter Field": scatterField,
  "Empiricist": empiricist,
  "Mycoweb": mycoweb,
  "Semak-samun": semakSamun,
  "Doomscroll": doomscroll,
  "N-Pot": nPot,
  "Biawak": biawak,
  "Kessleroid": kessleroid,
  "Syailendra": syailendra,
  "Flyswatter": flyswatter,
  "Lamplighter": lamplighter,
  "Mercia B4LL4RD": mercia,
  "Mitra Aman": mitraAman,
  "Mahkota Langit Grid": mahkotaLangit,
  "Synchrocyclotron": synchrocyclotron,
  "Ansel 2.0": ansel2,
  "Reverb": reverb,
  "Sleipnir": sleipnir,
  "Vertigo": vertigo,
  "Perfect Recall": perfectRecall,
  "Esca": esca,
  "ezaM": ezam,
  "Knowledge Seeker": knowledgeSeeker,
  "Lionsmane": lionsmane,
  "Vicsek": vicsek,
  "The Red Room": redRoom,
  "Magistrate Revontulet": magistrate,
  "Nihilo Agent": nihilo,
  "Grubber": grubber,
  "Lethe": lethe,
  "Paywall": paywall,
  "Hype Machine": hypeMachine,
  "Luana Campos": luanaCampos,
  "Event Horizon": eventHorizon,
  "Flywheel": flywheel,
  "Tocsin": tocsin,
  "Flagship": flagship,
  "Shackleton Grid": shackleton,
};

export function rezSignature(title: string | undefined, r: DOMRect) {
  REZ[plain(title)]?.(r);
}

export const FIRE = ["Karuna", "Urtica Cipher", "Tithe", "Anoetic Void"];

export function fireSignature(title: string | undefined, ice: DOMRect | null, runner: Point) {
  const t = plain(title);
  if (t === "Karuna") karuna(runner);
  else if (t === "Urtica Cipher") urtica(runner);
  else if (t === "Tithe" && ice) tithe(center(ice));
  else if (t === "Anoetic Void" && ice) anoeticVoid(ice);
}

export const INSTALL: Record<string, (r: DOMRect) => void> = {
  "Mayfly": mayfly,
  "Botulus": botulus,
  "Carmen": carmen,
  "Docklands Pass": docklandsPass,
  "Daily Casts": dailyCasts,
  "Femme Fatale": femmeFatale,
  "Plascrete Carapace": plascrete,
  "Parasite": parasite,
  "Earthrise Hotel": earthrise,
  "Datasucker": datasucker,
  "Black Orchestra": blackOrchestra,
  "MKUltra": mkultra,
  "D4v1d": david,
  "Hippo": hippo,
  "Clone Chip": cloneChip,
  "R&D Interface": rdInterface,
  "Desperado": desperado,
  "Stargate": stargate,
  "Corroder": corroder,
  "Paperclip": paperclip,
  "Liberated Account": liberatedAccount,
  "Self-modifying Code": selfModifyingCode,
  "Mimic": mimic,
  "Street Peddler": streetPeddler,
  "Yog.0": yog,
  "The Turning Wheel": turningWheel,
  "Aumakua": aumakua,
  "Clot": clot,
  "Imp": imp,
  "Same Old Thing": sameOldThing,
  "Astrolabe": astrolabe,
  "Atman": atman,
  "Fermenter": fermenter,
  "Faerie": faerie,
  "Sneakdoor Beta": sneakdoor,
  "Turntable": turntable,
  "Ice Carver": iceCarver,
  "Carnivore": carnivore,
  "Buzzsaw": buzzsaw,
  "Cookbook": cookbook,
  "Pennyshaver": pennyshaver,
  "Marjanah": marjanah,
  "Tranquilizer": tranquilizer,
  "Red Team": redTeam,
  "DZMZ Optimizer": dzmz,
  "Pantograph": pantograph,
  "Conduit": conduit,
  "Echelon": echelon,
  "Unity": unity,
  "Telework Contract": teleworkContract,
  "T400 Memory Diamond": t400,
  "Smartware Distributor": smartware,
  "Verbal Plasticity": verbalPlasticity,
  "Bling": bling,
  "Gourmand": gourmand,
  "Hantu": hantu,
  "Rising Tide": risingTide,
  "Cacophony": cacophony,
  "Rent Rioters": rentRioters,
  "Detente": detente,
  "Maglectric Rapid (748 Mod)": maglectric,
  "Sang Kancil": sangKancil,
  "Fransofia Ward": fransofia,
  "Open Market": openMarket,
  "GAMEDRAGON™ Pro": gamedragon,
  "Madani": madani,
  "Azimat": azimat,
  "Chromatophores": chromatophores,
  "Devadatta Drone": devadatta,
  "Principia": principia,
  "\"Knickknack\" O'Brian": knickknack,
  "Side Hustle": sideHustle,
  "The Tungsten Tailor": tungstenTailor,
  "Corsair": corsair,
  "Lampades": lampades,
  "Hackerspace": hackerspace,
  "Nurse Hanh": nurseHanh,
  "Stick and Poke": stickAndPoke,
  "Borrowed Goods": borrowedGoods,
  "Rotary": rotary,
  "Baker": baker,
  "Underdome Irregulars": underdome,
  "Methuselah": methuselah,
  "Touchstone": touchstone,
  "Read-Write Share": readWriteShare,
  "Sipa": sipa,
  "Stowaway": stowaway,
  "Word on the Street": wordOnTheStreet,
};

export function installSignature(title: string | undefined, r: DOMRect) {
  INSTALL[plain(title)]?.(r);
}

export const PLAY: Record<string, (r: DOMRect) => void> = {
  "Hedge Fund": hedgeFund,
  "Sure Gamble": sureGamble,
  "Creative Commission": creativeCommission,
  "Neurospike": neurospike,
  "Public Trail": publicTrail,
  "Jailbreak": jailbreak,
  "Overclock": overclock,
  "Seamless Launch": seamlessLaunch,
  "Retribution": retribution,
  "Dirty Laundry": dirtyLaundry,
  "Stimhack": stimhack,
  "Hard-Hitting News": hardHittingNews,
  "Biotic Labor": bioticLabor,
  "Account Siphon": accountSiphon,
  "IPO": ipo,
  "Closed Accounts": closedAccounts,
  "Diesel": diesel,
  "Inside Job": insideJob,
  "I've Had Worse": iveHadWorse,
  "Legwork": legwork,
  "Sweeps Week": sweepsWeek,
  "Levy AR Lab Access": levy,
  "Special Order": specialOrder,
  "Archived Memories": archivedMemories,
  "Psychographics": psychographics,
  "Rebirth": rebirth,
  "Pinhole Threading": pinhole,
  "Inject": inject,
  "Exchange of Information": exchangeOfInformation,
  "Emergency Shutdown": emergencyShutdown,
  "Deja Vu": dejaVu,
  "Scorched Earth": scorchedEarth,
  "Mad Dash": madDash,
  "Violet Level Clearance": violetClearance,
  "Wildcat Strike": wildcatStrike,
  "Mutual Favor": mutualFavor,
  "Tread Lightly": treadLightly,
  "VRcation": vrcation,
  "Sprint": sprint,
  "Hansei Review": hanseiReview,
  "Predictive Planogram": predictivePlanogram,
  "Government Subsidy": governmentSubsidy,
  "Charm Offensive": charmOffensive,
  "Scrounge": scrounge,
  "Shred": shred,
  "Clean Getaway": cleanGetaway,
  "Lie Low": lieLow,
  "Maintenance Access": maintenanceAccess,
  "Transfer of Wealth": transferOfWealth,
  "Illumination": illumination,
  "Ritual": ritual,
  "Nanomanagement": nanomanagement,
  "Top-Down Solutions": topDownSolutions,
  "Peer Review": peerReview,
  "Bigger Picture": biggerPicture,
  "IP Enforcement": ipEnforcement,
  "Touch-ups": touchUps,
  "Key Performance Indicators": kpi,
  "Measured Response": measuredResponse,
  "Petty Cash": pettyCash,
  "Chain Reaction": chainReaction,
  "Take a Dive": takeADive,
  "Kompromat": kompromat,
  "Sell Out": sellOut,
  "Tailgate": tailgate,
  "Aircheck": aircheck,
  "Beta Build": betaBuild,
  "Caveat Emptor": caveatEmptor,
  "realloc()": realloc,
  "Retirement Plan": retirementPlan,
  "Cultivate": cultivate,
  "Unleash": unleash,
  "Flood the Market": floodTheMarket,
  "Scapegoat": scapegoat,
  "Myoshu": myoshu,
  "Reanimation Protocol": reanimationProtocol,
  "Vulture Fund": vultureFund,
};

export function signature(title: string | undefined, card: DOMRect) {
  PLAY[plain(title)]?.(card);
}
