import { type Point, anchor, animate, burst, buzz, coins, done, flash, node, pointOf, reduced, shake, vignette } from "./core";

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

export function signature(title: string | undefined, card: DOMRect) {
  if (title === "Hedge Fund") hedgeFund(card);
  else if (title === "Sure Gamble") sureGamble(card);
  else if (title === "Creative Commission") creativeCommission(card);
  else if (title === "Neurospike") neurospike();
  else if (title === "Public Trail") publicTrail(card);
  else if (title === "Jailbreak") jailbreak(card);
  else if (title === "Overclock") overclock(card);
  else if (title === "Seamless Launch") seamlessLaunch(card);
}
