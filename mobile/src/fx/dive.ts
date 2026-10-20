type Streak = { side: number; u: number; z: number; speed: number; yellow: boolean };

const CYAN = "34,211,238";
const YELLOW = "246,224,58";

export function dive(canvas: HTMLCanvasElement, still = false) {
  const pen = canvas.getContext("2d");
  if (!pen) return () => {};
  const spawn = (z = Math.random()): Streak => ({ side: Math.floor(Math.random() * 4), u: Math.random() * 2 - 1, z, speed: 0.5 + Math.random() * 1.3, yellow: Math.random() < 0.18 });
  const streaks = Array.from({ length: 56 }, () => spawn());
  const RINGS = 14;
  let raf = 0;
  let last = 0;
  let phase = 0;
  const start = performance.now();

  const fit = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
  };

  const frame = (now: number) => {
    raf = still ? 0 : requestAnimationFrame(frame);
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    const t = (now - start) / 1000;
    if (canvas.width !== Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2))) fit();
    const w = canvas.width;
    const h = canvas.height;
    const speed = 0.35 + Math.min(t, 1.8) ** 2 * 0.55;
    phase += dt * speed;
    pen.fillStyle = "rgba(6,7,8,0.42)";
    pen.fillRect(0, 0, w, h);
    const S = Math.hypot(w, h) * 0.5;
    const proj = (z: number) => S * (0.07 / (0.07 + Math.max(z, 0)));
    const point = (side: number, u: number, size: number): [number, number] => (side === 0 ? [u * size, -size] : side === 1 ? [size, u * size] : side === 2 ? [u * size, size] : [-size, u * size]);

    pen.save();
    pen.translate(w / 2, h / 2);
    pen.rotate(t * 0.18 + Math.sin(t * 0.9) * 0.06);
    pen.lineCap = "round";

    const far = proj(1);
    const near = proj(0);
    pen.lineWidth = Math.max(1, w / 500);
    for (let side = 0; side < 4; side++) {
      for (let k = -4; k <= 4; k++) {
        const u = k / 4;
        const [x0, y0] = point(side, u, far);
        const [x1, y1] = point(side, u, near);
        const grad = pen.createLinearGradient(x0, y0, x1, y1);
        grad.addColorStop(0, `rgba(${CYAN},0)`);
        grad.addColorStop(1, `rgba(${CYAN},0.22)`);
        pen.strokeStyle = grad;
        pen.beginPath();
        pen.moveTo(x0, y0);
        pen.lineTo(x1, y1);
        pen.stroke();
      }
    }

    for (let k = 0; k < RINGS; k++) {
      const z = (((k - phase * RINGS * 0.5) % RINGS) + RINGS) % RINGS / RINGS;
      const size = proj(z);
      const alpha = (1 - z) ** 1.6 * 0.75;
      pen.lineWidth = Math.max(1, (w / 260) * (1 - z) ** 2);
      pen.strokeStyle = `rgba(${CYAN},${alpha})`;
      pen.strokeRect(-size, -size, size * 2, size * 2);
    }

    for (const s of streaks) {
      s.z -= dt * speed * s.speed * 0.8;
      if (s.z < -0.02) Object.assign(s, spawn(1));
      const head = proj(s.z);
      const tail = proj(s.z + 0.05 + speed * 0.04);
      const [x0, y0] = point(s.side, s.u, tail);
      const [x1, y1] = point(s.side, s.u, head);
      const color = s.yellow ? YELLOW : CYAN;
      const alpha = Math.min(1, (1 - s.z) * 1.4);
      const grad = pen.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, `rgba(${color},0)`);
      grad.addColorStop(1, `rgba(${color},${alpha})`);
      pen.strokeStyle = grad;
      pen.lineWidth = Math.max(1, (w / 320) * (1 - s.z) ** 1.5);
      pen.beginPath();
      pen.moveTo(x0, y0);
      pen.lineTo(x1, y1);
      pen.stroke();
    }

    const pulse = 0.55 + 0.45 * Math.sin(t * 6);
    const glow = pen.createRadialGradient(0, 0, 0, 0, 0, far * 2.4);
    glow.addColorStop(0, `rgba(255,255,255,${0.5 + 0.3 * pulse})`);
    glow.addColorStop(0.25, `rgba(${YELLOW},${0.25 + 0.15 * pulse})`);
    glow.addColorStop(1, `rgba(${CYAN},0)`);
    pen.fillStyle = glow;
    pen.fillRect(-far * 2.4, -far * 2.4, far * 4.8, far * 4.8);
    pen.restore();
  };

  fit();
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
