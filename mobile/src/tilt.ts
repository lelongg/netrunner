import { useEffect } from "preact/hooks";
import { motionOff } from "./settings";

let granted = false;

const RANGE = 0.32;
const BASE_SECONDS = 4;
const FOLLOW_SECONDS = 0.08;

type Vec = [number, number, number];

function gravity(e: DeviceOrientationEvent): Vec | null {
  if (e.beta == null || e.gamma == null) return null;
  const b = (e.beta * Math.PI) / 180;
  const g = (e.gamma * Math.PI) / 180;
  return [Math.cos(b) * Math.sin(g), Math.sin(b), Math.cos(b) * Math.cos(g)];
}

function screenAngle() {
  const a = screen.orientation?.angle ?? (window as any).orientation ?? 0;
  return (Number(a) * Math.PI) / 180;
}

export function useTilt(target: { current: HTMLElement | null }) {
  useEffect(() => {
    if (typeof DeviceOrientationEvent === "undefined" || motionOff()) return;
    let base: Vec | null = null;
    let want: [number, number] = [0, 0];
    let cur: [number, number] = [0, 0];
    let last = 0;
    let seen = 0;
    let raf = 0;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const frame = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
      last = now;
      const k = 1 - Math.exp(-dt / FOLLOW_SECONDS);
      cur = [cur[0] + (want[0] - cur[0]) * k, cur[1] + (want[1] - cur[1]) * k];
      target.current?.style.setProperty("--tx", cur[0].toFixed(3));
      target.current?.style.setProperty("--ty", cur[1].toFixed(3));
      const settled = Math.abs(want[0] - cur[0]) < 0.002 && Math.abs(want[1] - cur[1]) < 0.002;
      raf = settled ? 0 : requestAnimationFrame(frame);
      if (settled) last = 0;
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      const v = gravity(e);
      if (!v) return;
      const now = performance.now();
      const dt = seen ? Math.min(1, (now - seen) / 1000) : 0;
      seen = now;
      if (!base) base = v;
      else {
        const k = 1 - Math.exp(-dt / BASE_SECONDS);
        base = [base[0] + (v[0] - base[0]) * k, base[1] + (v[1] - base[1]) * k, base[2] + (v[2] - base[2]) * k];
      }
      const wx = base[1] * v[2] - base[2] * v[1];
      const wy = base[2] * v[0] - base[0] * v[2];
      const wz = base[0] * v[1] - base[1] * v[0];
      const dx = wy - wz;
      const dy = -wx;
      const a = screenAngle();
      const x = dx * Math.cos(a) + dy * Math.sin(a);
      const y = dy * Math.cos(a) - dx * Math.sin(a);
      want = [clamp(x / RANGE), clamp(y / RANGE)];
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const ask = (DeviceOrientationEvent as any).requestPermission as undefined | (() => Promise<string>);
    const start = () => addEventListener("deviceorientation", onTilt);
    const unlock = () =>
      ask?.().then(
        (r) => {
          if (r !== "granted") return;
          granted = true;
          start();
        },
        () => {},
      );
    if (ask && !granted) addEventListener("pointerdown", unlock, { once: true });
    else start();
    return () => {
      removeEventListener("deviceorientation", onTilt);
      removeEventListener("pointerdown", unlock);
      cancelAnimationFrame(raf);
    };
  }, []);
}
